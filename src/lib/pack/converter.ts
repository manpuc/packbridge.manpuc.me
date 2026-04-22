import JSZip from 'jszip';
import type { ConversionDirection, PackReport, ConversionResult, ConversionOptions } from './types';
import { getTargetContext } from './rules';
import { extractFsb5 } from './fsb';
import { javaToBedrockLang, bedrockToJavaLang } from './processors/lang';
import { javaToBedrockSounds } from './processors/sounds';
import { generateBlocksJson, generateTerrainTexture } from './processors/blocks';
import { generateItemTexture } from './processors/items';
import { parseJavaAnimation, type FlipbookEntry } from './processors/animation';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from './versions';

export async function convertPack(
  input: File | JSZip,
  options: ConversionOptions,
  fileName?: string
): Promise<{ blob: Blob; report: PackReport }> {
  const { direction } = options;
  const sourceZip = input instanceof JSZip ? input : await JSZip.loadAsync(input);
  const targetZip = new JSZip();
  const report: PackReport = {
    totalFiles: 0,
    convertedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    details: [],
  };

  const files = Object.keys(sourceZip.files);
  report.totalFiles = files.length;

  let packName = (fileName || (input instanceof File ? input.name : "pack")).replace(/\.(zip|mcpack)$/, '');
  let packDescription = "Converted by PackBridge";
  let headerUuid = crypto.randomUUID();
  let moduleUuid = crypto.randomUUID();

  // Trackers for metadata generation
  const convertedBlockTextures = new Set<string>();
  const convertedItemTextures = new Set<string>();
  const allTargetTextures = new Set<string>();
  const supportedLanguages = new Set<string>();
  const mergedLangs = new Map<string, string>();
  const flipbookEntries: FlipbookEntry[] = [];

  // Pre-scan for metadata and pack root
  let packRoot = "";
  for (const path of files) {
    if (path.endsWith('pack.mcmeta') || path.endsWith('manifest.json')) {
      const parts = path.split('/');
      parts.pop();
      packRoot = parts.join('/') + (parts.length > 0 ? '/' : '');

      const entry = sourceZip.files[path];
      try {
        const text = await entry.async('text');
        const data = JSON.parse(text);
        if (path.endsWith('manifest.json')) {
          if (data.header?.name) packName = data.header.name;
          if (data.header?.description) packDescription = data.header.description;
          if (data.header?.uuid) headerUuid = data.header.uuid;
          if (data.modules?.[0]?.uuid) moduleUuid = data.modules[0].uuid;
        } else if (path.endsWith('pack.mcmeta')) {
          if (data.pack?.description) packDescription = data.pack.description;
        }
      } catch (e) { }
    }
  }

  for (const path of files) {
    const fileEntry = sourceZip.files[path];
    if (fileEntry.dir) continue;

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

    const relativePath = path.substring(packRoot.length);

    try {
      let targetPath = getTargetContext(relativePath, direction);
      let content = await fileEntry.async('uint8array');

      // Best-effort Sound Conversion (FSB -> OGG)
      if (direction === 'bedrock-to-java' && relativePath.endsWith('.fsb')) {
        const extracted = await extractFsb5(content);
        if (extracted) {
          content = extracted;
          // If the rule didn't already change it to .ogg, ensure it is
          if (targetPath && targetPath.endsWith('.fsb')) {
            targetPath = targetPath.replace(/\.fsb$/, '.ogg');
          }
        }
      }

      if (targetPath) {
        // Special Content Processing
        let finalContent: Uint8Array | string = content;
        const decoder = new TextDecoder();

        if (direction === 'java-to-bedrock') {
          if (relativePath.endsWith('.json') && targetPath.startsWith('texts/')) {
            const converted = javaToBedrockLang(decoder.decode(content));
            const current = mergedLangs.get(targetPath) || "";
            mergedLangs.set(targetPath, current + converted);

            const langCode = targetPath.split('/').pop()?.replace('.lang', '');
            if (langCode) supportedLanguages.add(langCode);

            // Mark as converted but don't write yet
            report.convertedCount++;
            report.details.push({ filename: path, status: 'converted', outputPath: targetPath });
            continue;
          } else if (relativePath.endsWith('sounds.json')) {
            finalContent = javaToBedrockSounds(decoder.decode(content));
          } else if (relativePath === 'assets/minecraft/texts/splashes.txt') {
            const lines = decoder.decode(content).split(/\r?\n/).filter(l => l.trim().length > 0);
            finalContent = JSON.stringify({ splashes: lines }, null, 2);
            targetPath = 'texts/splashes.json';
          } else if (relativePath.startsWith('assets/minecraft/textures/block/')) {
            convertedBlockTextures.add(relativePath);
          } else if (relativePath.startsWith('assets/minecraft/textures/item/')) {
            convertedItemTextures.add(relativePath);
          }

          // Animation detection for Java -> Bedrock
          if (relativePath.endsWith('.png.mcmeta')) {
            const pngPath = relativePath.replace('.mcmeta', '');
            const flipbook = parseJavaAnimation(decoder.decode(content), pngPath);
            if (flipbook) {
              flipbookEntries.push(flipbook);
            }
            // Skip copying the .mcmeta itself to Bedrock
            report.skippedCount++;
            report.details.push({ filename: path, status: 'skipped', reason: 'Converted to flipbook entry' });
            continue;
          }
        } else if (direction === 'bedrock-to-java') {
          if (relativePath.endsWith('.lang') && targetPath.endsWith('.json')) {
            finalContent = bedrockToJavaLang(decoder.decode(content));
          }
        }

        if (targetPath.endsWith('.png') || targetPath.endsWith('.tga')) {
          allTargetTextures.add(targetPath);
        }

        targetZip.file(targetPath, finalContent);
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
        } else if (relativePath === 'pack_icon.png' || relativePath === 'pack.png') {
          const iconName = direction === 'java-to-bedrock' ? 'pack_icon.png' : 'pack.png';
          const content = await fileEntry.async('uint8array');
          targetZip.file(iconName, content);
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
  if (direction === 'java-to-bedrock') {
    if (convertedBlockTextures.size > 0) {
      targetZip.file('textures/terrain_texture.json', generateTerrainTexture(convertedBlockTextures));
      targetZip.file('blocks.json', generateBlocksJson(convertedBlockTextures));
      report.convertedCount += 2;
    }
    if (convertedItemTextures.size > 0) {
      targetZip.file('textures/item_texture.json', generateItemTexture(convertedItemTextures));
      report.convertedCount++;
    }
    if (flipbookEntries.length > 0) {
      targetZip.file('textures/flipbook_textures.json', JSON.stringify(flipbookEntries, null, 2));
      report.convertedCount++;
    }
    if (allTargetTextures.size > 0) {
      targetZip.file('textures/textures_list.json', JSON.stringify(Array.from(allTargetTextures), null, 2));
      report.convertedCount++;
    }
    if (supportedLanguages.size > 0) {
      targetZip.file('texts/languages.json', JSON.stringify(Array.from(supportedLanguages), null, 2));
      report.convertedCount++;
    }

    // Write merged languages
    for (const [tPath, content] of mergedLangs.entries()) {
      targetZip.file(tPath, content);
    }
  }

  const outputBlob = await targetZip.generateAsync({ type: 'blob' });
  return { blob: outputBlob, report };
}

function generateManifest(
  targetZip: JSZip,
  report: PackReport,
  originalPath: string,
  name: string,
  description: string,
  headerUuid: string,
  moduleUuid: string,
  minEngineVersion: [number, number, number]
) {
  // Append credit to Bedrock description
  const credit = "\nConverted by PackBridge (packbridge.manpuc.me)";
  const finalDescription = description + credit;

  const manifest = {
    format_version: 2,
    header: {
      description: finalDescription,
      name: name,
      uuid: headerUuid,
      version: [1, 0, 0],
      min_engine_version: minEngineVersion
    },
    modules: [
      {
        description: finalDescription,
        type: "resources",
        uuid: moduleUuid,
        version: [1, 0, 0]
      }
    ]
  };

  targetZip.file('manifest.json', JSON.stringify(manifest, null, 2));
  report.convertedCount++;
  report.details.push({
    filename: originalPath,
    status: 'converted',
    outputPath: 'manifest.json'
  });
}

function generateMcmeta(targetZip: JSZip, report: PackReport, originalPath: string, description: string, packFormat: number) {
  // For Java, support clickable link if possible by using Text Components
  let finalDescription: any = description;

  try {
    const creditText = "\nConverted with ";
    const linkText = "PackBridge";
    const url = "https://packbridge.manpuc.me";

    // If description is already JSON-like string, parse it, otherwise wrap it
    let baseComp: any;
    try {
      baseComp = JSON.parse(description);
    } catch {
      baseComp = { text: description };
    }

    // Ensure it's a component object
    if (typeof baseComp === 'string') {
      baseComp = { text: baseComp };
    } else if (Array.isArray(baseComp)) {
      baseComp = { text: "", extra: baseComp };
    }

    // Append our credit
    if (!baseComp.extra) baseComp.extra = [];
    baseComp.extra.push({ text: creditText, color: "gray" });
    baseComp.extra.push({
      text: linkText,
      color: "blue",
      underlined: true,
      clickEvent: { action: "open_url", value: url }
    });

    finalDescription = baseComp;
  } catch (e) {
    // Fallback to plain string if something goes wrong
    finalDescription = description + "\nConverted with PackBridge (https://packbridge.manpuc.me)";
  }

  const mcmeta = {
    pack: {
      pack_format: packFormat,
      description: finalDescription
    }
  };

  targetZip.file('pack.mcmeta', JSON.stringify(mcmeta, null, 2));
  report.convertedCount++;
  report.details.push({
    filename: originalPath,
    status: 'converted',
    outputPath: 'pack.mcmeta'
  });
}
