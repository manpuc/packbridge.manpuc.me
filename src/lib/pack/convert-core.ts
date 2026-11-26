import { unzipSync, zipSync, strToU8, strFromU8, type Zippable } from 'fflate';
import type { PackReport, ConversionOptions } from './types';
import { getTargetContext, loadMappings } from './rules';
import { extractFsb5 } from './fsb';
import {
  formatLocaleCode,
  parseLangEntries,
  parseJsonLangEntries,
  mapLangEntries,
  serializeLangEntries,
  serializeJsonLangEntries,
} from './processors/lang';
import { javaToBedrockSounds, bedrockToJavaSounds, migrateJavaSounds, parseJsonc } from './processors/sounds';
import {
  generateTerrainTexture,
  getBedrockLeafSpec,
  synthesizeBedrockLeafTextures,
  isBedrockOpaqueLeafPath,
  isBedrockCarriedLeafPath,
} from './processors/blocks';
import {
  generateItemTexture,
  DIAL_ITEM_SPECS,
  classifyJavaDialPath,
  classifyBedrockDialPath,
  stitchDialAtlas,
  sliceDialAtlas,
  type DialItemKind,
} from './processors/items';
import {
  parseJavaAnimation,
  generateJavaAnimation,
  expandBedrockFlipbookEntry,
  type FlipbookEntry,
} from './processors/animation';
import { JAVA_VERSIONS, BEDROCK_VERSIONS, extractPackFormat, extractMinPackFormat } from './versions';
import { normalizeLegacyPath, downgradeLegacyPath, migrateJavaPath } from './legacy';
import { generateUUID, generateManifestContent, generateMcmetaContent } from './metadata';
import {
  processGuiSpriteSheet,
  WIDGETS_MAPPINGS,
  HOTBAR_SLICE_MAPPINGS,
  compareBedrockVersion,
  composeGuiSpriteSheet,
  getLegacyIconsToBedrockMappings,
  getModernJavaToBedrockGuiPath,
  getBedrockToModernJavaGuiPath,
  getJavaSheetToModernSprites,
  getJavaModernSpriteSheetTarget,
  getBedrockGuiSheetTarget,
  migrateJavaGuiContainerPath,
  type BedrockSemver,
  type CropBox
} from './processors/gui';
import { convertTgaToPng, getPngDimensions, normalizeJavaBlockAtlasPng } from './processors/tga';
import { reencodeAudio, resetAudioReencodeSession } from './processors/audio';
import {
  javaToBedrockGeometryDetailed,
  bedrockToJavaModels,
  extractBedrockGeometriesFromJson,
  isBedrockModelPath,
  isJavaModelPath,
  isJavaCemPartPath,
  type ExtractedBedrockGeometry
} from './processors/models';
import {
  compositeSnowyGrassSide,
  compositeJavaGrassSideToBedrockTga,
  splitBedrockGrassSideForJava,
} from './processors/grass';
import {
  classifyBedrockPbrPath,
  classifyJavaLabPbrPath,
  convertBedrockMerToLabPbrSpec,
  convertBedrockNormalToLabPbr,
  convertBedrockHeightmapToLabPbr,
  convertLabPbrSpecToBedrockMer,
  convertLabPbrNormalToBedrock,
  synthesizeUniformLabPbrSpec,
  synthesizeUniformColorPng,
  parseTextureSetJson,
  generateBedrockTextureSetJson,
  decodePngToRgbaSync,
  type ParsedTextureSet
} from './processors/pbr';
import {
  isPanoramaPath,
  isJavaOverworldSkyPath,
  getBedrockCubemapIndex,
  migrateJavaSkyPath,
  migrateJavaSkyProperties,
  convertJavaSkyToBedrockCubemap,
  composeBedrockCubemapToOptiFineSky,
} from './processors/sky';
import {
  EFFECT_BG_MODERN_MCMETA,
  cropInset1pxIfLegacySlotSprite,
  isJavaContainerSheetPath,
  isSharedBedrockThemeContainer,
  isBedrockContainerThemeOrPartPath,
  getJavaSlotItemToBedrockUiPath,
  getModernJavaContainerToBedrockPath,
  getBedrockContainerToModernJavaPaths,
  migrateJavaContainerSlotPath,
  sliceJavaContainerSheetForModernJava,
  getJavaContainerModernSpriteTarget,
  extractBedrockContainerAssetsFromJava,
  synthesizeJavaContainersFromBedrock,
} from './processors/container-gui';
import { isSafePath, createZipSafetyFilter, type ZipSafetyTracker } from './security';

const MEDIA_EXTENSIONS = new Set(['.png', '.tga', '.ogg', '.wav', '.mp3', '.fsb', '.jpg', '.jpeg', '.webp']);

function getFileCompressionLevel(path: string): 0 | 1 {
  const dotIdx = path.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = path.slice(dotIdx).toLowerCase();
    if (MEDIA_EXTENSIONS.has(ext)) {
      return 0; // STORE
    }
  }
  return 1; // DEFLATE Level 1
}

export async function convertBuffer(
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: ConversionOptions,
  onProgress?: (processedCount: number, totalFiles: number) => void
): Promise<{ buffer: Uint8Array; report: PackReport }> {
  const { direction } = options;
  if (options.enableAudioReencode) {
    resetAudioReencodeSession();
  }

  // Load mappings
  await loadMappings(options.javaVersionId, options.bedrockVersionId);

  const tracker: ZipSafetyTracker = { totalUncompressedBytes: 0, fileCount: 0 };
  let sourceFiles: Record<string, Uint8Array>;
  try {
    sourceFiles = unzipSync(new Uint8Array(fileBuffer), {
      filter: createZipSafetyFilter(tracker)
    });
  } catch (err) {
    if (err instanceof Error && (err as { isZipSafetyError?: boolean }).isZipSafetyError) {
      throw err;
    }
    throw new Error(`Invalid or corrupted ZIP archive: ${err instanceof Error ? err.message : String(err)}`);
  }
  const targetFiles: Zippable = Object.create(null);

  const report: PackReport = {
    totalFiles: 0,
    convertedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    details: [],
  };

  // Filter out directories from file count so totalFiles accurately reflects actual files
  const filePaths = Object.keys(sourceFiles).filter(p => !p.endsWith('/'));
  report.totalFiles = filePaths.length;

  let packName = (fileName || "pack").replace(/\.(zip|mcpack)$/i, '');
  let packDescription: unknown = "Converted by PackBridge";
  let headerUuid = generateUUID();
  let moduleUuid = generateUUID();

  const convertedBlockTextures = new Set<string>();
  const convertedItemTextures = new Set<string>();
  const allTargetTextures = new Set<string>();
  const supportedLanguages = new Set<string>();
  const mergedLangs = new Map<string, Map<string, string>>();
  const pendingBedrockFlipbooks: Array<{ sourcePath: string; entry: FlipbookEntry }> = [];
  const extraItemTextureEntries: Record<string, string> = Object.create(null);

  // Pre-scan for metadata & pack root (prefer shallowest pack.mcmeta or manifest.json, or root folder containing assets/textures)
  let packRoot = "";
  let bestRootDepth = Infinity;
  let detectedSourcePackFormat: number | null = null;
  let detectedSourceMinPackFormat: number | null = null;
  let detectedSourceBedrockMinEngine: BedrockSemver | null = null;

  // 1. First look for pack.mcmeta or manifest.json
  for (const path of filePaths) {
    if (path.includes('__MACOSX') || path.split('/').pop()?.startsWith('.')) continue;

    const isMcmeta = path === 'pack.mcmeta' || path.endsWith('/pack.mcmeta');
    const isManifest = path === 'manifest.json' || path.endsWith('/manifest.json');
    if (isMcmeta || isManifest) {
      const parts = path.split('/');
      parts.pop();
      const depth = parts.length;
      if (depth >= bestRootDepth) continue;
      bestRootDepth = depth;
      packRoot = parts.join('/') + (parts.length > 0 ? '/' : '');

      try {
        const text = strFromU8(sourceFiles[path]);
        const data = JSON.parse(text);
        if (isManifest) {
          if (data.header?.name) packName = String(data.header.name);
          if (data.header?.description !== undefined) packDescription = data.header.description;
          if (typeof data.header?.uuid === 'string') headerUuid = data.header.uuid;
          if (typeof data.modules?.[0]?.uuid === 'string') moduleUuid = data.modules[0].uuid;
          if (Array.isArray(data.header?.min_engine_version) && data.header.min_engine_version.length >= 3) {
            detectedSourceBedrockMinEngine = [
              Number(data.header.min_engine_version[0]) || 1,
              Number(data.header.min_engine_version[1]) || 0,
              Number(data.header.min_engine_version[2]) || 0,
            ];
          }
        } else if (isMcmeta) {
          if (data.pack?.description !== undefined) packDescription = data.pack.description;
          const rawFormat = extractPackFormat(data.pack);
          if (rawFormat !== null) {
            detectedSourcePackFormat = rawFormat;
          }
          const minFmt = extractMinPackFormat(data.pack);
          if (minFmt !== null) {
            detectedSourceMinPackFormat = minFmt;
          }
        }
      } catch { }
    }
  }

  // 2. Fallback: if no pack.mcmeta/manifest.json found at top level, check for nested assets/ or textures/ directories
  if (bestRootDepth === Infinity) {
    for (const path of filePaths) {
      if (path.includes('__MACOSX') || path.split('/').pop()?.startsWith('.')) continue;
      const lower = path.toLowerCase();
      const assetsIdx = lower.indexOf('assets/');
      const texturesIdx = lower.indexOf('textures/');
      const targetIdx = assetsIdx !== -1 ? assetsIdx : texturesIdx;
      if (targetIdx !== -1) {
        const prefix = path.substring(0, targetIdx);
        const depth = prefix.split('/').filter(Boolean).length;
        if (depth > 0 && depth < bestRootDepth) {
          bestRootDepth = depth;
          packRoot = prefix;
        }
      }
    }
  }

  // Determine target and source pack formats for Java migrations
  const targetJavaVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
  const targetBedrockVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
  const sourceJavaVersion = options.sourceJavaVersionId
    ? JAVA_VERSIONS.find(v => v.id === options.sourceJavaVersionId)
    : (detectedSourcePackFormat !== null ? JAVA_VERSIONS.find(v => v.packFormat === detectedSourcePackFormat) : null);
  const sourcePackFormat = sourceJavaVersion?.packFormat ?? detectedSourcePackFormat ?? targetJavaVersion.packFormat;
  const sourceBedrockVersion = options.sourceBedrockVersionId
    ? BEDROCK_VERSIONS.find(v => v.id === options.sourceBedrockVersionId)
    : null;
  const sourceBedrockMinEngine: BedrockSemver =
    detectedSourceBedrockMinEngine ?? sourceBedrockVersion?.minEngineVersion ?? targetBedrockVersion.minEngineVersion;

  const hasModernSpritesInSource =
    direction === 'java-to-java' &&
    filePaths.some((p) => p.startsWith(packRoot) && p.substring(packRoot.length).startsWith('assets/minecraft/textures/gui/sprites/'));
  const shouldSplitLegacyJavaGui =
    direction === 'java-to-java' &&
    targetJavaVersion.packFormat >= 18 &&
    (sourcePackFormat < 18 || (!hasModernSpritesInSource && (detectedSourceMinPackFormat ?? sourcePackFormat) < 18));
  const effectiveSourceJavaFormat = Math.min(sourcePackFormat, detectedSourceMinPackFormat ?? sourcePackFormat);
  const shouldComposeLegacyJavaGui =
    direction === 'java-to-java' &&
    targetJavaVersion.packFormat < 18 &&
    (sourcePackFormat >= 18 || hasModernSpritesInSource);

  const formatTargetJavaPath = (jPath: string): string => {
    const formatted = targetJavaVersion.packFormat <= 3
      ? downgradeLegacyPath(jPath, targetJavaVersion.packFormat)
      : normalizeLegacyPath(jPath, targetJavaVersion.packFormat);
    if (targetJavaVersion.packFormat >= 4 && formatted.startsWith('assets/')) {
      return formatted.toLowerCase();
    }
    return formatted;
  };

  const isValidJavaAssetPath = (jPath: string): boolean => {
    if (targetJavaVersion.packFormat >= 4 && jPath.startsWith('assets/')) {
      return /^assets\/[a-z0-9_.-]+\/[a-z0-9/._-]+$/.test(jPath);
    }
    return true;
  };

  // Pre-scan Bedrock subpacks (`subpacks/<folder>/...`) so the richest subpack is merged into the main pack
  let activeSubpackFolder: string | null = null;
  const subpackCounts = new Map<string, number>();

  for (const p of filePaths) {
    if (!p.startsWith(packRoot)) continue;
    const rel = p.substring(packRoot.length);
    const spMatch = rel.match(/^subpacks\/([^/]+)\/(.+)$/);
    if (spMatch) {
      subpackCounts.set(spMatch[1], (subpackCounts.get(spMatch[1]) || 0) + 1);
    }
  }

  if (subpackCounts.size > 0) {
    let maxFiles = -1;
    for (const [folder, count] of subpackCounts.entries()) {
      if (count > maxFiles) {
        maxFiles = count;
        activeSubpackFolder = folder;
      }
    }
  }

  const activeSubpackPaths = new Set<string>();
  if (activeSubpackFolder) {
    const spPrefix = `subpacks/${activeSubpackFolder}/`;
    for (const p of filePaths) {
      if (!p.startsWith(packRoot)) continue;
      const rel = p.substring(packRoot.length);
      if (rel.startsWith(spPrefix)) {
        activeSubpackPaths.add(rel.substring(spPrefix.length));
      }
    }
  }

  const bedrockPbrSets = new Map<string, {
    baseName: string;
    dir: string;
    hasMer: boolean;
    hasSubsurface: boolean;
    hasNormal: boolean;
    hasHeightmap: boolean;
  }>();
  interface PendingBedrockPbrGroup {
    baseBedrockTexturePath: string;
    textureSetSourcePath?: string;
    parsedTs?: ParsedTextureSet;
    colorAliasFile?: { sourcePath: string; relPath: string; bytes: Uint8Array };
    colorUniform?: [number, number, number, number];
    merFile?: { sourcePath: string; bytes: Uint8Array; isTga: boolean; priority: number; hasSubsurface: boolean };
    merUniform?: { values: [number, number, number, number]; hasSubsurface: boolean };
    normalFile?: { sourcePath: string; bytes: Uint8Array; isTga: boolean; priority: number };
    heightmapFile?: { sourcePath: string; bytes: Uint8Array; isTga: boolean; priority: number };
  }
  const pendingBedrockPbrGroups = new Map<string, PendingBedrockPbrGroup>();
  const claimedBedrockPbrFiles = new Set<string>();
  const claimedBedrockColorAliases = new Set<string>();

  if (direction === 'bedrock-to-java') {
    const bedrockActiveFiles = new Map<string, { sourcePath: string; relPath: string; bytes: Uint8Array }>();
    for (const p of filePaths) {
      if (!isSafePath(p) || p.includes('__MACOSX') || p.split('/').pop()?.startsWith('.') || !p.startsWith(packRoot)) continue;
      let rel = p.substring(packRoot.length);
      const spMatch = rel.match(/^subpacks\/([^/]+)\/(.+)$/);
      if (spMatch) {
        if (spMatch[1] !== activeSubpackFolder) continue;
        rel = spMatch[2];
      } else if (activeSubpackPaths.has(rel)) {
        continue;
      }
      bedrockActiveFiles.set(rel.toLowerCase(), { sourcePath: p, relPath: rel, bytes: sourceFiles[p] });
    }

    const resolveBedrockTextureRef = (tsDir: string, ref: string) => {
      const clean = ref.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\.(png|tga)$/i, '');
      if (!clean) return null;
      const candidate = clean.startsWith('textures/') ? clean : `${tsDir}${clean}`;
      if (!isSafePath(`${candidate}.png`)) return null;
      const lowerCand = candidate.toLowerCase();
      const pngHit = bedrockActiveFiles.get(`${lowerCand}.png`);
      if (pngHit) return { ...pngHit, isTga: false };
      const tgaHit = bedrockActiveFiles.get(`${lowerCand}.tga`);
      if (tgaHit) return { ...tgaHit, isTga: true };
      return null;
    };

    for (const [lowerRel, entry] of bedrockActiveFiles.entries()) {
      if (!/\.texture_set\.json(?:\.json)?$/i.test(lowerRel)) continue;
      const baseBedrockTexturePath = entry.relPath.replace(/\.texture_set\.json(?:\.json)?$/i, '.png');
      const groupKey = baseBedrockTexturePath.toLowerCase();
      const lastSlash = entry.relPath.lastIndexOf('/');
      const tsDir = lastSlash !== -1 ? entry.relPath.slice(0, lastSlash + 1) : '';
      const parsedTs = parseTextureSetJson(strFromU8(entry.bytes));
      const group: PendingBedrockPbrGroup = pendingBedrockPbrGroups.get(groupKey) || { baseBedrockTexturePath };
      group.textureSetSourcePath = entry.sourcePath;
      if (parsedTs) {
        group.parsedTs = parsedTs;
        if (parsedTs.color) {
          const baseStem = baseBedrockTexturePath.replace(/\.png$/i, '').toLowerCase();
          const hasDirectColor = bedrockActiveFiles.has(`${baseStem}.png`) || bedrockActiveFiles.has(`${baseStem}.tga`);
          const colorHit = resolveBedrockTextureRef(tsDir, parsedTs.color);
          if (colorHit && !hasDirectColor && colorHit.relPath.replace(/\.(png|tga)$/i, '').toLowerCase() !== baseStem) {
            group.colorAliasFile = { sourcePath: colorHit.sourcePath, relPath: colorHit.relPath, bytes: colorHit.bytes };
            claimedBedrockColorAliases.add(colorHit.relPath.toLowerCase());
          }
        } else if (parsedTs.colorUniform) {
          group.colorUniform = parsedTs.colorUniform;
        }

        if (parsedTs.mer) {
          const merHit = resolveBedrockTextureRef(tsDir, parsedTs.mer);
          if (merHit) {
            group.merFile = {
              sourcePath: merHit.sourcePath,
              bytes: merHit.bytes,
              isTga: merHit.isTga,
              priority: 2,
              hasSubsurface: Boolean(parsedTs.hasSubsurface)
            };
            claimedBedrockPbrFiles.add(merHit.relPath.toLowerCase());
          }
        } else if (parsedTs.merUniform) {
          group.merUniform = { values: parsedTs.merUniform, hasSubsurface: Boolean(parsedTs.hasSubsurface) };
        }

        if (parsedTs.normal) {
          const normHit = resolveBedrockTextureRef(tsDir, parsedTs.normal);
          if (normHit) {
            group.normalFile = { sourcePath: normHit.sourcePath, bytes: normHit.bytes, isTga: normHit.isTga, priority: 2 };
            claimedBedrockPbrFiles.add(normHit.relPath.toLowerCase());
          }
        }
        if (parsedTs.heightmap) {
          const hHit = resolveBedrockTextureRef(tsDir, parsedTs.heightmap);
          if (hHit) {
            group.heightmapFile = { sourcePath: hHit.sourcePath, bytes: hHit.bytes, isTga: hHit.isTga, priority: 2 };
            claimedBedrockPbrFiles.add(hHit.relPath.toLowerCase());
          }
        }
      }
      pendingBedrockPbrGroups.set(groupKey, group);
    }
  }
  const javaOutputPngDims = new Map<string, { width: number; height: number }>();
  const pendingJavaFlipbooks: Array<{ sourcePath: string; javaPngPath: string; entry: FlipbookEntry }> = [];
  const writtenJavaMcmetas = new Map<string, string>();
  const pendingBedrockHotbarParts = new Map<string, Uint8Array>();
  const pendingJavaSkyFiles = new Map<string, { sourcePath: string; bytes: Uint8Array }>();
  const pendingBedrockCubemap = new Map<number, { sourcePath: string; bytes: Uint8Array; isTga: boolean }>();
  const pendingJavaContainers = new Map<string, { sourcePath: string; bytes: Uint8Array }>();
  const pendingBedrockContainerUi = new Map<string, { sourcePath: string; bytes: Uint8Array; isTga: boolean }>();
  const pendingJavaContainerBases = new Map<string, { sourcePath: string; bytes: Uint8Array; sheetW: number; sheetH: number }>();
  const pendingJavaContainerSprites = new Map<string, Array<{ sourcePath: string; bytes: Uint8Array; box: CropBox }>>();
  const pendingGuiSheetEntries: Record<'icons' | 'widgets' | 'bars', Array<{ sourcePath: string; bytes: Uint8Array; box: CropBox; isPrimary?: boolean }>> = {
    icons: [],
    widgets: [],
    bars: [],
  };
  const pendingGuiSheetBases: Partial<Record<'icons' | 'widgets' | 'bars', Uint8Array>> = {};
  const pendingBedrockLegacyGuiSheets: Array<{ sourcePath: string; relativePath: string; bytes: Uint8Array }> = [];
  let hasWidgetButtonSprite = false;
  let pendingJavaGrassSide: { sourcePath: string; bytes: Uint8Array } | null = null;
  let pendingJavaGrassSideOverlay: { sourcePath: string; bytes: Uint8Array } | null = null;
  const pendingJavaDialFrames = new Map<DialItemKind, Map<number, { sourcePath: string; bytes: Uint8Array }>>();
  const pendingJavaDialStrips = new Map<DialItemKind, { sourcePath: string; bytes: Uint8Array }>();
  const pendingBedrockDialAtlases = new Map<DialItemKind, { sourcePath: string; bytes: Uint8Array; isTga: boolean; priority: number }>();
  const pendingBedrockDialIcons: Array<{ kind: DialItemKind; sourcePath: string }> = [];
  const pendingBedrockModels: Array<{ sourcePath: string; relativePath: string; rawText: string }> = [];
  const pendingJavaModels: Array<{ sourcePath: string; relativePath: string; rawText: string }> = [];
  const lowPriorityFallbackTargets = new Set<string>();
  const tgaWrittenTargets = new Set<string>();

  const writeSlicedOutputs = (
    sourcePath: string,
    files: Record<string, Uint8Array>,
    mcmetas?: Record<string, string>,
    overwrite = false
  ) => {
    for (const [outPath, outData] of Object.entries(files)) {
      if (!isSafePath(outPath)) continue;
      if (!overwrite && targetFiles[outPath]) continue;
      const alreadyWritten = Boolean(targetFiles[outPath]);
      targetFiles[outPath] = [outData, { level: getFileCompressionLevel(outPath) }];
      allTargetTextures.add(outPath);
      if (!alreadyWritten) report.convertedCount++;
      report.details.push({ filename: sourcePath, status: 'converted', outputPath: outPath });
      const mcmeta = mcmetas?.[`${outPath}.mcmeta`];
      if (mcmeta && (overwrite || !targetFiles[`${outPath}.mcmeta`])) {
        const mcmetaWritten = Boolean(targetFiles[`${outPath}.mcmeta`]);
        targetFiles[`${outPath}.mcmeta`] = [strToU8(mcmeta), { level: getFileCompressionLevel(`${outPath}.mcmeta`) }];
        if (!mcmetaWritten) report.convertedCount++;
        report.details.push({ filename: sourcePath, status: 'converted', outputPath: `${outPath}.mcmeta` });
      }
    }
  };

  const writeBedrockContainerSprites = (
    sourcePath: string,
    isTga: boolean,
    bytes: Uint8Array,
    jPaths: string[],
    suppressCorruptSkip: boolean
  ): boolean => {
    const pngBytes = convertTgaToPng(bytes);
    if (pngBytes && getPngDimensions(pngBytes)) {
      let wroteAny = false;
      for (const jp of jPaths) {
        const formattedJp = formatTargetJavaPath(jp);
        const replacingTga = !isTga && tgaWrittenTargets.has(formattedJp);
        if (isSafePath(formattedJp) && isValidJavaAssetPath(formattedJp) && (!targetFiles[formattedJp] || replacingTga)) {
          targetFiles[formattedJp] = [pngBytes, { level: getFileCompressionLevel(formattedJp) }];
          allTargetTextures.add(formattedJp);
          if (isTga) tgaWrittenTargets.add(formattedJp);
          else tgaWrittenTargets.delete(formattedJp);
          if (!replacingTga) report.convertedCount++;
          report.details.push({ filename: sourcePath, status: 'converted', outputPath: formattedJp });
          wroteAny = true;
        }
      }
      if (isTga && !wroteAny) {
        report.skippedCount++;
        report.details.push({ filename: sourcePath, status: 'skipped', reason: 'PNG equivalent already present' });
      }
      return true;
    }
    if (!suppressCorruptSkip) {
      report.skippedCount++;
      report.details.push({ filename: sourcePath, status: 'skipped', reason: 'Invalid or corrupt UI image' });
    }
    return false;
  };

  // Pre-load dirt texture for Bedrock -> Java conversion to composite transparent snowy grass
  let cachedBedrockDirtBytes: Uint8Array | null = null;
  if (direction === 'bedrock-to-java') {
    const dirtCandidates = [
      activeSubpackFolder ? `${packRoot}subpacks/${activeSubpackFolder}/textures/blocks/dirt.png` : null,
      activeSubpackFolder ? `${packRoot}subpacks/${activeSubpackFolder}/textures/blocks/dirt.tga` : null,
      activeSubpackFolder ? `${packRoot}subpacks/${activeSubpackFolder}/textures/block/dirt.png` : null,
      activeSubpackFolder ? `${packRoot}subpacks/${activeSubpackFolder}/textures/block/dirt.tga` : null,
      `${packRoot}textures/blocks/dirt.png`,
      `${packRoot}textures/blocks/dirt.tga`,
      `${packRoot}textures/block/dirt.png`,
      `${packRoot}textures/block/dirt.tga`,
      activeSubpackFolder ? `subpacks/${activeSubpackFolder}/textures/blocks/dirt.png` : null,
      activeSubpackFolder ? `subpacks/${activeSubpackFolder}/textures/blocks/dirt.tga` : null,
      'textures/blocks/dirt.png',
      'textures/blocks/dirt.tga',
      'textures/block/dirt.png',
      'textures/block/dirt.tga'
    ].filter((p): p is string => Boolean(p));

    for (const c of dirtCandidates) {
      if (sourceFiles[c]) {
        cachedBedrockDirtBytes = sourceFiles[c];
        break;
      }
    }

    if (!cachedBedrockDirtBytes) {
      for (const [k, v] of Object.entries(sourceFiles)) {
        if (/textures\/blocks?\/dirt\.(png|tga)$/i.test(k)) {
          if (activeSubpackFolder && k.includes(`subpacks/${activeSubpackFolder}`)) {
            cachedBedrockDirtBytes = v;
            break;
          } else if (!cachedBedrockDirtBytes) {
            cachedBedrockDirtBytes = v;
          }
        }
      }
    }
  }

  let processedCount = 0;
  let lastProgressTime = performance.now();

  for (const path of filePaths) {
    processedCount++;
    const now = performance.now();
    if (now - lastProgressTime > 50 || processedCount === filePaths.length) {
      onProgress?.(processedCount, report.totalFiles);
      lastProgressTime = now;
    }

    const content = sourceFiles[path];
    if (!isSafePath(path)) {
      report.skippedCount++;
      report.details.push({ filename: path, status: 'skipped', reason: 'Unsafe path traversal attempt' });
      continue;
    }

    if (path.includes('__MACOSX') || path.split('/').pop()?.startsWith('.')) {
      report.skippedCount++;
      report.details.push({ filename: path, status: 'skipped', reason: 'System hidden file' });
      continue;
    }

    if (!path.startsWith(packRoot)) {
      report.skippedCount++;
      report.details.push({ filename: path, status: 'skipped', reason: 'Outside of pack root directory' });
      continue;
    }

    let relativePath = path.substring(packRoot.length);

    // Resolve Bedrock subpack hierarchy (`subpacks/<folder>/...`)
    if (direction === 'bedrock-to-java' || direction === 'bedrock-to-bedrock') {
      const spMatch = relativePath.match(/^subpacks\/([^/]+)\/(.+)$/);
      if (spMatch) {
        if (spMatch[1] !== activeSubpackFolder) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: `Inactive subpack tier (${spMatch[1]})` });
          continue;
        }
        relativePath = spMatch[2];
      } else if (activeSubpackPaths.has(relativePath)) {
        report.skippedCount++;
        report.details.push({ filename: path, status: 'skipped', reason: `Overridden by active subpack (${activeSubpackFolder})` });
        continue;
      }
    }

    if (direction === 'java-to-bedrock') {
      // Upgrade legacy Java source to modern layout so mappings can resolve
      relativePath = normalizeLegacyPath(relativePath, sourcePackFormat);
    }

    try {
      // 1. Handle PBR / Shader Companion Files (Bedrock RTX/Deferred <-> Java LabPBR)
      if (direction === 'bedrock-to-java') {
        const lowerRel = relativePath.toLowerCase();
        if (claimedBedrockPbrFiles.has(lowerRel)) {
          if (!options.enablePbrConversion) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'PBR/Shader map conversion is disabled (Beta)' });
          }
          continue;
        }
        if (options.enablePbrConversion && claimedBedrockColorAliases.has(lowerRel)) {
          continue;
        }
        const pbrInfo = classifyBedrockPbrPath(relativePath);
        if (pbrInfo) {
          if (!options.enablePbrConversion) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'PBR/Shader map conversion is disabled (Beta)' });
            continue;
          }
          if (pbrInfo.type === 'texture_set') {
            continue;
          }

          const groupKey = pbrInfo.baseBedrockTexturePath.toLowerCase();
          const group: PendingBedrockPbrGroup = pendingBedrockPbrGroups.get(groupKey) || {
            baseBedrockTexturePath: pbrInfo.baseBedrockTexturePath
          };
          const isTga = lowerRel.endsWith('.tga');

          if (pbrInfo.type === 'mer' || pbrInfo.type === 'mers') {
            const isMers = pbrInfo.type === 'mers';
            const existing = group.merFile;
            const shouldReplace =
              !existing ||
              1 > existing.priority ||
              (existing.priority === 1 && ((isMers && !existing.hasSubsurface) || (isMers === existing.hasSubsurface && existing.isTga && !isTga)));
            if (shouldReplace) {
              if (existing) {
                report.skippedCount++;
                report.details.push({ filename: existing.sourcePath, status: 'skipped', reason: 'Superseded by primary PBR map' });
              }
              group.merFile = { sourcePath: path, bytes: content, isTga, priority: 1, hasSubsurface: isMers };
              pendingBedrockPbrGroups.set(groupKey, group);
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Superseded by primary PBR map' });
            }
          } else if (pbrInfo.type === 'normal') {
            const existing = group.normalFile;
            const shouldReplace = !existing || 1 > existing.priority || (existing.priority === 1 && existing.isTga && !isTga);
            if (shouldReplace) {
              if (existing) {
                report.skippedCount++;
                report.details.push({ filename: existing.sourcePath, status: 'skipped', reason: 'Superseded by primary PBR map' });
              }
              group.normalFile = { sourcePath: path, bytes: content, isTga, priority: 1 };
              pendingBedrockPbrGroups.set(groupKey, group);
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Superseded by primary PBR map' });
            }
          } else if (pbrInfo.type === 'heightmap') {
            const existing = group.heightmapFile;
            const shouldReplace = !existing || 1 > existing.priority || (existing.priority === 1 && existing.isTga && !isTga);
            if (shouldReplace) {
              if (existing) {
                report.skippedCount++;
                report.details.push({ filename: existing.sourcePath, status: 'skipped', reason: 'Superseded by primary PBR map' });
              }
              group.heightmapFile = { sourcePath: path, bytes: content, isTga, priority: 1 };
              pendingBedrockPbrGroups.set(groupKey, group);
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Superseded by primary PBR map' });
            }
          }
          continue;
        }
      } else if (direction === 'java-to-bedrock') {
        const labPbrInfo = classifyJavaLabPbrPath(relativePath);
        if (labPbrInfo) {
          if (!options.enablePbrConversion) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'PBR/Shader map conversion is disabled (Beta)' });
            continue;
          }
          const baseBedrock = getTargetContext(labPbrInfo.baseJavaTexturePath, 'java-to-bedrock');
          if (!baseBedrock) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'Base texture for LabPBR map is unmapped' });
            continue;
          }
          const baseNoExt = baseBedrock.replace(/\.(png|tga)$/i, '');
          const lastSlash = baseNoExt.lastIndexOf('/');
          const dir = lastSlash !== -1 ? baseNoExt.slice(0, lastSlash) : 'textures';
          const baseName = lastSlash !== -1 ? baseNoExt.slice(lastSlash + 1) : baseNoExt;
          const setMeta = bedrockPbrSets.get(baseNoExt) || {
            baseName,
            dir,
            hasMer: false,
            hasSubsurface: false,
            hasNormal: false,
            hasHeightmap: false
          };

          if (labPbrInfo.type === 'specular') {
            const allowSubsurface = compareBedrockVersion(targetBedrockVersion.minEngineVersion, [1, 21, 30]) >= 0;
            const merRes = await convertLabPbrSpecToBedrockMer(content, allowSubsurface);
            if (!merRes) {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Failed to decode Java LabPBR specular map' });
              continue;
            }
            const merPath = `${baseNoExt}_mer.png`;
            if (isSafePath(merPath)) {
              const alreadyWritten = Boolean(targetFiles[merPath]);
              targetFiles[merPath] = [merRes.png, { level: getFileCompressionLevel(merPath) }];
              allTargetTextures.add(merPath);
              setMeta.hasMer = true;
              setMeta.hasSubsurface = setMeta.hasSubsurface || merRes.hasSubsurface;
              bedrockPbrSets.set(baseNoExt, setMeta);
              if (!alreadyWritten) report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: merPath });
            }
            continue;
          } else {
            const normRes = await convertLabPbrNormalToBedrock(content);
            if (!normRes) {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Failed to decode Java LabPBR normal map' });
              continue;
            }
            const outPbrPath = normRes.kind === 'heightmap' ? `${baseNoExt}_heightmap.png` : `${baseNoExt}_normal.png`;
            if (isSafePath(outPbrPath)) {
              const alreadyWritten = Boolean(targetFiles[outPbrPath]);
              targetFiles[outPbrPath] = [normRes.png, { level: getFileCompressionLevel(outPbrPath) }];
              allTargetTextures.add(outPbrPath);
              if (normRes.kind === 'heightmap') setMeta.hasHeightmap = true;
              else setMeta.hasNormal = true;
              bedrockPbrSets.set(baseNoExt, setMeta);
              if (!alreadyWritten) report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: outPbrPath });
            }
            continue;
          }
        }
      }

      // 2. Handle 3D Custom Models & Entity Geometry (Bedrock <-> Java)
      if (direction === 'bedrock-to-java' && isBedrockModelPath(relativePath)) {
        if (!options.enableModelConversion) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: '3D Model conversion is disabled (Beta)' });
          continue;
        }
        pendingBedrockModels.push({ sourcePath: path, relativePath, rawText: strFromU8(content) });
        continue;
      } else if (direction === 'java-to-bedrock' && isJavaModelPath(relativePath)) {
        if (!options.enableModelConversion) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: '3D Model conversion is disabled (Beta)' });
          continue;
        }
        pendingJavaModels.push({ sourcePath: path, relativePath, rawText: strFromU8(content) });
        continue;
      }
      // Custom Skyboxes (OptiFine/MCPatcher world0 <-> Bedrock overworld_cubemap)
      if (direction === 'java-to-bedrock' && isJavaOverworldSkyPath(relativePath)) {
        pendingJavaSkyFiles.set(relativePath, { sourcePath: path, bytes: content });
        continue;
      } else if (direction === 'bedrock-to-java') {
        const cubemapIdx = getBedrockCubemapIndex(relativePath);
        if (cubemapIdx !== null) {
          const isTga = relativePath.toLowerCase().endsWith('.tga');
          if (!pendingBedrockCubemap.has(cubemapIdx) || !isTga) {
            pendingBedrockCubemap.set(cubemapIdx, { sourcePath: path, bytes: content, isTga });
          }
          continue;
        }
      }

      // Container GUI Routing (Java <-> Bedrock & Java <-> Java)
      if (direction === 'java-to-bedrock' && isJavaContainerSheetPath(relativePath)) {
        if (!options.enableGuiConversion) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: 'GUI conversion disabled' });
          continue;
        }
        pendingJavaContainers.set(relativePath, { sourcePath: path, bytes: content });
        continue;
      }

      if (direction === 'java-to-bedrock' && options.enableGuiConversion) {
        const slotUiPath = getJavaSlotItemToBedrockUiPath(relativePath);
        if (slotUiPath && !targetFiles[slotUiPath]) {
          targetFiles[slotUiPath] = [content, { level: getFileCompressionLevel(slotUiPath) }];
          allTargetTextures.add(slotUiPath);
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: slotUiPath });
          continue;
        }
      }

      if (direction === 'bedrock-to-java' && isBedrockContainerThemeOrPartPath(relativePath)) {
        const isTga = relativePath.toLowerCase().endsWith('.tga');
        const normUi = relativePath.toLowerCase().replace(/\.tga$/, '.png');
        let handled = false;
        if (options.enableGuiConversion) {
          if (!pendingBedrockContainerUi.has(normUi) || !isTga) {
            pendingBedrockContainerUi.set(normUi, { sourcePath: path, bytes: content, isTga });
          }
          handled = true;
        }
        if (targetJavaVersion.packFormat >= 18) {
          const jPaths = getBedrockContainerToModernJavaPaths(relativePath, targetJavaVersion.packFormat);
          if (jPaths.length > 0) {
            if (!writeBedrockContainerSprites(path, isTga, content, jPaths, handled) && !handled) {
              continue;
            }
            handled = true;
          }
        }
        if (handled) {
          continue;
        }
      }

      if (direction === 'java-to-java') {
        if (shouldSplitLegacyJavaGui && isJavaContainerSheetPath(relativePath)) {
          const sliced = await sliceJavaContainerSheetForModernJava(relativePath, content, targetJavaVersion.packFormat, effectiveSourceJavaFormat);
          if (sliced) {
            writeSlicedOutputs(path, sliced.sprites, sliced.mcmetas);
            if (sliced.clippedSheet) {
              const outSheet = formatTargetJavaPath(
                migrateJavaGuiContainerPath(relativePath, targetJavaVersion.packFormat, targetJavaVersion.id)
              );
              if (isSafePath(outSheet) && isValidJavaAssetPath(outSheet) && !targetFiles[outSheet]) {
                targetFiles[outSheet] = [sliced.clippedSheet, { level: getFileCompressionLevel(outSheet) }];
                allTargetTextures.add(outSheet);
                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: outSheet });
              }
            }
            continue;
          }
        } else if (shouldComposeLegacyJavaGui) {
          if (isJavaContainerSheetPath(relativePath)) {
            const outSheet = formatTargetJavaPath(
              migrateJavaGuiContainerPath(relativePath, targetJavaVersion.packFormat, targetJavaVersion.id)
            );
            const isVillager = outSheet.endsWith('/villager.png') || outSheet.endsWith('/villager2.png');
            pendingJavaContainerBases.set(outSheet, {
              sourcePath: path,
              bytes: content,
              sheetW: isVillager ? 512 : 256,
              sheetH: 256,
            });
            continue;
          }
          if (relativePath.startsWith('assets/minecraft/textures/gui/sprites/container/')) {
            const hit = getJavaContainerModernSpriteTarget(relativePath, targetJavaVersion.packFormat, targetJavaVersion.id);
            if (hit) {
              const arr = pendingJavaContainerSprites.get(hit.sheetPath) ?? [];
              arr.push({ sourcePath: path, bytes: content, box: hit.box });
              pendingJavaContainerSprites.set(hit.sheetPath, arr);
              continue;
            }
          }
        }
      }

      // GUI Version & Edition Routing
      if (direction === 'java-to-bedrock' && relativePath === 'assets/minecraft/textures/gui/sprites/hud/hotbar.png') {
        try {
          const hotbarParts = await processGuiSpriteSheet(content, HOTBAR_SLICE_MAPPINGS, { baseWidth: 182, baseHeight: 22 });
          writeSlicedOutputs(path, hotbarParts, undefined, true);
        } catch (e) {
          console.warn('Failed to slice Java hotbar.png:', e);
          report.errorCount++;
          report.details.push({ filename: path, status: 'error', reason: 'GUI image processing failed' });
        }
        continue;
      }

      if (direction === 'bedrock-to-java' && targetJavaVersion.packFormat >= 18) {
        const normalizedUiPath = relativePath.toLowerCase().replace(/\.tga$/, '.png');
        if (Object.hasOwn(HOTBAR_SLICE_MAPPINGS, normalizedUiPath)) {
          if (!pendingBedrockHotbarParts.has(normalizedUiPath) || !relativePath.toLowerCase().endsWith('.tga')) {
            pendingBedrockHotbarParts.set(normalizedUiPath, content);
          }
          continue;
        }
      }

      if (direction === 'bedrock-to-java' && targetJavaVersion.packFormat < 18 && options.enableGuiConversion) {
        if (relativePath === 'textures/gui/icons.png') {
          pendingGuiSheetBases.icons = content;
          continue;
        }
        if (relativePath === 'textures/gui/gui.png') {
          pendingGuiSheetBases.widgets = content;
          hasWidgetButtonSprite = true;
          continue;
        }
        const sheetHit = getBedrockGuiSheetTarget(relativePath, targetJavaVersion.packFormat);
        if (sheetHit) {
          pendingGuiSheetEntries[sheetHit.sheet].push({ sourcePath: path, bytes: content, box: sheetHit.box, isPrimary: sheetHit.isPrimary });
          continue;
        }
      }

      if (direction === 'java-to-java') {
        if (shouldSplitLegacyJavaGui) {
          const sheetSpec = getJavaSheetToModernSprites(relativePath, effectiveSourceJavaFormat, targetJavaVersion.packFormat);
          if (sheetSpec) {
            try {
              const sliced = await processGuiSpriteSheet(content, sheetSpec.mappings);
              writeSlicedOutputs(path, sliced, sheetSpec.mcmetas);
            } catch (e) {
              console.warn('Failed to slice Java GUI spritesheet:', e);
              report.errorCount++;
              report.details.push({ filename: path, status: 'error', reason: 'GUI image processing failed' });
            }
            continue;
          }
        } else if (shouldComposeLegacyJavaGui) {
          if (relativePath === 'assets/minecraft/textures/gui/icons.png') {
            pendingGuiSheetBases.icons = content;
            continue;
          }
          if (relativePath === 'assets/minecraft/textures/gui/widgets.png') {
            pendingGuiSheetBases.widgets = content;
            hasWidgetButtonSprite = true;
            continue;
          }
          if (relativePath === 'assets/minecraft/textures/gui/bars.png') {
            pendingGuiSheetBases.bars = content;
            continue;
          }
            if (relativePath.startsWith('assets/minecraft/textures/gui/sprites/') && migrateJavaContainerSlotPath(relativePath, targetJavaVersion.packFormat) === relativePath) {
            const hit = getJavaModernSpriteSheetTarget(relativePath, targetJavaVersion.packFormat);
            if (hit) {
              pendingGuiSheetEntries[hit.sheet].push({ sourcePath: path, bytes: content, box: hit.box, isPrimary: hit.isPrimary });
              if (hit.isButton) hasWidgetButtonSprite = true;
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'GUI sprite unsupported in target Java version (< 1.20.2)' });
            }
            continue;
          }
        }
      }

      if (direction === 'java-to-bedrock') {
        if (relativePath === 'assets/minecraft/textures/block/grass_block_side.png') {
          pendingJavaGrassSide = { sourcePath: path, bytes: content };
          continue;
        }
        if (relativePath === 'assets/minecraft/textures/block/grass_block_side_overlay.png') {
          pendingJavaGrassSideOverlay = { sourcePath: path, bytes: content };
          continue;
        }
        if (getBedrockLeafSpec(relativePath)) {
          const leafOutputs = synthesizeBedrockLeafTextures(relativePath, content);
          if (leafOutputs) {
            for (const [outPath, outBytes] of Object.entries(leafOutputs)) {
              if (!isSafePath(outPath)) continue;
              targetFiles[outPath] = [outBytes, { level: getFileCompressionLevel(outPath) }];
              allTargetTextures.add(outPath);
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: outPath });
            }
            convertedBlockTextures.add(relativePath);
          }
          continue;
        }
      }

      if (direction === 'bedrock-to-java' && isBedrockCarriedLeafPath(relativePath)) {
        report.skippedCount++;
        report.details.push({
          filename: path,
          status: 'skipped',
          reason: 'Bedrock inventory-only leaf texture (Java derives inventory icon from block texture)',
        });
        continue;
      }

      if (direction === 'java-to-bedrock') {
        const dial = classifyJavaDialPath(relativePath);
        if (dial) {
          if (dial.mode === 'frame') {
            let map = pendingJavaDialFrames.get(dial.kind);
            if (!map) {
              map = new Map();
              pendingJavaDialFrames.set(dial.kind, map);
            }
            map.set(dial.index, { sourcePath: path, bytes: content });
          } else {
            pendingJavaDialStrips.set(dial.kind, { sourcePath: path, bytes: content });
          }
          continue;
        }
      } else if (direction === 'bedrock-to-java') {
        const bDial = classifyBedrockDialPath(relativePath);
        if (bDial) {
          const isTga = relativePath.toLowerCase().endsWith('.tga');
          if (bDial.role === 'atlas') {
            const existing = pendingBedrockDialAtlases.get(bDial.kind);
            const shouldReplace =
              !existing ||
              bDial.priority > existing.priority ||
              (bDial.priority === existing.priority && existing.isTga && !isTga);
            if (shouldReplace) {
              if (existing) {
                report.skippedCount++;
                report.details.push({ filename: existing.sourcePath, status: 'skipped', reason: 'Superseded by higher-priority dial atlas' });
              }
              pendingBedrockDialAtlases.set(bDial.kind, { sourcePath: path, bytes: content, isTga, priority: bDial.priority });
            } else {
              report.skippedCount++;
              report.details.push({
                filename: path,
                status: 'skipped',
                reason: isTga && !existing.isTga ? 'PNG equivalent already present' : 'Superseded by higher-priority dial atlas',
              });
            }
          } else {
            pendingBedrockDialIcons.push({ kind: bDial.kind, sourcePath: path });
          }
          continue;
        }
      } else if (
        direction === 'java-to-java' &&
        ((sourcePackFormat === 1 && targetJavaVersion.packFormat >= 2) ||
          (sourcePackFormat >= 2 && targetJavaVersion.packFormat === 1))
      ) {
        const dial = classifyJavaDialPath(relativePath);
        if (dial) {
          if (dial.mode === 'frame') {
            let map = pendingJavaDialFrames.get(dial.kind);
            if (!map) {
              map = new Map();
              pendingJavaDialFrames.set(dial.kind, map);
            }
            map.set(dial.index, { sourcePath: path, bytes: content });
          } else {
            pendingJavaDialStrips.set(dial.kind, { sourcePath: path, bytes: content });
          }
          continue;
        }
      }

      const isLowPriorityBlockFallback =
        direction === 'bedrock-to-java' &&
        (isBedrockOpaqueLeafPath(relativePath) || /^textures\/blocks?\/grass_side_carried\.(png|tga)$/i.test(relativePath));

      let targetPath: string | null = null;
      let isModernSpriteHandled = false;
      let isLowPriorityGuiFallback = false;
      const isJavaModernSpritePath =
        direction === 'java-to-bedrock' && relativePath.startsWith('assets/minecraft/textures/gui/sprites/');
      if (direction === 'java-to-bedrock') {
        const bGui = getModernJavaToBedrockGuiPath(relativePath, targetBedrockVersion.minEngineVersion);
        if (bGui) {
          targetPath = bGui;
          isModernSpriteHandled = true;
        } else {
          const bContainer = getModernJavaContainerToBedrockPath(relativePath, targetBedrockVersion.minEngineVersion);
          if (bContainer) {
            targetPath = bContainer.path;
            isModernSpriteHandled = true;
            isLowPriorityGuiFallback = bContainer.isFallback;
          }
        }
      } else if (direction === 'bedrock-to-java') {
        const jGui = targetJavaVersion.packFormat >= 18 ? getBedrockToModernJavaGuiPath(relativePath, targetJavaVersion.packFormat) : null;
        if (jGui) {
          targetPath = jGui;
          isModernSpriteHandled = true;
        } else {
          const jContainerPaths = getBedrockContainerToModernJavaPaths(relativePath, targetJavaVersion.packFormat);
          if (jContainerPaths.length > 0) {
            const isTga = relativePath.toLowerCase().endsWith('.tga');
            writeBedrockContainerSprites(path, isTga, content, jContainerPaths, false);
            continue;
          }
        }
      }

      if (isJavaModernSpritePath && !isModernSpriteHandled) {
        report.skippedCount++;
        report.details.push({
          filename: path,
          status: 'skipped',
          reason: 'Unmapped 1.20.2+ GUI sprite'
        });
        continue;
      }

      if (
        direction === 'bedrock-to-java' &&
        !targetPath &&
        relativePath.toLowerCase().startsWith('textures/ui/') &&
        !isPanoramaPath(relativePath)
      ) {
        report.skippedCount++;
        report.details.push({
          filename: path,
          status: 'skipped',
          reason: 'Unmapped or unsupported Bedrock UI texture for target Java version',
        });
        continue;
      }

      if (!targetPath) {
        if (direction === 'java-to-java') {
          // Perform version migration between Java versions
          targetPath = migrateJavaContainerSlotPath(
            migrateJavaSkyPath(
              migrateJavaGuiContainerPath(
                migrateJavaPath(relativePath, sourcePackFormat, targetJavaVersion.packFormat),
                targetJavaVersion.packFormat,
                targetJavaVersion.id
              ),
              targetJavaVersion.packFormat
            ),
            targetJavaVersion.packFormat
          );
        } else {
          targetPath = getTargetContext(relativePath, direction);
        }
      }

      if ((direction === 'bedrock-to-java' || direction === 'java-to-java') && targetPath) {
        targetPath = formatTargetJavaPath(targetPath);
        if (direction === 'bedrock-to-java' && targetPath.toLowerCase().startsWith('assets/minecraft/sounds/')) {
          targetPath = targetPath.toLowerCase();
        }
      } else if (direction === 'java-to-bedrock' && targetPath && /^sounds\/.+\.(ogg|fsb|wav|mp3)$/i.test(targetPath)) {
        targetPath = targetPath.toLowerCase();
      }

      let isLowPriorityFallback = isLowPriorityBlockFallback || isLowPriorityGuiFallback;
      if (isLowPriorityFallback && targetPath && targetFiles[targetPath]) {
        report.skippedCount++;
        report.details.push({ filename: path, status: 'skipped', reason: 'Primary texture already present' });
        continue;
      }

      if (direction === 'java-to-bedrock' && /^assets\/(minecraft|realms)\/lang\/deprecated\.json$/i.test(relativePath)) {
        report.skippedCount++;
        report.details.push({ filename: path, status: 'skipped', reason: 'Java-only deprecated translation metadata' });
        continue;
      }

      let needsProcessing = false;
      if (targetPath) {
        if (direction === 'bedrock-to-java' && /\.fsb$/i.test(relativePath)) {
          needsProcessing = true;
        } else if (direction === 'java-to-bedrock') {
          if (
            (/\.(json|lang)$/i.test(relativePath) && targetPath.startsWith('texts/')) ||
            /^assets\/minecraft\/sounds\.json$/i.test(relativePath) ||
            relativePath === 'assets/minecraft/texts/splashes.txt' ||
            relativePath.endsWith('.png.mcmeta')
          ) {
            needsProcessing = true;
          }
        } else if (direction === 'bedrock-to-java') {
          if (/^texts\/[^/]+\.lang$/i.test(relativePath)) {
            needsProcessing = true;
          } else if (/^(?:textures\/)?flipbook_textures\.json$/i.test(relativePath)) {
            needsProcessing = true;
          } else if (/^sounds\/sound_definitions\.json$/i.test(relativePath)) {
            needsProcessing = true;
          } else if (relativePath === 'splashes.json' || relativePath === 'texts/splashes.json') {
            needsProcessing = true;
          }
        } else if (direction === 'java-to-java') {
          if (/^assets\/(minecraft|realms)\/lang\/(?!deprecated\.json$)([^/]+)\.(json|lang)$/i.test(relativePath)) {
            needsProcessing = true;
          } else if (
            /^assets\/minecraft\/sounds\.json$/i.test(relativePath) &&
            ((sourcePackFormat === 1) !== (targetJavaVersion.packFormat === 1) ||
              (sourcePackFormat <= 3) !== (targetJavaVersion.packFormat <= 3))
          ) {
            needsProcessing = true;
          }
        }
      }

      if (targetPath) {
        if (!options.enableGuiConversion && !isModernSpriteHandled && !isPanoramaPath(relativePath) && (direction === 'java-to-bedrock' || direction === 'bedrock-to-java')) {
          if (relativePath.includes('/gui/') || targetPath.includes('/gui/') || targetPath.startsWith('textures/ui/')) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'GUI conversion disabled' });
            continue;
          }
        }

        let finalBytes: Uint8Array = content;
        let note: string | undefined;
        let isWarning = false;
        let extractedFromFsb = false;

        if (needsProcessing) {
          if (direction === 'java-to-bedrock') {
            if (/\.(json|lang)$/i.test(relativePath) && targetPath.startsWith('texts/')) {
              const rawCode = targetPath.split('/').pop()?.replace(/\.lang$/i, '') || '';
              const bedrockCode = formatLocaleCode(rawCode, 'll_CC');
              const normalizedTarget = `texts/${bedrockCode}.lang`;
              const parsed = relativePath.toLowerCase().endsWith('.json')
                ? parseJsonLangEntries(strFromU8(content))
                : parseLangEntries(strFromU8(content), false);
              if (!parsed) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid language JSON format' });
                continue;
              }
              const mapped = mapLangEntries(parsed, 'java-to-bedrock');
              let langMap = mergedLangs.get(normalizedTarget);
              if (!langMap) {
                langMap = new Map<string, string>();
                mergedLangs.set(normalizedTarget, langMap);
              }
              for (const [k, v] of mapped) {
                langMap.set(k, v);
              }
              if (bedrockCode) supportedLanguages.add(bedrockCode);

              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: normalizedTarget });
              continue;
            } else if (/^assets\/minecraft\/sounds\.json$/i.test(relativePath)) {
              const converted = javaToBedrockSounds(strFromU8(content), {
                sourcePackFormat,
                targetBedrockMinEngine: targetBedrockVersion.minEngineVersion,
              });
              if (converted === null) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid sounds.json format' });
                continue;
              }
              finalBytes = strToU8(converted);
              targetPath = 'sounds/sound_definitions.json';
            } else if (relativePath === 'assets/minecraft/texts/splashes.txt') {
              const lines = strFromU8(content).split(/\r?\n/).filter(l => l.trim().length > 0);
              finalBytes = strToU8(JSON.stringify({ splashes: lines }, null, 2));
              targetPath = 'texts/splashes.json';
            }

            if (relativePath.endsWith('.png.mcmeta')) {
              const bedrockPngPath = targetPath.replace(/\.mcmeta$/, '');
              if (
                !bedrockPngPath.startsWith('textures/blocks/') ||
                relativePath.startsWith('assets/minecraft/textures/entity/') ||
                /_[sn]\.png\.mcmeta$/i.test(relativePath)
              ) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Bedrock flipbook_textures.json only supports block textures' });
                continue;
              }
              const flipbook = parseJavaAnimation(strFromU8(content), bedrockPngPath);
              if (flipbook) {
                pendingBedrockFlipbooks.push({ sourcePath: path, entry: flipbook });
              } else {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid or empty animation metadata' });
              }
              continue;
            }
          } else if (direction === 'bedrock-to-java') {
            if (/\.fsb$/i.test(relativePath)) {
              const extracted = await extractFsb5(content);
              if (extracted) {
                finalBytes = extracted;
                extractedFromFsb = true;
                if (/\.fsb$/i.test(targetPath)) {
                  targetPath = targetPath.replace(/\.fsb$/i, '.ogg');
                }
              } else {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Failed to extract FSB audio' });
                continue;
              }
            } else if (/^texts\/[^/]+\.lang$/i.test(relativePath)) {
              const rawCode = relativePath.replace(/^texts\//i, '').replace(/\.lang$/i, '');
              if (targetJavaVersion.packFormat >= 4) {
                const entries = mapLangEntries(parseLangEntries(strFromU8(content), true), 'bedrock-to-java');
                finalBytes = strToU8(serializeJsonLangEntries(entries));
                targetPath = `assets/minecraft/lang/${formatLocaleCode(rawCode, 'll_cc')}.json`;
              } else {
                const entries = mapLangEntries(parseLangEntries(strFromU8(content), false), 'bedrock-to-java');
                finalBytes = strToU8(serializeLangEntries(entries));
                const style = targetJavaVersion.packFormat <= 2 ? 'll_CC' : 'll_cc';
                targetPath = `assets/minecraft/lang/${formatLocaleCode(rawCode, style)}.lang`;
              }
            } else if (/^(?:textures\/)?flipbook_textures\.json$/i.test(relativePath)) {
              let mappedCount = 0;
              try {
                const flipbooks = parseJsonc(strFromU8(content));
                if (!Array.isArray(flipbooks)) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Invalid flipbook_textures.json format' });
                  continue;
                }
                for (const entry of flipbooks) {
                  if (!entry || typeof entry.flipbook_texture !== 'string') continue;
                  let rawTex = entry.flipbook_texture.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
                  rawTex = rawTex.replace(/\.(png|tga)$/i, '') + '.png';
                  const bPath = rawTex.startsWith('textures/') ? rawTex : 'textures/' + rawTex;
                  const jPath = getTargetContext(bPath, 'bedrock-to-java');
                  if (jPath) {
                    const formattedJPath = formatTargetJavaPath(jPath);
                    pendingJavaFlipbooks.push({ sourcePath: path, javaPngPath: formattedJPath, entry });
                    mappedCount++;
                  }
                }
              } catch {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid flipbook_textures.json format' });
                continue;
              }
              if (mappedCount === 0) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'No matching animated block textures in flipbook_textures.json' });
              }
              continue;
            } else if (/^sounds\/sound_definitions\.json$/i.test(relativePath)) {
              const converted = bedrockToJavaSounds(strFromU8(content), {
                targetPackFormat: targetJavaVersion.packFormat,
              });
              if (converted === null) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid sound_definitions.json format' });
                continue;
              }
              finalBytes = strToU8(converted);
              targetPath = 'assets/minecraft/sounds.json';
            } else if (relativePath === 'splashes.json' || relativePath === 'texts/splashes.json') {
              try {
                const parsed = parseJsonc(strFromU8(content)) as any;
                const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.splashes) ? parsed.splashes : [];
                finalBytes = strToU8(list.map((s: any) => String(s)).join('\n'));
                targetPath = 'assets/minecraft/texts/splashes.txt';
              } catch {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid splashes.json format' });
                continue;
              }
            }
          } else if (direction === 'java-to-java') {
            const lm = relativePath.match(/^assets\/(minecraft|realms)\/lang\/([^/]+)\.(json|lang)$/i);
            if (lm) {
              const [, ns, rawCode, rawExt] = lm;
              const srcIsJson = rawExt.toLowerCase() === 'json';
              const dstWantsJson = targetJavaVersion.packFormat >= 4;
              const dstStyle = targetJavaVersion.packFormat <= 2 ? 'll_CC' : 'll_cc';
              const outCode = formatLocaleCode(rawCode, dstStyle);
              const outExt = dstWantsJson ? 'json' : 'lang';
              targetPath = `assets/${ns.toLowerCase()}/lang/${outCode}.${outExt}`;
              if (srcIsJson !== dstWantsJson) {
                if (targetFiles[targetPath]) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Primary language file already present' });
                  continue;
                }
                isLowPriorityFallback = true;
                if (srcIsJson && !dstWantsJson) {
                  const parsed = parseJsonLangEntries(strFromU8(content));
                  if (!parsed) {
                    report.skippedCount++;
                    report.details.push({ filename: path, status: 'skipped', reason: 'Invalid language JSON format' });
                    continue;
                  }
                  finalBytes = strToU8(serializeLangEntries(mapLangEntries(parsed, 'java-to-bedrock')));
                } else {
                  const parsed = parseLangEntries(strFromU8(content), true);
                  finalBytes = strToU8(serializeJsonLangEntries(mapLangEntries(parsed, 'bedrock-to-java')));
                }
              }
            } else if (/^assets\/minecraft\/sounds\.json$/i.test(relativePath)) {
              const migrated = migrateJavaSounds(strFromU8(content), sourcePackFormat, targetJavaVersion.packFormat);
              if (migrated === null) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid sounds.json format' });
                continue;
              }
              finalBytes = strToU8(migrated);
              targetPath = 'assets/minecraft/sounds.json';
            }
          }
        }

        if (options.enableGuiConversion && direction === 'java-to-bedrock') {
          const guiMappings =
            relativePath === 'assets/minecraft/textures/gui/icons.png'
              ? getLegacyIconsToBedrockMappings(sourcePackFormat, targetBedrockVersion.minEngineVersion)
              : relativePath === 'assets/minecraft/textures/gui/widgets.png'
              ? WIDGETS_MAPPINGS
              : null;
          if (guiMappings) {
            try {
              const uiFiles = await processGuiSpriteSheet(content, guiMappings);
              writeSlicedOutputs(path, uiFiles);
              if (relativePath === 'assets/minecraft/textures/gui/icons.png') {
                targetFiles['textures/gui/icons.png'] = [content, { level: getFileCompressionLevel('textures/gui/icons.png') }];
                allTargetTextures.add('textures/gui/icons.png');
              } else if (
                relativePath === 'assets/minecraft/textures/gui/widgets.png' &&
                compareBedrockVersion(targetBedrockVersion.minEngineVersion, [1, 16, 0]) < 0
              ) {
                targetFiles['textures/gui/gui.png'] = [content, { level: getFileCompressionLevel('textures/gui/gui.png') }];
                allTargetTextures.add('textures/gui/gui.png');
              }
            } catch (e) {
              console.warn("Failed to process GUI spritesheet:", e);
              report.errorCount++;
              report.details.push({ filename: path, status: 'error', reason: 'GUI image processing failed' });
            }
            continue;
          }
        } else if (
          options.enableGuiConversion &&
          direction === 'bedrock-to-java' &&
          targetJavaVersion.packFormat >= 18 &&
          (relativePath.toLowerCase() === 'textures/gui/icons.png' || relativePath.toLowerCase() === 'textures/gui/gui.png')
        ) {
          pendingBedrockLegacyGuiSheets.push({ sourcePath: path, relativePath: relativePath.toLowerCase(), bytes: content });
          continue;
        } else if (
          options.enableGuiConversion &&
          direction === 'bedrock-to-bedrock' &&
          compareBedrockVersion(sourceBedrockMinEngine, [1, 16, 0]) < 0 &&
          compareBedrockVersion(targetBedrockVersion.minEngineVersion, [1, 16, 0]) >= 0 &&
          (relativePath === 'textures/gui/icons.png' || relativePath === 'textures/gui/gui.png')
        ) {
          const bMappings =
            relativePath === 'textures/gui/icons.png'
              ? getLegacyIconsToBedrockMappings(15, targetBedrockVersion.minEngineVersion)
              : WIDGETS_MAPPINGS;
          try {
            const uiFiles = await processGuiSpriteSheet(content, bMappings);
            writeSlicedOutputs(path, uiFiles);
          } catch (e) {
            console.warn('Failed to upgrade Bedrock GUI spritesheet:', e);
          }
        }

        if (options.enableAudioReencode && /\.(ogg|wav|mp3)$/i.test(targetPath)) {
          if (/\.(wav|mp3)$/i.test(targetPath)) {
            const oggTarget = targetPath.replace(/\.(wav|mp3)$/i, '.ogg');
            if (targetFiles[oggTarget]) {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'OGG equivalent already present' });
              continue;
            }
          }
          onProgress?.(processedCount, report.totalFiles);
          lastProgressTime = performance.now();
          const audioRes = await reencodeAudio(finalBytes, { forceReencode: extractedFromFsb });
          if (audioRes.status === 'reencoded') {
            finalBytes = audioRes.data;
            if (/\.(wav|mp3)$/i.test(targetPath)) {
              targetPath = targetPath.replace(/\.(wav|mp3)$/i, '.ogg');
            }
          } else if (audioRes.status === 'failed') {
            note = 'Audio re-encode failed, using original';
            isWarning = true;
          }
        }

        if (direction === 'bedrock-to-java' && relativePath.toLowerCase().endsWith('.tga')) {
          const pngTarget = targetPath.replace(/\.tga$/i, '.png');
          if (allTargetTextures.has(pngTarget) && !lowPriorityFallbackTargets.has(pngTarget)) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'PNG equivalent already present' });
            continue;
          }
          if (/^textures\/blocks?\/grass_side\.tga$/i.test(relativePath)) {
            targetPath = pngTarget;
          } else {
            try {
              const pngBytes = convertTgaToPng(finalBytes);
              if (pngBytes) {
                finalBytes = pngBytes;
                targetPath = pngTarget;
              } else if (targetPath.endsWith('.png')) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'TGA decode failed' });
                continue;
              } else {
                note = 'TGA decode failed, keeping raw bytes';
                isWarning = true;
              }
            } catch (e) {
              console.warn("TGA to PNG conversion failed:", e);
              if (targetPath.endsWith('.png')) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'TGA conversion failed' });
                continue;
              }
            }
          }
        }

        const isSnowyGrass = /(^|\/)(grass_block_snow|grass_side_snowed)\.(png|tga)$/i.test(targetPath);
        if (direction === 'bedrock-to-java' && isSnowyGrass) {
          try {
            const composited = await compositeSnowyGrassSide(finalBytes, cachedBedrockDirtBytes);
            if (composited) {
              finalBytes = composited;
              targetPath = targetPath.replace(/\.tga$/i, '.png');
            }
          } catch (e) {
            console.warn("Snowy grass compositing failed:", e);
          }
        }

        if (direction === 'bedrock-to-java' && /^textures\/blocks?\/grass_side\.(png|tga)$/i.test(relativePath)) {
          const split = splitBedrockGrassSideForJava(finalBytes);
          if (split) {
            finalBytes = split.sidePng;
            if (split.overlayPng) {
              const overlayTarget = formatTargetJavaPath('assets/minecraft/textures/block/grass_block_side_overlay.png');
              const normOverlay = normalizeJavaBlockAtlasPng(overlayTarget, split.overlayPng, decodePngToRgbaSync);
              if (normOverlay && isSafePath(overlayTarget) && isValidJavaAssetPath(overlayTarget) && !targetFiles[overlayTarget]) {
                targetFiles[overlayTarget] = [normOverlay, { level: getFileCompressionLevel(overlayTarget) }];
                allTargetTextures.add(overlayTarget);
                const oDims = getPngDimensions(normOverlay);
                if (oDims) javaOutputPngDims.set(overlayTarget, oDims);
                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: overlayTarget });
              }
            }
          }
        }

        if (
          (direction === 'java-to-bedrock' && isModernSpriteHandled) ||
          (direction === 'java-to-java' && targetJavaVersion.packFormat >= 46 && targetPath !== relativePath)
        ) {
          finalBytes = cropInset1pxIfLegacySlotSprite(relativePath, finalBytes);
        }

        if (direction === 'bedrock-to-java' && targetPath.endsWith('.png')) {
          const rawValidPng = convertTgaToPng(finalBytes);
          const validPng = rawValidPng ? normalizeJavaBlockAtlasPng(targetPath, rawValidPng, decodePngToRgbaSync) : null;
          if (!validPng) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'Invalid or legacy non-mipmappable block texture' });
            continue;
          }
          finalBytes = validPng;
          const dims = getPngDimensions(validPng);
          if (dims) javaOutputPngDims.set(targetPath, dims);
        }

        // Same edition metadata update
        if (direction === 'java-to-java' && relativePath === 'pack.mcmeta') {
          try {
            const json = JSON.parse(strFromU8(finalBytes));
            if (json.pack) {
              json.pack.pack_format = targetJavaVersion.packFormat;
              delete json.pack.supported_formats;
              if (targetJavaVersion.packFormat >= 69) {
                json.pack.min_format = targetJavaVersion.packFormat;
                json.pack.max_format = targetJavaVersion.packFormat === 97 ? [97, 1] : targetJavaVersion.packFormat;
              } else {
                delete json.pack.min_format;
                delete json.pack.max_format;
              }
              finalBytes = strToU8(JSON.stringify(json, null, 2));
            }
          } catch { }
        } else if (direction === 'bedrock-to-bedrock' && relativePath === 'manifest.json') {
          try {
            const json = JSON.parse(strFromU8(finalBytes));
            if (json.header) {
              json.header.min_engine_version = targetBedrockVersion.minEngineVersion;
              finalBytes = strToU8(JSON.stringify(json, null, 2));
            }
          } catch { }
        } else if (direction === 'java-to-java' && /^assets\/minecraft\/(optifine|mcpatcher)\/sky\/.+\.properties$/i.test(relativePath)) {
          finalBytes = strToU8(migrateJavaSkyProperties(strFromU8(finalBytes), targetJavaVersion.packFormat));
        }

        if (direction === 'java-to-bedrock') {
          if (relativePath.startsWith('assets/minecraft/textures/block/')) {
            convertedBlockTextures.add(relativePath);
          } else if (relativePath.startsWith('assets/minecraft/textures/item/')) {
            convertedItemTextures.add(relativePath);
          }
        }

        if (!isSafePath(targetPath) || ((direction === 'bedrock-to-java' || direction === 'java-to-java') && !isValidJavaAssetPath(targetPath))) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: 'Invalid or unsafe target path' });
          continue;
        }

        if (targetPath.endsWith('.png') || targetPath.endsWith('.tga')) {
          allTargetTextures.add(targetPath);
        }

        const isTgaSource = relativePath.toLowerCase().endsWith('.tga');
        const alreadyWritten = Boolean(targetFiles[targetPath]);
        const replacedFallback = !isLowPriorityFallback && lowPriorityFallbackTargets.has(targetPath);
        if (isLowPriorityFallback) {
          lowPriorityFallbackTargets.add(targetPath);
        } else if (replacedFallback) {
          lowPriorityFallbackTargets.delete(targetPath);
        }
        if (direction === 'bedrock-to-java' && isTgaSource) {
          tgaWrittenTargets.add(targetPath);
        } else {
          tgaWrittenTargets.delete(targetPath);
        }

        targetFiles[targetPath] = [finalBytes, { level: getFileCompressionLevel(targetPath) }];
        if (!alreadyWritten) {
          report.convertedCount++;
        }
        report.details.push({
          filename: path,
          status: 'converted',
          outputPath: targetPath,
          ...(isWarning ? { warning: true } : {}),
          ...(note ? { reason: note } : {})
        });
      } else {
        // Special metadata handling
        if (direction === 'java-to-bedrock' && relativePath === 'pack.mcmeta') {
          const manifestStr = generateManifestContent(packName, packDescription, headerUuid, moduleUuid, targetBedrockVersion.minEngineVersion);
          targetFiles['manifest.json'] = [strToU8(manifestStr), { level: getFileCompressionLevel('manifest.json') }];
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: 'manifest.json' });
        } else if (direction === 'bedrock-to-java' && relativePath === 'manifest.json') {
          const mcmetaStr = generateMcmetaContent(packDescription, targetJavaVersion.packFormat);
          targetFiles['pack.mcmeta'] = [strToU8(mcmetaStr), { level: getFileCompressionLevel('pack.mcmeta') }];
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: 'pack.mcmeta' });
        } else if (relativePath === 'pack_icon.png' || relativePath === 'pack.png' || relativePath.endsWith('/pack_icon.png') || relativePath.endsWith('/pack.png')) {
          const iconName = direction === 'java-to-bedrock' ? 'pack_icon.png' : 'pack.png';
          const iconBytes = convertTgaToPng(content);
          if (iconBytes) {
            targetFiles[iconName] = [iconBytes, { level: getFileCompressionLevel(iconName) }];
            report.convertedCount++;
            report.details.push({ filename: path, status: 'converted', outputPath: iconName });
          } else {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'Invalid pack icon format' });
          }
        } else {
          let reason = 'Unsupported or unmapped file';
          if (relativePath.includes('blockstates/') || relativePath.includes('models/')) {
            reason = 'Custom models/blockstates are currently not supported';
          } else if (relativePath.includes('mcpatcher/') || relativePath.includes('optifine/')) {
            reason = 'OptiFine/MCPatcher assets are not supported by vanilla Bedrock';
          } else if (relativePath.includes('font/') && relativePath.endsWith('.bin')) {
            reason = 'Custom font glyph data is incompatible';
          }

          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason });
        }
      }
    } catch (err) {
      report.errorCount++;
      report.details.push({
        filename: path,
        status: 'error',
        reason: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  // GUI Composition Phase (Bedrock hotbar -> Java 1.20.2+, or split sprites -> Legacy Java < 1.20.2 sheets)
  if (pendingBedrockHotbarParts.size > 0 && !targetFiles['assets/minecraft/textures/gui/sprites/hud/hotbar.png']) {
    const entries: Array<{ bytes: Uint8Array; box: CropBox }> = [];
    const startCap = pendingBedrockHotbarParts.get('textures/ui/hotbar_start_cap.png');
    if (startCap) entries.push({ bytes: startCap, box: HOTBAR_SLICE_MAPPINGS['textures/ui/hotbar_start_cap.png'] });
    const slot0 = pendingBedrockHotbarParts.get('textures/ui/hotbar_0.png');
    for (let i = 0; i < 9; i++) {
      const slotKey = `textures/ui/hotbar_${i}.png`;
      const slotBytes = pendingBedrockHotbarParts.get(slotKey) ?? slot0;
      if (slotBytes) entries.push({ bytes: slotBytes, box: HOTBAR_SLICE_MAPPINGS[slotKey] });
    }
    const endCap = pendingBedrockHotbarParts.get('textures/ui/hotbar_end_cap.png');
    if (endCap) entries.push({ bytes: endCap, box: HOTBAR_SLICE_MAPPINGS['textures/ui/hotbar_end_cap.png'] });

    const stitchedHotbar = await composeGuiSpriteSheet(entries, 182, 22);
    if (stitchedHotbar) {
      const outPath = 'assets/minecraft/textures/gui/sprites/hud/hotbar.png';
      targetFiles[outPath] = [stitchedHotbar, { level: getFileCompressionLevel(outPath) }];
      allTargetTextures.add(outPath);
      report.convertedCount++;
      report.details.push({ filename: 'textures/ui/hotbar_*.png', status: 'converted', outputPath: outPath });
    } else {
      report.errorCount++;
      report.details.push({ filename: 'textures/ui/hotbar_*.png', status: 'error', reason: 'Failed to decode Bedrock hotbar textures' });
    }
  }

  for (const sheet of pendingBedrockLegacyGuiSheets) {
    const sheetSpec = getJavaSheetToModernSprites(sheet.relativePath, 15, targetJavaVersion.packFormat);
    if (!sheetSpec) continue;
    try {
      const sliced = await processGuiSpriteSheet(sheet.bytes, sheetSpec.mappings, { skipTransparent: true });
      if (Object.keys(sliced).length === 0) {
        report.skippedCount++;
        report.details.push({ filename: sheet.sourcePath, status: 'skipped', reason: 'No non-transparent GUI sprites found in sheet' });
      } else {
        writeSlicedOutputs(sheet.sourcePath, sliced, sheetSpec.mcmetas);
      }
    } catch (e) {
      console.warn('Failed to slice Bedrock GUI spritesheet:', e);
      report.errorCount++;
      report.details.push({ filename: sheet.sourcePath, status: 'error', reason: 'GUI image processing failed' });
    }
  }

  const composeLegacyJavaSheet = async (
    sheet: 'icons' | 'widgets' | 'bars',
    outPath: string,
    allowWithoutBase: boolean
  ) => {
    const base = pendingGuiSheetBases[sheet];
    const entries = pendingGuiSheetEntries[sheet];
    if (!base && entries.length === 0) return;
    if (!base && !allowWithoutBase) {
      for (const e of entries) {
        report.skippedCount++;
        report.details.push({
          filename: e.sourcePath,
          status: 'skipped',
          reason: 'Skipped widgets.png synthesis (menu button textures missing)',
        });
      }
      return;
    }
    // shortcut: cannot bundle copyrighted vanilla Java GUI sheets, so base-less synthesis leaves unprovided sprites transparent; require bundled/user base if full vanilla fallback is ever needed.
    const composed = entries.length > 0 ? await composeGuiSpriteSheet(entries, 256, 256, base) : (base ?? null);
    if (composed) {
      targetFiles[outPath] = [composed, { level: getFileCompressionLevel(outPath) }];
      allTargetTextures.add(outPath);
      report.convertedCount++;
      report.details.push({
        filename: base ? outPath : `gui_${sheet}_sprites`,
        status: 'converted',
        outputPath: outPath,
        ...(!base ? { reason: 'Synthesized partial legacy GUI sheet without base (unprovided sprites are transparent)' } : {}),
      });
    } else {
      report.errorCount++;
      report.details.push({
        filename: base ? outPath : `gui_${sheet}_sprites`,
        status: 'error',
        reason: 'Failed to decode GUI sheet or sprites',
      });
    }
  };

  await composeLegacyJavaSheet('icons', 'assets/minecraft/textures/gui/icons.png', true);
  await composeLegacyJavaSheet('widgets', 'assets/minecraft/textures/gui/widgets.png', hasWidgetButtonSprite);
  await composeLegacyJavaSheet('bars', 'assets/minecraft/textures/gui/bars.png', true);

  // Container GUI Composition Phase
  if (direction === 'java-to-bedrock' && pendingJavaContainers.size > 0) {
    const extracted = await extractBedrockContainerAssetsFromJava(pendingJavaContainers, targetBedrockVersion.minEngineVersion, sourcePackFormat);
    const sourcesWithOutputs = new Set<string>();
    for (const item of extracted) {
      sourcesWithOutputs.add(item.sourcePath);
      if (targetFiles[item.outPath] || !isSafePath(item.outPath)) continue;
      targetFiles[item.outPath] = [item.bytes, { level: getFileCompressionLevel(item.outPath) }];
      allTargetTextures.add(item.outPath);
      report.convertedCount++;
      report.details.push({ filename: item.sourcePath, status: 'converted', outputPath: item.outPath });
    }
    const hasSharedTheme = Boolean(targetFiles['textures/ui/dialog_background_opaque.png']);
    for (const [relPath, entry] of pendingJavaContainers.entries()) {
      if (!sourcesWithOutputs.has(entry.sourcePath)) {
        report.skippedCount++;
        report.details.push({
          filename: entry.sourcePath,
          status: 'skipped',
          reason:
            hasSharedTheme && isSharedBedrockThemeContainer(relPath)
              ? 'Covered by shared Bedrock container theme (dialog_background_opaque / cell_image)'
              : 'No Bedrock container UI mapping for this sheet',
        });
      }
    }
  } else if (direction === 'bedrock-to-java' && options.enableGuiConversion && pendingBedrockContainerUi.size > 0) {
    const partBytes = new Map<string, Uint8Array>();
    for (const [normPath, entry] of pendingBedrockContainerUi.entries()) {
      partBytes.set(normPath, entry.bytes);
    }
    const synthesized = await synthesizeJavaContainersFromBedrock(partBytes, targetJavaVersion.packFormat);
    for (const [outPath, outBytes] of Object.entries(synthesized)) {
      if (isSafePath(outPath) && isValidJavaAssetPath(outPath) && !targetFiles[outPath]) {
        targetFiles[outPath] = [outBytes, { level: getFileCompressionLevel(outPath) }];
        allTargetTextures.add(outPath);
        report.convertedCount++;
        report.details.push({ filename: 'textures/ui/dialog_background_opaque.png', status: 'converted', outputPath: outPath });
      }
    }
  } else if (direction === 'java-to-java' && (pendingJavaContainerBases.size > 0 || pendingJavaContainerSprites.size > 0)) {
    for (const [sheetPath, base] of pendingJavaContainerBases.entries()) {
      const entries = pendingJavaContainerSprites.get(sheetPath) ?? [];
      const outBytes = entries.length > 0 ? (await composeGuiSpriteSheet(entries, base.sheetW, base.sheetH, base.bytes)) ?? base.bytes : base.bytes;
      if (isSafePath(sheetPath) && isValidJavaAssetPath(sheetPath) && !targetFiles[sheetPath]) {
        targetFiles[sheetPath] = [outBytes, { level: getFileCompressionLevel(sheetPath) }];
        allTargetTextures.add(sheetPath);
        report.convertedCount++;
        report.details.push({ filename: base.sourcePath, status: 'converted', outputPath: sheetPath });
      }
    }
    for (const [sheetPath, entries] of pendingJavaContainerSprites.entries()) {
      if (pendingJavaContainerBases.has(sheetPath)) continue;
      for (const entry of entries) {
        report.skippedCount++;
        report.details.push({
          filename: entry.sourcePath,
          status: 'skipped',
          reason: 'Skipped container sheet synthesis (base container PNG missing)',
        });
      }
    }
  }

  // Custom Sky Composition Phase
  if (direction === 'java-to-bedrock' && pendingJavaSkyFiles.size > 0) {
    let lowerSourceMap: Map<string, Uint8Array> | null = null;
    const readPackFile = (relPath: string): Uint8Array | null => {
      if (!isSafePath(relPath)) return null;
      const direct = sourceFiles[`${packRoot}${relPath}`];
      if (direct) return direct;
      if (!lowerSourceMap) {
        lowerSourceMap = new Map<string, Uint8Array>();
        for (const [k, v] of Object.entries(sourceFiles)) {
          if (k.startsWith(packRoot)) {
            lowerSourceMap.set(k.slice(packRoot.length).toLowerCase(), v);
          }
        }
      }
      return lowerSourceMap.get(relPath.toLowerCase()) ?? null;
    };

    const skyResult = await convertJavaSkyToBedrockCubemap(pendingJavaSkyFiles, readPackFile);
    if (skyResult) {
      for (const [outPath, outBytes] of Object.entries(skyResult.files)) {
        if (!isSafePath(outPath)) continue;
        targetFiles[outPath] = [outBytes, { level: getFileCompressionLevel(outPath) }];
        allTargetTextures.add(outPath);
        report.convertedCount++;
        report.details.push({ filename: skyResult.selectedSourcePath, status: 'converted', outputPath: outPath });
      }
      for (const [rel, entry] of pendingJavaSkyFiles.entries()) {
        if (rel === skyResult.selectedRelPath) continue;
        report.skippedCount++;
        let reason = 'Bedrock supports a single overworld cubemap (secondary sky layer skipped)';
        if (/(?:^|\/)(sun|moon_phases)\.properties$/i.test(rel)) {
          reason = 'OptiFine celestial properties are not supported by vanilla Bedrock';
        } else if (rel === skyResult.selectedPropertiesRelPath) {
          reason = 'Sky properties applied to Bedrock overworld cubemap';
        }
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason });
      }
    } else {
      for (const entry of pendingJavaSkyFiles.values()) {
        report.skippedCount++;
        report.details.push({
          filename: entry.sourcePath,
          status: 'skipped',
          reason: 'No compatible 3x2 OptiFine/MCPatcher skybox found',
        });
      }
    }
  } else if (direction === 'bedrock-to-java' && pendingBedrockCubemap.size > 0) {
    const faceMap = new Map<number, Uint8Array>();
    for (const [idx, entry] of pendingBedrockCubemap.entries()) {
      faceMap.set(idx, entry.bytes);
    }
    const javaSky = await composeBedrockCubemapToOptiFineSky(faceMap, targetJavaVersion.packFormat);
    if (
      javaSky &&
      isSafePath(javaSky.pngPath) &&
      isValidJavaAssetPath(javaSky.pngPath) &&
      isSafePath(javaSky.propertiesPath) &&
      isValidJavaAssetPath(javaSky.propertiesPath)
    ) {
      targetFiles[javaSky.pngPath] = [javaSky.pngBytes, { level: getFileCompressionLevel(javaSky.pngPath) }];
      allTargetTextures.add(javaSky.pngPath);
      targetFiles[javaSky.propertiesPath] = [
        strToU8(javaSky.propertiesContent),
        { level: getFileCompressionLevel(javaSky.propertiesPath) },
      ];
      report.convertedCount += 2;
      report.details.push({
        filename: 'textures/environment/overworld_cubemap/cubemap_*.png',
        status: 'converted',
        outputPath: javaSky.pngPath,
      });
      report.details.push({
        filename: 'textures/environment/overworld_cubemap/cubemap_*.png',
        status: 'converted',
        outputPath: javaSky.propertiesPath,
      });
    } else {
      report.errorCount++;
      report.details.push({
        filename: 'textures/environment/overworld_cubemap/cubemap_*.png',
        status: 'error',
        reason: 'Failed to decode Bedrock overworld cubemap',
      });
    }
  }

  // Grass block side composition phase (Java grass_block_side + _overlay -> Bedrock grass_side.tga)
  if (direction === 'java-to-bedrock' && (pendingJavaGrassSide || pendingJavaGrassSideOverlay)) {
    const grassTga = compositeJavaGrassSideToBedrockTga(
      pendingJavaGrassSide?.bytes ?? null,
      pendingJavaGrassSideOverlay?.bytes ?? null
    );
    const sourceLabel = pendingJavaGrassSide?.sourcePath ?? pendingJavaGrassSideOverlay!.sourcePath;
    if (grassTga) {
      const outPath = 'textures/blocks/grass_side.tga';
      targetFiles[outPath] = [grassTga, { level: getFileCompressionLevel(outPath) }];
      allTargetTextures.add(outPath);
      report.convertedCount++;
      report.details.push({ filename: sourceLabel, status: 'converted', outputPath: outPath });
    }
    if (pendingJavaGrassSide) {
      const carriedPath = 'textures/blocks/grass_side_carried.png';
      targetFiles[carriedPath] = [pendingJavaGrassSide.bytes, { level: getFileCompressionLevel(carriedPath) }];
      allTargetTextures.add(carriedPath);
      report.convertedCount++;
      report.details.push({ filename: pendingJavaGrassSide.sourcePath, status: 'converted', outputPath: carriedPath });
    }
  }

  // Dial Item Composition / Slicing Phase (compass, recovery_compass, clock)
  if (direction === 'java-to-bedrock') {
    for (const spec of Object.values(DIAL_ITEM_SPECS)) {
      const framesMap = pendingJavaDialFrames.get(spec.kind);
      const strip = pendingJavaDialStrips.get(spec.kind);
      if ((!framesMap || framesMap.size === 0) && !strip) continue;

      const sourceLabels: string[] = [];
      if (framesMap) {
        for (const f of framesMap.values()) sourceLabels.push(f.sourcePath);
      }
      if (strip) sourceLabels.push(strip.sourcePath);
      const primarySource = sourceLabels[0];

      if (spec.bedrockMinEngine && compareBedrockVersion(targetBedrockVersion.minEngineVersion, spec.bedrockMinEngine) < 0) {
        for (const src of sourceLabels) {
          report.skippedCount++;
          report.details.push({ filename: src, status: 'skipped', reason: 'Unsupported in target Bedrock version' });
        }
        continue;
      }

      let result: { atlasPng: Uint8Array; iconPng: Uint8Array } | null = null;
      if (framesMap && framesMap.size > 0) {
        const rawFrames = new Map<number, Uint8Array>();
        for (const [idx, f] of framesMap.entries()) rawFrames.set(idx, f.bytes);
        result = stitchDialAtlas(rawFrames, spec);
      } else if (strip) {
        const sliced = sliceDialAtlas(strip.bytes, spec);
        if (sliced) {
          result = { atlasPng: sliced.stripPng, iconPng: sliced.iconPng };
        }
      }

      if (result) {
        for (const atlasPath of spec.bedrockAtlasPaths) {
          if (isSafePath(atlasPath) && !targetFiles[atlasPath]) {
            targetFiles[atlasPath] = [result.atlasPng, { level: getFileCompressionLevel(atlasPath) }];
            allTargetTextures.add(atlasPath);
            report.convertedCount++;
            report.details.push({ filename: primarySource, status: 'converted', outputPath: atlasPath });
          }
        }
        for (const icon of spec.bedrockIcons) {
          if (isSafePath(icon.path) && !targetFiles[icon.path]) {
            targetFiles[icon.path] = [result.iconPng, { level: getFileCompressionLevel(icon.path) }];
            allTargetTextures.add(icon.path);
            extraItemTextureEntries[icon.itemTextureKey] = icon.path.replace(/\.png$/i, '');
            report.convertedCount++;
            report.details.push({ filename: primarySource, status: 'converted', outputPath: icon.path });
          }
        }
      } else {
        for (const src of sourceLabels) {
          report.skippedCount++;
          report.details.push({ filename: src, status: 'skipped', reason: 'Failed to decode dial texture' });
        }
      }
    }
  } else if (direction === 'bedrock-to-java') {
    for (const iconEntry of pendingBedrockDialIcons) {
      report.skippedCount++;
      report.details.push({ filename: iconEntry.sourcePath, status: 'skipped', reason: 'Bedrock static dial icon (Java uses *_atlas frames)' });
    }
    for (const [kind, entry] of pendingBedrockDialAtlases.entries()) {
      const spec = DIAL_ITEM_SPECS[kind];
      if (targetJavaVersion.packFormat < spec.javaMinPackFormat) {
        report.skippedCount++;
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason: 'Unsupported in target Java version' });
        continue;
      }
      const sliced = sliceDialAtlas(entry.bytes, spec);
      if (!sliced) {
        report.skippedCount++;
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason: 'Invalid or corrupt dial atlas texture' });
        continue;
      }
      if (targetJavaVersion.packFormat === 1) {
        const outPath = `assets/minecraft/textures/items/${spec.javaBase}.png`;
        if (isSafePath(outPath) && !targetFiles[outPath]) {
          targetFiles[outPath] = [sliced.stripPng, { level: getFileCompressionLevel(outPath) }];
          allTargetTextures.add(outPath);
          report.convertedCount++;
          report.details.push({ filename: entry.sourcePath, status: 'converted', outputPath: outPath });
        }
      } else {
        const dir = targetJavaVersion.packFormat <= 3 ? 'assets/minecraft/textures/items' : 'assets/minecraft/textures/item';
        for (let i = 0; i < sliced.frames.length; i++) {
          const outPath = `${dir}/${spec.javaBase}_${String(i).padStart(2, '0')}.png`;
          if (isSafePath(outPath) && isValidJavaAssetPath(outPath) && !targetFiles[outPath]) {
            targetFiles[outPath] = [sliced.frames[i], { level: getFileCompressionLevel(outPath) }];
            allTargetTextures.add(outPath);
            report.convertedCount++;
            report.details.push({ filename: entry.sourcePath, status: 'converted', outputPath: outPath });
          }
        }
      }
    }
  } else if (direction === 'java-to-java') {
    if (sourcePackFormat === 1 && targetJavaVersion.packFormat >= 2) {
      const dir = targetJavaVersion.packFormat <= 3 ? 'assets/minecraft/textures/items' : 'assets/minecraft/textures/item';
      for (const [kind, strip] of pendingJavaDialStrips.entries()) {
        const spec = DIAL_ITEM_SPECS[kind];
        const sliced = sliceDialAtlas(strip.bytes, spec);
        if (!sliced) {
          report.skippedCount++;
          report.details.push({ filename: strip.sourcePath, status: 'skipped', reason: 'Invalid or corrupt dial strip texture' });
          continue;
        }
        for (let i = 0; i < sliced.frames.length; i++) {
          const outPath = `${dir}/${spec.javaBase}_${String(i).padStart(2, '0')}.png`;
          if (isSafePath(outPath) && isValidJavaAssetPath(outPath) && !targetFiles[outPath]) {
            targetFiles[outPath] = [sliced.frames[i], { level: getFileCompressionLevel(outPath) }];
            allTargetTextures.add(outPath);
            report.convertedCount++;
            report.details.push({ filename: strip.sourcePath, status: 'converted', outputPath: outPath });
          }
        }
      }
    } else if (sourcePackFormat >= 2 && targetJavaVersion.packFormat === 1) {
      for (const [kind, framesMap] of pendingJavaDialFrames.entries()) {
        const spec = DIAL_ITEM_SPECS[kind];
        if (spec.javaMinPackFormat > 1) {
          for (const f of framesMap.values()) {
            report.skippedCount++;
            report.details.push({ filename: f.sourcePath, status: 'skipped', reason: 'Unsupported in target Java version' });
          }
          continue;
        }
        const rawFrames = new Map<number, Uint8Array>();
        let firstSource = '';
        for (const [idx, f] of framesMap.entries()) {
          if (!firstSource) firstSource = f.sourcePath;
          rawFrames.set(idx, f.bytes);
        }
        const stitched = stitchDialAtlas(rawFrames, spec);
        if (stitched) {
          const outPath = `assets/minecraft/textures/items/${spec.javaBase}.png`;
          targetFiles[outPath] = [stitched.atlasPng, { level: getFileCompressionLevel(outPath) }];
          allTargetTextures.add(outPath);
          report.convertedCount++;
          report.details.push({ filename: firstSource, status: 'converted', outputPath: outPath });
        } else {
          for (const f of framesMap.values()) {
            report.skippedCount++;
            report.details.push({ filename: f.sourcePath, status: 'skipped', reason: 'Failed to decode dial texture' });
          }
        }
      }
    }
  }

  // Bedrock -> Java PBR Composition Phase (texture_set.json + MER/MERS/Normal/Heightmap -> LabPBR _s/_n)
  if (direction === 'bedrock-to-java' && options.enablePbrConversion && pendingBedrockPbrGroups.size > 0) {
    const convertedMerCache = new Map<string, Uint8Array | null>();
    for (const group of pendingBedrockPbrGroups.values()) {
      const baseJava = getTargetContext(group.baseBedrockTexturePath, 'bedrock-to-java');
      if (!baseJava) {
        for (const src of [group.textureSetSourcePath, group.colorAliasFile?.sourcePath, group.merFile?.sourcePath, group.normalFile?.sourcePath, group.heightmapFile?.sourcePath]) {
          if (src) {
            report.skippedCount++;
            report.details.push({ filename: src, status: 'skipped', reason: 'Base texture for PBR map is unmapped' });
          }
        }
        continue;
      }

      const formattedBase = formatTargetJavaPath(baseJava);
      let producedAny = false;

      if (!targetFiles[formattedBase] && isSafePath(formattedBase) && isValidJavaAssetPath(formattedBase)) {
        if (group.colorAliasFile) {
          const rawColor = convertTgaToPng(group.colorAliasFile.bytes);
          const colorPng = rawColor ? normalizeJavaBlockAtlasPng(formattedBase, rawColor, decodePngToRgbaSync) : null;
          if (colorPng) {
            targetFiles[formattedBase] = [colorPng, { level: getFileCompressionLevel(formattedBase) }];
            allTargetTextures.add(formattedBase);
            const dims = getPngDimensions(colorPng);
            if (dims) javaOutputPngDims.set(formattedBase, dims);
            report.convertedCount++;
            report.details.push({ filename: group.colorAliasFile.sourcePath, status: 'converted', outputPath: formattedBase });
            producedAny = true;
          }
        } else if (group.colorUniform) {
          const colorPng = synthesizeUniformColorPng(16, 16, group.colorUniform);
          if (colorPng) {
            targetFiles[formattedBase] = [colorPng, { level: getFileCompressionLevel(formattedBase) }];
            allTargetTextures.add(formattedBase);
            javaOutputPngDims.set(formattedBase, { width: 16, height: 16 });
            report.convertedCount++;
            report.details.push({ filename: group.textureSetSourcePath || formattedBase, status: 'converted', outputPath: formattedBase });
            producedAny = true;
          }
        }
      }

      const specPath = formattedBase.replace(/\.png$/i, '_s.png');
      if (group.merFile) {
        const cacheKey = `${group.merFile.sourcePath}:${group.merFile.hasSubsurface ? 1 : 0}`;
        let rawSpecPng = convertedMerCache.get(cacheKey);
        if (rawSpecPng === undefined) {
          rawSpecPng = await convertBedrockMerToLabPbrSpec(group.merFile.bytes, group.merFile.hasSubsurface);
          convertedMerCache.set(cacheKey, rawSpecPng);
        }
        const specPng = rawSpecPng ? normalizeJavaBlockAtlasPng(specPath, rawSpecPng, decodePngToRgbaSync) : null;
        if (specPng && isSafePath(specPath) && isValidJavaAssetPath(specPath)) {
          const alreadyWritten = Boolean(targetFiles[specPath]);
          targetFiles[specPath] = [specPng, { level: getFileCompressionLevel(specPath) }];
          allTargetTextures.add(specPath);
          const dims = getPngDimensions(specPng);
          if (dims) javaOutputPngDims.set(specPath, dims);
          if (!alreadyWritten) report.convertedCount++;
          report.details.push({ filename: group.merFile.sourcePath, status: 'converted', outputPath: specPath });
          producedAny = true;
        } else {
          report.skippedCount++;
          report.details.push({ filename: group.merFile.sourcePath, status: 'skipped', reason: 'Failed to decode Bedrock MER map' });
        }
      } else if (group.merUniform) {
        const targetDims = javaOutputPngDims.get(formattedBase) ?? { width: 16, height: 16 };
        const rawSpecPng = synthesizeUniformLabPbrSpec(targetDims.width, targetDims.height, group.merUniform.values, group.merUniform.hasSubsurface);
        const specPng = rawSpecPng ? normalizeJavaBlockAtlasPng(specPath, rawSpecPng, decodePngToRgbaSync) : null;
        if (specPng && isSafePath(specPath) && isValidJavaAssetPath(specPath)) {
          const alreadyWritten = Boolean(targetFiles[specPath]);
          targetFiles[specPath] = [specPng, { level: getFileCompressionLevel(specPath) }];
          allTargetTextures.add(specPath);
          const dims = getPngDimensions(specPng);
          if (dims) javaOutputPngDims.set(specPath, dims);
          if (!alreadyWritten) report.convertedCount++;
          report.details.push({ filename: group.textureSetSourcePath || specPath, status: 'converted', outputPath: specPath });
          producedAny = true;
        }
      }

      const normPath = formattedBase.replace(/\.png$/i, '_n.png');
      if (group.normalFile || group.heightmapFile) {
        const rawNormBytes = group.normalFile
          ? await convertBedrockNormalToLabPbr(group.normalFile.bytes, group.heightmapFile?.bytes)
          : await convertBedrockHeightmapToLabPbr(group.heightmapFile!.bytes);
        const normBytes = rawNormBytes ? normalizeJavaBlockAtlasPng(normPath, rawNormBytes, decodePngToRgbaSync) : null;
        const primaryNormSrc = group.normalFile?.sourcePath || group.heightmapFile!.sourcePath;
        if (normBytes && isSafePath(normPath) && isValidJavaAssetPath(normPath)) {
          const alreadyWritten = Boolean(targetFiles[normPath]);
          targetFiles[normPath] = [normBytes, { level: getFileCompressionLevel(normPath) }];
          allTargetTextures.add(normPath);
          const dims = getPngDimensions(normBytes);
          if (dims) javaOutputPngDims.set(normPath, dims);
          if (!alreadyWritten) report.convertedCount++;
          report.details.push({ filename: primaryNormSrc, status: 'converted', outputPath: normPath });
          if (group.normalFile && group.heightmapFile) {
            report.details.push({ filename: group.heightmapFile.sourcePath, status: 'converted', outputPath: normPath });
          }
          producedAny = true;
        } else {
          report.skippedCount++;
          report.details.push({ filename: primaryNormSrc, status: 'skipped', reason: 'Failed to decode Bedrock normal/height map' });
        }
      }

      if (group.textureSetSourcePath) {
        report.skippedCount++;
        report.details.push({
          filename: group.textureSetSourcePath,
          status: 'skipped',
          reason: group.parsedTs && producedAny
            ? 'PBR texture_set metadata applied to _s/_n maps'
            : 'Unmapped PBR texture_set reference'
        });
      }
    }
  }

  // 3D Custom Model & Entity Geometry Conversion Phase (Deferred for cross-file parent/.jpm/:parent inheritance)
  if (direction === 'bedrock-to-java' && options.enableModelConversion && pendingBedrockModels.length > 0) {
    const externalGeometries = new Map<string, ExtractedBedrockGeometry>();
    for (const entry of pendingBedrockModels) {
      for (const g of extractBedrockGeometriesFromJson(entry.rawText)) {
        externalGeometries.set(g.baseIdentifier.toLowerCase(), g);
        externalGeometries.set(g.identifier.toLowerCase(), g);
      }
    }

    for (const entry of pendingBedrockModels) {
      const outputs = bedrockToJavaModels(entry.rawText, entry.relativePath, {
        targetPackFormat: targetJavaVersion.packFormat,
        externalGeometries,
      });
      if (outputs.length === 0) {
        report.skippedCount++;
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason: 'Unsupported or empty Bedrock geometry' });
        continue;
      }
      let wroteAny = false;
      for (const out of outputs) {
        if (!isSafePath(out.outputPath) || !isValidJavaAssetPath(out.outputPath)) continue;
        const alreadyWritten = Boolean(targetFiles[out.outputPath]);
        targetFiles[out.outputPath] = [strToU8(out.content), { level: getFileCompressionLevel(out.outputPath) }];
        if (!alreadyWritten) report.convertedCount++;
        report.details.push({
          filename: entry.sourcePath,
          status: 'converted',
          outputPath: out.outputPath,
          ...(out.warning ? { warning: true, reason: out.warning } : {}),
        });
        wroteAny = true;
      }
      if (!wroteAny) {
        report.skippedCount++;
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason: 'Invalid or unsafe target model path' });
      }
    }
  } else if (direction === 'java-to-bedrock' && options.enableModelConversion && pendingJavaModels.length > 0) {
    const javaModelIndex = new Map<string, string>();
    const javaJpmIndex = new Map<string, { sourcePath: string; rawText: string }>();
    const consumedJpms = new Map<string, string>();

    for (const entry of pendingJavaModels) {
      const lowerRel = entry.relativePath.toLowerCase();
      if (isJavaCemPartPath(entry.relativePath)) {
        const cemRel = lowerRel.replace(/^assets\/minecraft\/(?:optifine|mcpatcher)\/cem\//, '');
        javaJpmIndex.set(cemRel, { sourcePath: entry.sourcePath, rawText: entry.rawText });
      } else if (lowerRel.startsWith('assets/minecraft/models/') && lowerRel.endsWith('.json')) {
        const modelRef = lowerRel.slice('assets/minecraft/models/'.length, -'.json'.length);
        javaModelIndex.set(modelRef, entry.rawText);
      }
    }

    const resolveParent = (parentRef: string): string | null => {
      const clean = parentRef.trim().replace(/^minecraft:/i, '').replace(/\.json$/i, '').toLowerCase();
      return javaModelIndex.get(clean) ?? null;
    };

    for (const entry of pendingJavaModels) {
      if (isJavaCemPartPath(entry.relativePath)) continue;

      const lowerRel = entry.relativePath.toLowerCase();
      let modelId = '';
      let outGeoPath = '';

      if (lowerRel.startsWith('assets/minecraft/models/block/')) {
        const sub = lowerRel.slice('assets/minecraft/models/block/'.length, -'.json'.length);
        const safeSub = sub.replace(/[^a-z0-9_./-]/g, '_');
        modelId = `block_${safeSub}`;
        outGeoPath = `models/entity/block_${safeSub}.geo.json`;
      } else if (lowerRel.startsWith('assets/minecraft/models/item/')) {
        const sub = lowerRel.slice('assets/minecraft/models/item/'.length, -'.json'.length);
        const safeSub = sub.replace(/[^a-z0-9_./-]/g, '_');
        modelId = `item_${safeSub}`;
        outGeoPath = `models/entity/item_${safeSub}.geo.json`;
      } else if (lowerRel.startsWith('assets/minecraft/models/')) {
        const sub = lowerRel.slice('assets/minecraft/models/'.length, -'.json'.length);
        const safeSub = sub.replace(/[^a-z0-9_./-]/g, '_');
        modelId = safeSub;
        outGeoPath = `models/entity/${safeSub}.geo.json`;
      } else {
        const sub = lowerRel.replace(/^assets\/minecraft\/(?:optifine|mcpatcher)\/cem\//, '').replace(/\.jem$/i, '');
        const safeSub = sub.replace(/[^a-z0-9_./-]/g, '_');
        modelId = safeSub;
        outGeoPath = `models/entity/${safeSub}.geo.json`;
      }

      const jemDir = lowerRel.replace(/^assets\/minecraft\/(?:optifine|mcpatcher)\/cem\//, '').split('/').slice(0, -1).join('/');
      const resolveJpm = (jpmRef: string): string | null => {
        const cleanRef = jpmRef.trim().replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
        const candidate = jemDir ? `${jemDir}/${cleanRef}` : cleanRef;
        const hitKey = javaJpmIndex.has(candidate) ? candidate : javaJpmIndex.has(cleanRef) ? cleanRef : null;
        if (!hitKey) return null;
        consumedJpms.set(hitKey, outGeoPath);
        return javaJpmIndex.get(hitKey)!.rawText;
      };

      const res = javaToBedrockGeometryDetailed(entry.rawText, modelId, {
        targetBedrockMinEngine: targetBedrockVersion.minEngineVersion,
        resolveParent,
        resolveJpm,
      });

      if (res && isSafePath(outGeoPath)) {
        const alreadyWritten = Boolean(targetFiles[outGeoPath]);
        targetFiles[outGeoPath] = [strToU8(res.content), { level: getFileCompressionLevel(outGeoPath) }];
        if (!alreadyWritten) report.convertedCount++;
        report.details.push({
          filename: entry.sourcePath,
          status: 'converted',
          outputPath: outGeoPath,
          ...(res.warning ? { warning: true, reason: res.warning } : {}),
        });
      } else {
        report.skippedCount++;
        report.details.push({ filename: entry.sourcePath, status: 'skipped', reason: 'Model has no custom elements/cubes to convert' });
      }
    }

    for (const [jpmKey, jpmEntry] of javaJpmIndex.entries()) {
      const consumerOut = consumedJpms.get(jpmKey);
      if (consumerOut) {
        report.details.push({ filename: jpmEntry.sourcePath, status: 'converted', outputPath: consumerOut });
      } else {
        report.skippedCount++;
        report.details.push({ filename: jpmEntry.sourcePath, status: 'skipped', reason: 'Unreferenced OptiFine CEM part (.jpm)' });
      }
    }
  }

  // Finalization Phase
  // Only synthesize and append metadata if there was at least one legitimately converted pack file
  if (report.convertedCount > 0) {
    if (direction === 'java-to-bedrock') {
      const terrainTextureJson = convertedBlockTextures.size > 0 ? generateTerrainTexture(convertedBlockTextures) : null;
      if (terrainTextureJson) {
        targetFiles['textures/terrain_texture.json'] = [strToU8(terrainTextureJson), { level: 1 }];
        report.convertedCount++;
      }

      const itemTextureJson = (convertedItemTextures.size > 0 || Object.keys(extraItemTextureEntries).length > 0)
        ? generateItemTexture(convertedItemTextures, extraItemTextureEntries)
        : null;
      if (itemTextureJson) {
        targetFiles['textures/item_texture.json'] = [strToU8(itemTextureJson), { level: 1 }];
        report.convertedCount++;
      }

      // Validating flipbook textures: Bedrock crashes if atlas_tile is not in terrain_texture
      if (pendingBedrockFlipbooks.length > 0) {
        const validAtlasTiles = new Set<string>();
        if (terrainTextureJson) {
          try {
            const parsed = JSON.parse(terrainTextureJson);
            Object.keys(parsed.texture_data || {}).forEach(k => validAtlasTiles.add(k));
          } catch { }
        }

        const safeFlipbooks: FlipbookEntry[] = [];
        const seenFlipbookKeys = new Set<string>();
        for (const { sourcePath, entry } of pendingBedrockFlipbooks) {
          if (!validAtlasTiles.has(entry.atlas_tile)) {
            report.skippedCount++;
            report.details.push({ filename: sourcePath, status: 'skipped', reason: 'Matching block texture not found in terrain atlas' });
            continue;
          }
          const expanded = expandBedrockFlipbookEntry(entry);
          let addedAny = false;
          for (const item of expanded) {
            const dedupeKey = `${item.atlas_tile}:${item.atlas_index ?? 0}`;
            if (seenFlipbookKeys.has(dedupeKey)) continue;
            seenFlipbookKeys.add(dedupeKey);
            safeFlipbooks.push(item);
            addedAny = true;
          }
          if (addedAny) {
            report.convertedCount++;
            report.details.push({ filename: sourcePath, status: 'converted', outputPath: 'textures/flipbook_textures.json' });
          }
        }

        if (safeFlipbooks.length > 0) {
          targetFiles['textures/flipbook_textures.json'] = [strToU8(JSON.stringify(safeFlipbooks, null, 2)), { level: 1 }];
          report.convertedCount++;
        }
      }

      if (allTargetTextures.size > 0) {
        targetFiles['textures/textures_list.json'] = [strToU8(JSON.stringify(Array.from(allTargetTextures), null, 2)), { level: 1 }];
        report.convertedCount++;
      }
      if (supportedLanguages.size > 0) {
        targetFiles['texts/languages.json'] = [strToU8(JSON.stringify(Array.from(supportedLanguages), null, 2)), { level: 1 }];
        report.convertedCount++;
      }
      for (const [tPath, entries] of mergedLangs.entries()) {
        if (isSafePath(tPath)) {
          targetFiles[tPath] = [strToU8(serializeLangEntries(entries)), { level: 1 }];
        }
      }

      if (options.enablePbrConversion && bedrockPbrSets.size > 0) {
        for (const [baseNoExt, meta] of bedrockPbrSets.entries()) {
          const tsPath = `${baseNoExt}.texture_set.json`;
          if (isSafePath(tsPath)) {
            const tsContent = generateBedrockTextureSetJson(meta.baseName, {
              hasMer: meta.hasMer,
              hasSubsurface: meta.hasSubsurface,
              hasNormal: meta.hasNormal,
              hasHeightmap: meta.hasHeightmap
            });
            targetFiles[tsPath] = [strToU8(tsContent), { level: getFileCompressionLevel(tsPath) }];
            report.convertedCount++;
          }
        }
      }

      const pbrCapabilities =
        options.enablePbrConversion &&
        bedrockPbrSets.size > 0 &&
        compareBedrockVersion(targetBedrockVersion.minEngineVersion, [1, 16, 0]) >= 0
          ? ['raytraced']
          : undefined;

      // Ensure manifest.json exists (and include PBR capabilities when applicable)
      if (!targetFiles['manifest.json']) {
        const manifestStr = generateManifestContent(
          packName,
          packDescription,
          headerUuid,
          moduleUuid,
          targetBedrockVersion.minEngineVersion,
          pbrCapabilities
        );
        targetFiles['manifest.json'] = [strToU8(manifestStr), { level: getFileCompressionLevel('manifest.json') }];
        report.convertedCount++;
        report.details.push({ filename: 'pack.mcmeta', status: 'converted', outputPath: 'manifest.json', reason: 'Generated fallback manifest' });
      } else if (pbrCapabilities) {
        const manifestStr = generateManifestContent(
          packName,
          packDescription,
          headerUuid,
          moduleUuid,
          targetBedrockVersion.minEngineVersion,
          pbrCapabilities
        );
        targetFiles['manifest.json'] = [strToU8(manifestStr), { level: getFileCompressionLevel('manifest.json') }];
      }
    } else if (direction === 'bedrock-to-java' || direction === 'java-to-java') {
      if (direction === 'bedrock-to-java') {
        for (const { sourcePath, javaPngPath, entry } of pendingJavaFlipbooks) {
          const dims = javaOutputPngDims.get(javaPngPath);
          if (!dims) continue;
          const isConduitWind = /^assets\/minecraft\/textures\/entity\/conduit\/wind(?:_vertical)?\.png$/.test(javaPngPath);
          const frameH = isConduitWind ? Math.floor(dims.width / 2) : dims.width;
          if (frameH <= 0 || dims.height <= frameH || dims.height % frameH !== 0) continue;
          const mcmetaPath = `${javaPngPath}.mcmeta`;
          if (writtenJavaMcmetas.has(mcmetaPath) || !isSafePath(mcmetaPath) || !isValidJavaAssetPath(mcmetaPath)) continue;
          const frameCount = dims.height / frameH;
          const sanitizedEntry: FlipbookEntry = {
            ...entry,
            frames: Array.isArray(entry.frames)
              ? entry.frames.filter(f => typeof f === 'number' && Number.isInteger(f) && f >= 0 && f < frameCount)
              : undefined
          };
          const mcmetaContent = generateJavaAnimation(sanitizedEntry, isConduitWind ? frameH : undefined);
          targetFiles[mcmetaPath] = [strToU8(mcmetaContent), { level: getFileCompressionLevel(mcmetaPath) }];
          writtenJavaMcmetas.set(mcmetaPath, mcmetaContent);
          report.convertedCount++;
          report.details.push({ filename: sourcePath, status: 'converted', outputPath: mcmetaPath });
        }

        for (const [pngPath, dims] of javaOutputPngDims.entries()) {
          if (!/^assets\/minecraft\/textures\/(blocks?|items?|entity\/conduit)\//.test(pngPath)) continue;
          const isConduitWind = /^assets\/minecraft\/textures\/entity\/conduit\/wind(?:_vertical)?\.png$/.test(pngPath);
          if (isConduitWind) {
            const frameH = Math.floor(dims.width / 2);
            if (frameH <= 0 || dims.height <= frameH || dims.height % frameH !== 0) continue;
            const mcmetaPath = `${pngPath}.mcmeta`;
            if (writtenJavaMcmetas.has(mcmetaPath) || !isSafePath(mcmetaPath) || !isValidJavaAssetPath(mcmetaPath)) continue;
            const mcmetaContent = JSON.stringify({ animation: { frametime: 3, height: frameH } }, null, 2);
            targetFiles[mcmetaPath] = [strToU8(mcmetaContent), { level: getFileCompressionLevel(mcmetaPath) }];
            writtenJavaMcmetas.set(mcmetaPath, mcmetaContent);
            report.convertedCount++;
            report.details.push({ filename: pngPath, status: 'converted', outputPath: mcmetaPath });
            continue;
          }
          if (dims.height <= dims.width || dims.height % dims.width !== 0) continue;
          const mcmetaPath = `${pngPath}.mcmeta`;
          if (writtenJavaMcmetas.has(mcmetaPath) || !isSafePath(mcmetaPath) || !isValidJavaAssetPath(mcmetaPath)) continue;
          const baseMcmetaPath = pngPath.replace(/_[sn]\.png$/i, '.png.mcmeta');
          let fallbackMcmeta = writtenJavaMcmetas.get(baseMcmetaPath);
          if (fallbackMcmeta) {
            try {
              const parsed = JSON.parse(fallbackMcmeta);
              if (Array.isArray(parsed?.animation?.frames)) {
                const frameCount = dims.height / dims.width;
                const filtered = parsed.animation.frames.filter(
                  (f: unknown) => typeof f === 'number' && Number.isInteger(f) && f >= 0 && f < frameCount
                );
                if (filtered.length > 0) {
                  parsed.animation.frames = filtered;
                } else {
                  delete parsed.animation.frames;
                }
                fallbackMcmeta = JSON.stringify(parsed, null, 2);
              }
            } catch { }
          }
          const finalMcmeta = fallbackMcmeta || JSON.stringify({ animation: {} }, null, 2);
          targetFiles[mcmetaPath] = [strToU8(finalMcmeta), { level: getFileCompressionLevel(mcmetaPath) }];
          writtenJavaMcmetas.set(mcmetaPath, finalMcmeta);
          report.convertedCount++;
          report.details.push({ filename: pngPath, status: 'converted', outputPath: mcmetaPath });
        }
      }

      if (targetJavaVersion.packFormat >= 75) {
        for (const name of ['effect_background.png', 'effect_background_ambient.png']) {
          const spritePath = `assets/minecraft/textures/gui/sprites/container/inventory/${name}`;
          const mcmetaPath = `${spritePath}.mcmeta`;
          if (targetFiles[spritePath] && !targetFiles[mcmetaPath]) {
            targetFiles[mcmetaPath] = [strToU8(EFFECT_BG_MODERN_MCMETA), { level: getFileCompressionLevel(mcmetaPath) }];
            report.convertedCount++;
            report.details.push({ filename: spritePath, status: 'converted', outputPath: mcmetaPath });
          }
        }
      }

      if (!targetFiles['pack.mcmeta']) {
        const mcmetaStr = generateMcmetaContent(packDescription, targetJavaVersion.packFormat);
        targetFiles['pack.mcmeta'] = [strToU8(mcmetaStr), { level: getFileCompressionLevel('pack.mcmeta') }];
        report.convertedCount++;
        report.details.push({ filename: 'manifest.json', status: 'converted', outputPath: 'pack.mcmeta' });
      }
    }
  } else if (pendingBedrockFlipbooks.length > 0) {
    for (const { sourcePath } of pendingBedrockFlipbooks) {
      report.skippedCount++;
      report.details.push({ filename: sourcePath, status: 'skipped', reason: 'Matching block texture not found in terrain atlas' });
    }
  }

  // Ensure all directories exist for fflate (Bedrock zip parser requires explicit directory entries)
  const directories = new Set<string>();
  for (const file of Object.keys(targetFiles)) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join('/') + '/');
    }
  }
  for (const dir of directories) {
    if (!targetFiles[dir]) {
      targetFiles[dir] = [new Uint8Array(0), { level: 0 }];
    }
  }

  const outputBuffer = zipSync(targetFiles);
  return { buffer: outputBuffer, report };
}


