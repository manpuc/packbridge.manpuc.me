import JSZip from 'jszip';
import type { PackReport, ConversionOptions } from './types';
import { getTargetContext, loadMappings } from './rules';
import { extractFsb5 } from './fsb';
import { javaToBedrockLang, bedrockToJavaLang } from './processors/lang';
import { javaToBedrockSounds, bedrockToJavaSounds } from './processors/sounds';
import { generateBlocksJson, generateTerrainTexture } from './processors/blocks';
import { generateItemTexture } from './processors/items';
import { parseJavaAnimation, generateJavaAnimation, type FlipbookEntry } from './processors/animation';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from './versions';
import { normalizeLegacyPath, downgradeLegacyPath, migrateJavaPath } from './legacy';
import { generateUUID, generateManifestContent, generateMcmetaContent } from './metadata';
import {
  processGuiSpriteSheet,
  ICONS_MAPPINGS,
  WIDGETS_MAPPINGS,
  MODERN_GUI_SPRITE_JAVA_TO_BEDROCK,
  MODERN_GUI_SPRITE_BEDROCK_TO_JAVA
} from './processors/gui';
import { convertTgaToPng } from './processors/tga';
import { reencodeOgg } from './processors/audio';
import { javaToBedrockGeometry, bedrockToJavaModel, isBedrockModelPath, isJavaModelPath } from './processors/models';
import { compositeSnowyGrassSide } from './processors/grass';
import {
  classifyBedrockPbrPath,
  classifyJavaLabPbrPath,
  convertBedrockMerToLabPbrSpec,
  convertLabPbrSpecToBedrockMer,
  parseTextureSetJson,
  generateBedrockTextureSetJson
} from './processors/pbr';
import { isSafePath, MAX_SAFE_FILE_COUNT, MAX_SAFE_UNCOMPRESSED_BYTES, isSystemHiddenFile } from './security';

const MEDIA_EXTENSIONS = new Set(['.png', '.tga', '.ogg', '.wav', '.mp3', '.fsb', '.jpg', '.jpeg', '.webp']);

function getZipFileOptions(path: string): JSZip.JSZipFileOptions {
  const dotIdx = path.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = path.slice(dotIdx).toLowerCase();
    if (MEDIA_EXTENSIONS.has(ext)) {
      return { compression: 'STORE' };
    }
  }
  return { compression: 'DEFLATE', compressionOptions: { level: 1 } };
}

export async function convertPack(
  input: File | JSZip,
  options: ConversionOptions,
  fileName?: string
): Promise<{ blob: Blob; report: PackReport }> {
  const { direction } = options;

  // Load version specific mapping before processing
  await loadMappings(options.javaVersionId, options.bedrockVersionId);

  const sourceZip = input instanceof JSZip ? input : await JSZip.loadAsync(input);
  const targetZip = new JSZip();
  const report: PackReport = {
    totalFiles: 0,
    convertedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    details: [],
  };

  const files = Object.keys(sourceZip.files).filter(p => !sourceZip.files[p].dir && !p.endsWith('/'));
  if (files.length > MAX_SAFE_FILE_COUNT) {
    throw new Error(`Archive contains too many files (exceeds limit of ${MAX_SAFE_FILE_COUNT.toLocaleString()} files)`);
  }

  let totalUncompressed = 0;
  for (const p of files) {
    const rawData = (sourceZip.files[p] as any)._data;
    const uncompressedSize = typeof rawData?.uncompressedSize === 'number' ? rawData.uncompressedSize : 0;
    if (uncompressedSize > 0) {
      totalUncompressed += uncompressedSize;
      if (totalUncompressed > MAX_SAFE_UNCOMPRESSED_BYTES) {
        throw new Error(`Archive exceeds maximum uncompressed size limit (${(MAX_SAFE_UNCOMPRESSED_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB)`);
      }
    }
  }

  report.totalFiles = files.length;

  let packName = (fileName || (input instanceof File ? input.name : "pack")).replace(/\.(zip|mcpack)$/i, '');
  let packDescription: unknown = "Converted by PackBridge";
  let headerUuid = generateUUID();
  let moduleUuid = generateUUID();

  // Trackers for metadata generation
  const convertedBlockTextures = new Set<string>();
  const convertedItemTextures = new Set<string>();
  const allTargetTextures = new Set<string>();
  const supportedLanguages = new Set<string>();
  const mergedLangs = new Map<string, string>();
  const flipbookEntries: FlipbookEntry[] = [];

  // Pre-scan for metadata and pack root (prefer shallowest pack.mcmeta or manifest.json)
  let packRoot = "";
  let bestRootDepth = Infinity;
  let detectedSourcePackFormat: number | null = null;
  for (const path of files) {
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

      const entry = sourceZip.files[path];
      try {
        const text = await entry.async('text');
        const data = JSON.parse(text);
        if (isManifest) {
          if (data.header?.name) packName = String(data.header.name);
          if (data.header?.description !== undefined) packDescription = data.header.description;
          if (typeof data.header?.uuid === 'string') headerUuid = data.header.uuid;
          if (typeof data.modules?.[0]?.uuid === 'string') moduleUuid = data.modules[0].uuid;
        } else if (isMcmeta) {
          if (data.pack?.description !== undefined) packDescription = data.pack.description;
          const rawFormat = data.pack?.pack_format ?? (Array.isArray(data.pack?.min_format) ? data.pack.min_format[0] : data.pack?.min_format);
          if (typeof rawFormat === 'number') {
            detectedSourcePackFormat = rawFormat;
          }
        }
      } catch (e) { }
    }
  }

  // Fallback: if no pack.mcmeta/manifest.json found at top level, check for nested assets/ or textures/ directories
  if (bestRootDepth === Infinity) {
    for (const path of files) {
      if (path.includes("__MACOSX") || path.split("/").pop()?.startsWith(".")) continue;
      const lower = path.toLowerCase();
      const assetsIdx = lower.indexOf("assets/");
      const texturesIdx = lower.indexOf("textures/");
      const targetIdx = assetsIdx !== -1 ? assetsIdx : texturesIdx;
      if (targetIdx !== -1) {
        const prefix = path.substring(0, targetIdx);
        const depth = prefix.split("/").filter(Boolean).length;
        if (depth > 0 && depth < bestRootDepth) {
          bestRootDepth = depth;
          packRoot = prefix;
        }
      }
    }
  }

  // Determine target and source pack formats for Java migrations
  const targetJavaVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
  const sourceJavaVersion = options.sourceJavaVersionId
    ? JAVA_VERSIONS.find(v => v.id === options.sourceJavaVersionId)
    : (detectedSourcePackFormat !== null ? JAVA_VERSIONS.find(v => v.packFormat === detectedSourcePackFormat) : null);
  const sourcePackFormat = sourceJavaVersion?.packFormat ?? detectedSourcePackFormat ?? targetJavaVersion.packFormat;

  const formatTargetJavaPath = (jPath: string): string => {
    if (targetJavaVersion.packFormat <= 3) {
      return downgradeLegacyPath(jPath, targetJavaVersion.packFormat);
    }
    return normalizeLegacyPath(jPath, targetJavaVersion.packFormat);
  };

  // Pre-scan Bedrock subpacks (`subpacks/<folder>/...`) so the richest subpack is merged into the main pack
  let activeSubpackFolder: string | null = null;
  const rootRelativePaths = new Set<string>();
  const subpackCounts = new Map<string, number>();

  for (const p of files) {
    if (!p.startsWith(packRoot)) continue;
    const rel = p.substring(packRoot.length);
    const spMatch = rel.match(/^subpacks\/([^/]+)\/(.+)$/);
    if (spMatch) {
      subpackCounts.set(spMatch[1], (subpackCounts.get(spMatch[1]) || 0) + 1);
    } else {
      rootRelativePaths.add(rel);
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
    for (const p of files) {
      if (!p.startsWith(packRoot)) continue;
      const rel = p.substring(packRoot.length);
      if (rel.startsWith(spPrefix)) {
        activeSubpackPaths.add(rel.substring(spPrefix.length));
      }
    }
  }

  // Track generated Bedrock texture_set metadata when converting Java LabPBR -> Bedrock
  const bedrockPbrSets = new Map<string, { baseName: string; dir: string; hasMer: boolean; hasNormal: boolean }>();

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
      const entry = sourceZip.file(c);
      if (entry) {
        cachedBedrockDirtBytes = await entry.async('uint8array');
        break;
      }
    }

    if (!cachedBedrockDirtBytes) {
      for (const p of files) {
        if (/textures\/blocks?\/dirt\.(png|tga)$/i.test(p)) {
          if (activeSubpackFolder && p.includes(`subpacks/${activeSubpackFolder}`)) {
            const entry = sourceZip.file(p);
            if (entry) {
              cachedBedrockDirtBytes = await entry.async('uint8array');
              break;
            }
          } else if (!cachedBedrockDirtBytes) {
            const entry = sourceZip.file(p);
            if (entry) {
              cachedBedrockDirtBytes = await entry.async('uint8array');
            }
          }
        }
      }
    }
  }

  let lastYieldTime = performance.now();
  for (const path of files) {
    const now = performance.now();
    if (now - lastYieldTime > 30) {
      await new Promise(r => setTimeout(r, 0));
      lastYieldTime = performance.now();
    }

    const fileEntry = sourceZip.files[path];
    if (fileEntry.dir) continue;
    if (!isSafePath(path)) {
      report.skippedCount++;
      report.details.push({ filename: path, status: 'skipped', reason: 'Unsafe path traversal attempt' });
      continue;
    }
    if (isSystemHiddenFile(path)) {
      report.skippedCount++;
      report.details.push({ filename: path, status: 'skipped', reason: 'System hidden file' });
      continue;
    }

    // Normalize path relative to pack root
    if (!path.startsWith(packRoot)) {
      report.skippedCount++;
      report.details.push({
        filename: path,
        status: 'skipped',
        reason: 'Outside of pack root directory'
      });
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

    // Normalize legacy paths
    if (direction === 'java-to-bedrock') {
      relativePath = normalizeLegacyPath(relativePath, sourcePackFormat);
    }

    try {
      // 1. Handle PBR / Shader Companion Files (Bedrock RTX/Deferred <-> Java LabPBR)
      if (direction === 'bedrock-to-java') {
        const pbrInfo = classifyBedrockPbrPath(relativePath);
        if (pbrInfo) {
          if (!options.enablePbrConversion) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'PBR/Shader map conversion is disabled (Beta)' });
            continue;
          }
          if (pbrInfo.type === 'texture_set') {
            const rawText = await fileEntry.async('text');
            const parsedTs = parseTextureSetJson(rawText);
            const baseJava = getTargetContext(pbrInfo.baseBedrockTexturePath, 'bedrock-to-java');
            if (parsedTs && baseJava) {
              const formattedBase = formatTargetJavaPath(baseJava);
              report.convertedCount++;
              report.details.push({
                filename: path,
                status: 'converted',
                outputPath: formattedBase.replace(/\.png$/i, '_s.png')
              });
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Unmapped PBR texture_set reference' });
            }
            continue;
          }

          const baseJava = getTargetContext(pbrInfo.baseBedrockTexturePath, 'bedrock-to-java');
          if (!baseJava) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'Base texture for PBR map is unmapped' });
            continue;
          }
          const formattedBase = formatTargetJavaPath(baseJava);
          const rawBytes = await fileEntry.async('uint8array');

          if (pbrInfo.type === 'mer' || pbrInfo.type === 'mers') {
            const specPng = await convertBedrockMerToLabPbrSpec(rawBytes, pbrInfo.type === 'mers');
            const specPath = formattedBase.replace(/\.png$/i, '_s.png');
            if (specPng && isSafePath(specPath)) {
              targetZip.file(specPath, specPng, getZipFileOptions(specPath));
              allTargetTextures.add(specPath);
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: specPath });
            } else {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Failed to decode Bedrock MER map' });
            }
            continue;
          } else if (pbrInfo.type === 'normal' || pbrInfo.type === 'heightmap') {
            const normPath = formattedBase.replace(/\.png$/i, '_n.png');
            const normBytes = relativePath.toLowerCase().endsWith('.tga')
              ? (await convertTgaToPng(rawBytes)) || rawBytes
              : rawBytes;
            if (isSafePath(normPath)) {
              targetZip.file(normPath, normBytes, getZipFileOptions(normPath));
              allTargetTextures.add(normPath);
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: normPath });
            }
            continue;
          }
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
          const rawBytes = await fileEntry.async('uint8array');
          const baseNoExt = baseBedrock.replace(/\.(png|tga)$/i, '');
          const lastSlash = baseNoExt.lastIndexOf('/');
          const dir = lastSlash !== -1 ? baseNoExt.slice(0, lastSlash) : 'textures';
          const baseName = lastSlash !== -1 ? baseNoExt.slice(lastSlash + 1) : baseNoExt;
          const setMeta = bedrockPbrSets.get(baseNoExt) || { baseName, dir, hasMer: false, hasNormal: false };

          if (labPbrInfo.type === 'specular') {
            const merBytes = convertLabPbrSpecToBedrockMer(rawBytes) || rawBytes;
            const merPath = `${baseNoExt}_mer.png`;
            if (isSafePath(merPath)) {
              targetZip.file(merPath, merBytes, getZipFileOptions(merPath));
              allTargetTextures.add(merPath);
              setMeta.hasMer = true;
              bedrockPbrSets.set(baseNoExt, setMeta);
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: merPath });
            }
            continue;
          } else {
            const normPath = `${baseNoExt}_normal.png`;
            if (isSafePath(normPath)) {
              targetZip.file(normPath, rawBytes, getZipFileOptions(normPath));
              allTargetTextures.add(normPath);
              setMeta.hasNormal = true;
              bedrockPbrSets.set(baseNoExt, setMeta);
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: normPath });
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
        const rawText = await fileEntry.async('text');
        const convertedModel = bedrockToJavaModel(rawText, relativePath, targetJavaVersion.packFormat);
        if (convertedModel && isSafePath(convertedModel.outputPath)) {
          targetZip.file(convertedModel.outputPath, convertedModel.content, getZipFileOptions(convertedModel.outputPath));
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: convertedModel.outputPath });
        } else {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: 'Unsupported or empty Bedrock geometry' });
        }
        continue;
      } else if (direction === 'java-to-bedrock' && isJavaModelPath(relativePath)) {
        if (!options.enableModelConversion) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: '3D Model conversion is disabled (Beta)' });
          continue;
        }
        const rawText = await fileEntry.async('text');
        const fileNameNoExt = relativePath.split('/').pop()?.replace(/\.(json|jem)$/i, '') || 'custom';
        const isBlock = relativePath.includes('/models/block/');
        const isItem = relativePath.includes('/models/item/');
        const prefix = isBlock ? 'block_' : isItem ? 'item_' : '';
        const geoJson = javaToBedrockGeometry(rawText, `${prefix}${fileNameNoExt}`);
        const outGeoPath = `models/entity/${prefix}${fileNameNoExt}.geo.json`;
        if (geoJson && isSafePath(outGeoPath)) {
          targetZip.file(outGeoPath, geoJson, getZipFileOptions(outGeoPath));
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: outGeoPath });
        } else {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: 'Model has no elements/cubes to convert' });
        }
        continue;
      }
      let targetPath: string | null = null;
      if (options.enableModernGuiSprites) {
        if (direction === 'java-to-bedrock' && Object.hasOwn(MODERN_GUI_SPRITE_JAVA_TO_BEDROCK, relativePath)) {
          targetPath = MODERN_GUI_SPRITE_JAVA_TO_BEDROCK[relativePath];
        } else if (direction === 'bedrock-to-java' && targetJavaVersion.packFormat >= 18 && Object.hasOwn(MODERN_GUI_SPRITE_BEDROCK_TO_JAVA, relativePath)) {
          targetPath = MODERN_GUI_SPRITE_BEDROCK_TO_JAVA[relativePath];
        }
      }

      if (!targetPath) {
        if (direction === 'java-to-java') {
          targetPath = migrateJavaPath(relativePath, sourcePackFormat, targetJavaVersion.packFormat);
        } else {
          targetPath = getTargetContext(relativePath, direction);
        }
      }

      if (direction === 'bedrock-to-java' && targetPath) {
        if (targetJavaVersion.packFormat <= 3) {
          targetPath = downgradeLegacyPath(targetPath, targetJavaVersion.packFormat);
        } else {
          targetPath = normalizeLegacyPath(targetPath, targetJavaVersion.packFormat);
        }
      }

      // Check if we need to load and decode the content for text/logic processing
      let needsProcessing = false;
      if (targetPath) {
        if (direction === 'bedrock-to-java' && relativePath.endsWith('.fsb')) {
          needsProcessing = true;
        } else if (direction === 'java-to-bedrock') {
          if (
            (relativePath.endsWith('.json') && targetPath.startsWith('texts/')) ||
            relativePath.endsWith('sounds.json') ||
            relativePath === 'assets/minecraft/texts/splashes.txt' ||
            relativePath.endsWith('.png.mcmeta') ||
            (relativePath.startsWith('assets/minecraft/models/') && relativePath.endsWith('.json'))
          ) {
            needsProcessing = true;
          }
        } else if (direction === 'bedrock-to-java') {
          if (relativePath.endsWith('.lang') && targetPath.endsWith('.json')) {
            needsProcessing = true;
          } else if (relativePath === 'textures/flipbook_textures.json') {
            needsProcessing = true;
          } else if (
            relativePath === 'sounds/sound_definitions.json' ||
            relativePath === 'sounds.json' ||
            relativePath === 'sounds/sounds.json'
          ) {
            needsProcessing = true;
          } else if (relativePath === 'splashes.json' || relativePath === 'texts/splashes.json') {
            needsProcessing = true;
          }
        }
      }

      if (targetPath) {
        const isModernSpriteHandled = options.enableModernGuiSprites && (
          (direction === 'java-to-bedrock' && Object.hasOwn(MODERN_GUI_SPRITE_JAVA_TO_BEDROCK, relativePath)) ||
          (direction === 'bedrock-to-java' && targetJavaVersion.packFormat >= 18 && Object.hasOwn(MODERN_GUI_SPRITE_BEDROCK_TO_JAVA, relativePath))
        );
        if (!options.enableGuiConversion && !isModernSpriteHandled && (direction === 'java-to-bedrock' || direction === 'bedrock-to-java')) {
          if (relativePath.includes('/gui/') || targetPath.includes('/gui/') || targetPath.startsWith('textures/ui/')) {
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'GUI conversion disabled' });
            continue;
          }
        }

        // Special Content Processing
        let finalContent: Uint8Array | string | Promise<Uint8Array> = fileEntry.async('uint8array');

        if (needsProcessing) {
          const content = await fileEntry.async('uint8array');
          const decoder = new TextDecoder();

          if (direction === 'java-to-bedrock') {
            if (relativePath.endsWith('.json') && targetPath.startsWith('texts/')) {
              if (!options.enableLanguageConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Language conversion disabled' });
                continue;
              }
              const converted = javaToBedrockLang(decoder.decode(content));
              const current = mergedLangs.get(targetPath) || "";
              const prefix = current ? (current.endsWith('\n') ? '' : '\n') : '';
              mergedLangs.set(targetPath, current + prefix + converted);

              const langCode = targetPath.split('/').pop()?.replace('.lang', '');
              if (langCode) supportedLanguages.add(langCode);

              // Mark as converted but don't write yet
              report.convertedCount++;
              report.details.push({ filename: path, status: 'converted', outputPath: targetPath });
              continue;
            } else if (relativePath.endsWith('sounds.json')) {
              if (!options.enableSoundConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Sound conversion disabled' });
                continue;
              }
              finalContent = javaToBedrockSounds(decoder.decode(content));
              targetPath = 'sounds/sound_definitions.json';
            } else if (relativePath.startsWith('assets/minecraft/models/') && relativePath.endsWith('.json')) {
              if (!options.enableModelConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: '3D Model conversion is experimental and disabled' });
                continue;
              }
              const modelName = relativePath.split('/').pop()?.replace('.json', '') || 'custom';
              const geoJson = javaToBedrockGeometry(decoder.decode(content), modelName);
              if (geoJson) {
                finalContent = geoJson;
              } else {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Model has no elements/cubes to convert' });
                continue;
              }
            } else if (relativePath === 'assets/minecraft/texts/splashes.txt') {
              const lines = decoder.decode(content).split(/\r?\n/).filter(l => l.trim().length > 0);
              finalContent = JSON.stringify({ splashes: lines }, null, 2);
              targetPath = 'texts/splashes.json';
            }

            // Animation detection for Java -> Bedrock
            if (relativePath.endsWith('.png.mcmeta')) {
              if (!options.enableAnimationConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Animation conversion disabled' });
                continue;
              }
              const bedrockPngPath = targetPath.replace(/\.mcmeta$/, '');
              const flipbook = parseJavaAnimation(decoder.decode(content), bedrockPngPath);
              if (flipbook) {
                flipbookEntries.push(flipbook);
                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: 'textures/flipbook_textures.json' });
              } else {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Invalid or empty animation metadata' });
              }
              continue;
            }
          } else if (direction === 'bedrock-to-java') {
            if (relativePath.endsWith('.fsb')) {
              const extracted = await extractFsb5(content);
              if (extracted) {
                finalContent = extracted;
                if (targetPath.endsWith('.fsb')) {
                  targetPath = targetPath.replace(/\.fsb$/, '.ogg');
                }
              } else {
                finalContent = content;
              }
            } else if (relativePath.endsWith('.lang') && targetPath.endsWith('.json')) {
              if (!options.enableLanguageConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Language conversion disabled' });
                continue;
              }
              finalContent = bedrockToJavaLang(decoder.decode(content));
            } else if (relativePath === 'textures/flipbook_textures.json') {
              if (!options.enableAnimationConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Animation conversion disabled' });
                continue;
              }
              try {
                const flipbooks = JSON.parse(decoder.decode(content));
                if (Array.isArray(flipbooks)) {
                  for (const entry of flipbooks) {
                    if (!entry || typeof entry.flipbook_texture !== 'string') continue;
                    let rawTex = entry.flipbook_texture;
                    if (!rawTex.endsWith('.png')) rawTex += '.png';
                    const bPath = rawTex.startsWith('textures/')
                      ? rawTex
                      : 'textures/' + rawTex;
                    const jPath = getTargetContext(bPath, 'bedrock-to-java');
                    if (jPath) {
                      const mcmetaPath = jPath + '.mcmeta';
                      if (!isSafePath(mcmetaPath)) continue;
                      const mcmetaContent = generateJavaAnimation(entry);
                      targetZip.file(mcmetaPath, mcmetaContent, getZipFileOptions(mcmetaPath));
                      report.convertedCount++;
                      report.details.push({ filename: path, status: 'converted', outputPath: mcmetaPath });
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors, just skip it
              }
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'Converted to individual .mcmeta files' });
              continue;
            } else if (
              relativePath === 'sounds/sound_definitions.json' ||
              relativePath === 'sounds.json' ||
              relativePath === 'sounds/sounds.json'
            ) {
              if (!options.enableSoundConversion) {
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Sound conversion disabled' });
                continue;
              }
              finalContent = bedrockToJavaSounds(decoder.decode(content));
              targetPath = 'assets/minecraft/sounds.json';
            } else if (relativePath === 'splashes.json' || relativePath === 'texts/splashes.json') {
              try {
                const parsed = JSON.parse(decoder.decode(content));
                const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.splashes) ? parsed.splashes : [];
                finalContent = list.map((s: any) => String(s)).join('\n');
                targetPath = 'assets/minecraft/texts/splashes.txt';
              } catch {
                finalContent = content;
              }
            } else {
              finalContent = content;
            }
          } else {
            finalContent = content;
          }
        }

        if (options.enableGuiConversion && direction === 'java-to-bedrock') {
          try {
            if (relativePath === 'assets/minecraft/textures/gui/icons.png') {
              const rawBytes = await fileEntry.async('uint8array');
              const uiFiles = await processGuiSpriteSheet(rawBytes, ICONS_MAPPINGS);
              for (const [uiPath, uiData] of Object.entries(uiFiles)) {
                targetZip.file(uiPath, uiData, getZipFileOptions(uiPath));
                allTargetTextures.add(uiPath);
                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: uiPath });
              }
              continue;
            } else if (relativePath === 'assets/minecraft/textures/gui/widgets.png') {
              const rawBytes = await fileEntry.async('uint8array');
              const uiFiles = await processGuiSpriteSheet(rawBytes, WIDGETS_MAPPINGS);
              for (const [uiPath, uiData] of Object.entries(uiFiles)) {
                targetZip.file(uiPath, uiData, getZipFileOptions(uiPath));
                allTargetTextures.add(uiPath);
                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: uiPath });
              }
              continue;
            }
          } catch (e) {
            console.warn("Failed to process GUI spritesheet:", e);
            report.details.push({ filename: path, status: 'error', reason: 'GUI image processing failed' });
          }
        }

        if (options.enableAudioReencode && targetPath.endsWith('.ogg')) {
          try {
            const resolved = finalContent instanceof Promise ? await finalContent : finalContent;
            const rawBytes = typeof resolved === 'string' ? new TextEncoder().encode(resolved) : resolved;
            const reencoded = await reencodeOgg(rawBytes);
            if (reencoded) {
              finalContent = reencoded;
            } else {
              report.details.push({ filename: path, status: 'skipped', reason: 'Audio re-encode failed, using original' });
            }
          } catch (e) {
            console.warn("Audio re-encoding failed:", e);
          }
        }

        if (options.enableTgaConversion && relativePath.toLowerCase().endsWith('.tga')) {
          try {
            const resolved = finalContent instanceof Promise ? await finalContent : finalContent;
            const rawBytes = typeof resolved === 'string' ? new TextEncoder().encode(resolved) : resolved;
            const pngBytes = await convertTgaToPng(rawBytes);
            if (pngBytes) {
              finalContent = pngBytes;
              targetPath = targetPath.replace(/\.tga$/i, '.png');
            } else {
              report.details.push({ filename: path, status: 'skipped', reason: 'TGA decode failed, keeping raw bytes' });
            }
          } catch (e) {
            console.warn("TGA to PNG conversion failed:", e);
          }
        }

        const isSnowyGrass = /(^|\/)(grass_block_snow|grass_side_snowed)\.(png|tga)$/i.test(targetPath);
        if (direction === 'bedrock-to-java' && isSnowyGrass) {
          try {
            const resolved = finalContent instanceof Promise ? await finalContent : finalContent;
            const rawBytes = typeof resolved === 'string' ? new TextEncoder().encode(resolved) : resolved;
            const composited = await compositeSnowyGrassSide(rawBytes, cachedBedrockDirtBytes);
            if (composited) {
              finalContent = composited;
              targetPath = targetPath.replace(/\.tga$/i, '.png');
            }
          } catch (e) {
            console.warn("Snowy grass compositing failed:", e);
          }
        }

        // Same-edition metadata updates
        if (direction === 'java-to-java' && relativePath === 'pack.mcmeta') {
          try {
            const resolvedContent = finalContent instanceof Promise ? await finalContent : finalContent;
            let contentStr = typeof resolvedContent === 'string' ? resolvedContent : new TextDecoder().decode(resolvedContent);
            const json = JSON.parse(contentStr);
            if (json.pack) {
              const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
              json.pack.pack_format = jVersion.packFormat;
              if (jVersion.packFormat >= 69) {
                json.pack.min_format = jVersion.packFormat;
                json.pack.max_format = jVersion.packFormat;
              } else {
                delete json.pack.min_format;
                delete json.pack.max_format;
              }
              finalContent = JSON.stringify(json, null, 2);
            }
          } catch (e) {
            console.warn('Failed to update pack_format in pack.mcmeta', e);
          }
        } else if (direction === 'bedrock-to-bedrock' && relativePath === 'manifest.json') {
          try {
            const resolvedContent = finalContent instanceof Promise ? await finalContent : finalContent;
            let contentStr = typeof resolvedContent === 'string' ? resolvedContent : new TextDecoder().decode(resolvedContent);
            const json = JSON.parse(contentStr);
            if (json.header) {
              const bVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
              json.header.min_engine_version = bVersion.minEngineVersion;
              finalContent = JSON.stringify(json, null, 2);
            }
          } catch (e) {
            console.warn('Failed to update min_engine_version in manifest.json', e);
          }
        }

        // Texture tracking can be done without loading file content
        if (direction === 'java-to-bedrock') {
          if (relativePath.startsWith('assets/minecraft/textures/block/')) {
            convertedBlockTextures.add(relativePath);
          } else if (relativePath.startsWith('assets/minecraft/textures/item/')) {
            convertedItemTextures.add(relativePath);
          }
        }

        if (targetPath.endsWith('.png') || targetPath.endsWith('.tga')) {
          allTargetTextures.add(targetPath);
        }

        if (!isSafePath(targetPath)) {
          report.skippedCount++;
          report.details.push({ filename: path, status: 'skipped', reason: 'Unsafe target path traversal' });
          continue;
        }

        targetZip.file(targetPath, finalContent as any, getZipFileOptions(targetPath));
        report.convertedCount++;
        report.details.push({
          filename: path,
          status: 'converted',
          outputPath: targetPath
        });
      } else {
        // Special metadata handling
        if (direction === 'java-to-bedrock' && relativePath === 'pack.mcmeta') {
          const bVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
          generateManifest(targetZip, report, path, packName, packDescription, headerUuid, moduleUuid, bVersion.minEngineVersion);
        } else if (direction === 'bedrock-to-java' && relativePath === 'manifest.json') {
          const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
          generateMcmeta(targetZip, report, path, packDescription, jVersion.packFormat);
        } else if (relativePath === 'pack_icon.png' || relativePath === 'pack.png' || relativePath.endsWith('/pack_icon.png') || relativePath.endsWith('/pack.png')) {
          const iconName = (direction === 'java-to-bedrock') ? 'pack_icon.png' : 'pack.png';
          targetZip.file(iconName, fileEntry.async('uint8array'), getZipFileOptions(iconName));
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: iconName });
        } else {
          // Provide more specific reasons for common skips
          let reason = 'Unsupported or unmapped file';
          if (relativePath.includes('blockstates/') || relativePath.includes('models/')) {
            reason = 'Custom models/blockstates are currently not supported';
          } else if (relativePath.includes('mcpatcher/') || relativePath.includes('optifine/')) {
            reason = 'OptiFine/MCPatcher assets are not supported by vanilla Bedrock';
          } else if (relativePath.includes('font/') && relativePath.endsWith('.bin')) {
            reason = 'Custom font glyph data is incompatible';
          }

          report.skippedCount++;
          report.details.push({
            filename: path,
            status: 'skipped',
            reason: reason
          });
        }
      }
    } catch (e) {
      report.errorCount++;
      report.details.push({
        filename: path,
        status: 'error',
        reason: e instanceof Error ? e.message : 'Unknown error'
      });
    }
  }

  // Finalization Phase (Metadata Generation)
  // Only synthesize and append metadata if there was at least one legitimately converted pack file
  if (report.convertedCount > 0) {
    if (direction === 'java-to-bedrock') {
      const terrainTextureJson = convertedBlockTextures.size > 0 ? generateTerrainTexture(convertedBlockTextures) : null;
      if (terrainTextureJson) {
        targetZip.file('textures/terrain_texture.json', terrainTextureJson, getZipFileOptions('textures/terrain_texture.json'));
        report.convertedCount++;
      }

      const itemTextureJson = convertedItemTextures.size > 0 ? generateItemTexture(convertedItemTextures) : null;
      if (itemTextureJson) {
        targetZip.file('textures/item_texture.json', itemTextureJson, getZipFileOptions('textures/item_texture.json'));
        report.convertedCount++;
      }

      if (flipbookEntries.length > 0) {
        const validAtlasTiles = new Set<string>();
        if (terrainTextureJson) {
          try {
            const parsed = JSON.parse(terrainTextureJson);
            Object.keys(parsed.texture_data || {}).forEach(k => validAtlasTiles.add(k));
          } catch { }
        }
        if (itemTextureJson) {
          try {
            const parsed = JSON.parse(itemTextureJson);
            Object.keys(parsed.texture_data || {}).forEach(k => validAtlasTiles.add(k));
          } catch { }
        }

        const safeFlipbooks = flipbookEntries.filter(entry => {
          return validAtlasTiles.has(entry.atlas_tile) || allTargetTextures.has(entry.flipbook_texture + '.png');
        });

        if (safeFlipbooks.length > 0) {
          targetZip.file('textures/flipbook_textures.json', JSON.stringify(safeFlipbooks, null, 2), getZipFileOptions('textures/flipbook_textures.json'));
          report.convertedCount++;
        }
      }
      if (allTargetTextures.size > 0) {
        targetZip.file('textures/textures_list.json', JSON.stringify(Array.from(allTargetTextures), null, 2), getZipFileOptions('textures/textures_list.json'));
        report.convertedCount++;
      }
      if (supportedLanguages.size > 0) {
        targetZip.file('texts/languages.json', JSON.stringify(Array.from(supportedLanguages), null, 2), getZipFileOptions('texts/languages.json'));
        report.convertedCount++;
      }

      // Write merged languages
      for (const [tPath, content] of mergedLangs.entries()) {
        targetZip.file(tPath, content, getZipFileOptions(tPath));
      }

      // Write generated Bedrock PBR .texture_set.json files
      if (options.enablePbrConversion && bedrockPbrSets.size > 0) {
        for (const [baseNoExt, meta] of bedrockPbrSets.entries()) {
          const tsPath = `${baseNoExt}.texture_set.json`;
          if (isSafePath(tsPath)) {
            const tsContent = generateBedrockTextureSetJson(meta.baseName, meta.hasMer, meta.hasNormal);
            targetZip.file(tsPath, tsContent, getZipFileOptions(tsPath));
            report.convertedCount++;
          }
        }
      }

      // Ensure manifest.json exists
      if (!targetZip.file('manifest.json')) {
        const bVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
        generateManifest(targetZip, report, 'pack.mcmeta', packName, packDescription, headerUuid, moduleUuid, bVersion.minEngineVersion);
      }
    } else if (direction === 'bedrock-to-java' || direction === 'java-to-java') {
      // Ensure pack.mcmeta exists in output zip
      if (!targetZip.file('pack.mcmeta')) {
        const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
        generateMcmeta(targetZip, report, 'manifest.json', packDescription, jVersion.packFormat);
      }
    }
  }

  const outputBlob = await targetZip.generateAsync({
    type: 'blob'
  });
  return { blob: outputBlob, report };
}

function generateManifest(
  targetZip: JSZip,
  report: PackReport,
  originalPath: string,
  name: string,
  description: unknown,
  headerUuid: string,
  moduleUuid: string,
  minEngineVersion: [number, number, number]
) {
  const manifestStr = generateManifestContent(name, description, headerUuid, moduleUuid, minEngineVersion);
  targetZip.file('manifest.json', manifestStr, getZipFileOptions('manifest.json'));
  report.convertedCount++;
  report.details.push({
    filename: originalPath,
    status: 'converted',
    outputPath: 'manifest.json'
  });
}

function generateMcmeta(targetZip: JSZip, report: PackReport, originalPath: string, description: unknown, packFormat: number) {
  const mcmetaStr = generateMcmetaContent(description, packFormat);
  targetZip.file('pack.mcmeta', mcmetaStr, getZipFileOptions('pack.mcmeta'));
  report.convertedCount++;
  report.details.push({
    filename: originalPath,
    status: 'converted',
    outputPath: 'pack.mcmeta'
  });
}
