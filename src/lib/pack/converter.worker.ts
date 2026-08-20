import { unzipSync, zipSync, strToU8, strFromU8, type Zippable } from 'fflate';
import type { PackReport, ConversionOptions } from './types';
import { getTargetContext, loadMappings } from './rules';
import { extractFsb5 } from './fsb';
import { javaToBedrockLang, bedrockToJavaLang } from './processors/lang';
import { javaToBedrockSounds, bedrockToJavaSounds } from './processors/sounds';
import { generateBlocksJson, generateTerrainTexture } from './processors/blocks';
import { generateItemTexture } from './processors/items';
import { parseJavaAnimation, generateJavaAnimation, type FlipbookEntry } from './processors/animation';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from './versions';
import { normalizeLegacyPath } from './legacy';
import { generateUUID, generateManifestContent, generateMcmetaContent } from './metadata';

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

self.onmessage = async (e: MessageEvent<{ fileBuffer: ArrayBuffer; fileName: string; options: ConversionOptions }>) => {
  const { fileBuffer, fileName, options } = e.data;
  const { direction } = options;

  try {
    // Load mappings
    await loadMappings(options.javaVersionId, options.bedrockVersionId);

    const sourceFiles = unzipSync(new Uint8Array(fileBuffer));
    const targetFiles: Zippable = {};

    const report: PackReport = {
      totalFiles: 0,
      convertedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      details: [],
    };

    const filePaths = Object.keys(sourceFiles);
    report.totalFiles = filePaths.length;

    let packName = (fileName || "pack").replace(/\.(zip|mcpack)$/, '');
    let packDescription = "Converted by PackBridge";
    let headerUuid = generateUUID();
    let moduleUuid = generateUUID();

    const convertedBlockTextures = new Set<string>();
    const convertedItemTextures = new Set<string>();
    const allTargetTextures = new Set<string>();
    const supportedLanguages = new Set<string>();
    const mergedLangs = new Map<string, string>();
    const flipbookEntries: FlipbookEntry[] = [];

    // Pre-scan for metadata & pack root
    let packRoot = "";
    for (const path of filePaths) {
      if (path.endsWith('pack.mcmeta') || path.endsWith('manifest.json')) {
        const parts = path.split('/');
        parts.pop();
        packRoot = parts.join('/') + (parts.length > 0 ? '/' : '');

        try {
          const text = strFromU8(sourceFiles[path]);
          const data = JSON.parse(text);
          if (path.endsWith('manifest.json')) {
            if (data.header?.name) packName = data.header.name;
            if (data.header?.description) packDescription = data.header.description;
            if (data.header?.uuid) headerUuid = data.header.uuid;
            if (data.modules?.[0]?.uuid) moduleUuid = data.modules[0].uuid;
          } else if (path.endsWith('pack.mcmeta')) {
            if (data.pack?.description) packDescription = data.pack.description;
          }
        } catch {}
      }
    }

    let processedCount = 0;
    let lastProgressTime = performance.now();

    for (const path of filePaths) {
      processedCount++;
      const now = performance.now();
      if (now - lastProgressTime > 50 || processedCount === filePaths.length) {
        postMessage({ type: 'progress', processedCount, totalFiles: report.totalFiles });
        lastProgressTime = now;
      }

      const content = sourceFiles[path];
      // Skip directory placeholders
      if (path.endsWith('/')) continue;

      if (!path.startsWith(packRoot)) {
        report.skippedCount++;
        report.details.push({ filename: path, status: 'skipped', reason: 'Outside of pack root directory' });
        continue;
      }

      let relativePath = path.substring(packRoot.length);

      if (direction === 'java-to-bedrock' || direction === 'java-to-java') {
        const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId);
        if (jVersion) {
          relativePath = normalizeLegacyPath(relativePath, jVersion.packFormat);
        }
      }

      try {
        let targetPath = getTargetContext(relativePath, direction);

        if (direction === 'bedrock-to-java' && targetPath) {
          const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId);
          if (jVersion) {
            targetPath = normalizeLegacyPath(targetPath, jVersion.packFormat);
          }
        }

        let needsProcessing = false;
        if (targetPath) {
          if (direction === 'bedrock-to-java' && relativePath.endsWith('.fsb')) {
            needsProcessing = true;
          } else if (direction === 'java-to-bedrock') {
            if (
              (relativePath.endsWith('.json') && targetPath.startsWith('texts/')) ||
              relativePath.endsWith('sounds.json') ||
              relativePath === 'assets/minecraft/texts/splashes.txt' ||
              relativePath.endsWith('.png.mcmeta')
            ) {
              needsProcessing = true;
            }
          } else if (direction === 'bedrock-to-java') {
            if (relativePath.endsWith('.lang') && targetPath.endsWith('.json')) {
              needsProcessing = true;
            } else if (relativePath === 'textures/flipbook_textures.json') {
              needsProcessing = true;
            } else if (relativePath === 'sounds/sound_definitions.json') {
              needsProcessing = true;
            }
          }
        }

        if (targetPath) {
          if (!options.enableGuiConversion && (direction === 'java-to-bedrock' || direction === 'bedrock-to-java')) {
            if (relativePath.includes('/gui/') || targetPath.includes('/gui/')) {
              report.skippedCount++;
              report.details.push({ filename: path, status: 'skipped', reason: 'GUI conversion disabled' });
              continue;
            }
          }

          let finalBytes: Uint8Array = content;

          if (needsProcessing) {
            if (direction === 'java-to-bedrock') {
              if (relativePath.endsWith('.json') && targetPath.startsWith('texts/')) {
                if (!options.enableLanguageConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Language conversion disabled' });
                  continue;
                }
                const converted = javaToBedrockLang(strFromU8(content));
                const current = mergedLangs.get(targetPath) || "";
                const prefix = current ? (current.endsWith('\n') ? '' : '\n') : '';
                mergedLangs.set(targetPath, current + prefix + converted);

                const langCode = targetPath.split('/').pop()?.replace('.lang', '');
                if (langCode) supportedLanguages.add(langCode);

                report.convertedCount++;
                report.details.push({ filename: path, status: 'converted', outputPath: targetPath });
                continue;
              } else if (relativePath.endsWith('sounds.json')) {
                if (!options.enableSoundConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Sound conversion disabled' });
                  continue;
                }
                finalBytes = strToU8(javaToBedrockSounds(strFromU8(content)));
                targetPath = 'sounds/sound_definitions.json';
              } else if (relativePath === 'assets/minecraft/texts/splashes.txt') {
                const lines = strFromU8(content).split(/\r?\n/).filter(l => l.trim().length > 0);
                finalBytes = strToU8(JSON.stringify({ splashes: lines }, null, 2));
                targetPath = 'texts/splashes.json';
              }

              if (relativePath.endsWith('.png.mcmeta')) {
                if (!options.enableAnimationConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Animation conversion disabled' });
                  continue;
                }
                const bedrockPngPath = targetPath.replace(/\.mcmeta$/, '');
                const flipbook = parseJavaAnimation(strFromU8(content), bedrockPngPath);
                if (flipbook) {
                  flipbookEntries.push(flipbook);
                }
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Converted to flipbook entry' });
                continue;
              }
            } else if (direction === 'bedrock-to-java') {
              if (relativePath.endsWith('.fsb')) {
                const extracted = await extractFsb5(content);
                if (extracted) {
                  finalBytes = extracted;
                  if (targetPath.endsWith('.fsb')) {
                    targetPath = targetPath.replace(/\.fsb$/, '.ogg');
                  }
                }
              } else if (relativePath.endsWith('.lang') && targetPath.endsWith('.json')) {
                if (!options.enableLanguageConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Language conversion disabled' });
                  continue;
                }
                finalBytes = strToU8(bedrockToJavaLang(strFromU8(content)));
              } else if (relativePath === 'textures/flipbook_textures.json') {
                if (!options.enableAnimationConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Animation conversion disabled' });
                  continue;
                }
                try {
                  const flipbooks = JSON.parse(strFromU8(content));
                  if (Array.isArray(flipbooks)) {
                    for (const entry of flipbooks) {
                      let rawTex = entry.flipbook_texture;
                      if (!rawTex.endsWith('.png')) rawTex += '.png';
                      const bPath = rawTex.startsWith('textures/') ? rawTex : 'textures/' + rawTex;
                      const jPath = getTargetContext(bPath, 'bedrock-to-java');
                      if (jPath) {
                        const mcmetaPath = jPath + '.mcmeta';
                        const mcmetaContent = generateJavaAnimation(entry);
                        targetFiles[mcmetaPath] = [strToU8(mcmetaContent), { level: getFileCompressionLevel(mcmetaPath) }];
                        report.convertedCount++;
                        report.details.push({ filename: path, status: 'converted', outputPath: mcmetaPath });
                      }
                    }
                  }
                } catch {}
                report.skippedCount++;
                report.details.push({ filename: path, status: 'skipped', reason: 'Converted to individual .mcmeta files' });
                continue;
              } else if (relativePath === 'sounds/sound_definitions.json') {
                if (!options.enableSoundConversion) {
                  report.skippedCount++;
                  report.details.push({ filename: path, status: 'skipped', reason: 'Sound conversion disabled' });
                  continue;
                }
                finalBytes = strToU8(bedrockToJavaSounds(strFromU8(content)));
                targetPath = 'assets/minecraft/sounds.json';
              }
            }
          }

          // Same edition metadata update
          if (direction === 'java-to-java' && relativePath === 'pack.mcmeta') {
            try {
              const json = JSON.parse(strFromU8(finalBytes));
              if (json.pack) {
                const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
                json.pack.pack_format = jVersion.packFormat;
                if (jVersion.packFormat >= 69) {
                  json.pack.min_format = jVersion.packFormat;
                  json.pack.max_format = jVersion.packFormat;
                }
                finalBytes = strToU8(JSON.stringify(json, null, 2));
              }
            } catch {}
          } else if (direction === 'bedrock-to-bedrock' && relativePath === 'manifest.json') {
            try {
              const json = JSON.parse(strFromU8(finalBytes));
              if (json.header) {
                const bVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
                json.header.min_engine_version = bVersion.minEngineVersion;
                finalBytes = strToU8(JSON.stringify(json, null, 2));
              }
            } catch {}
          }

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

          targetFiles[targetPath] = [finalBytes, { level: getFileCompressionLevel(targetPath) }];
          report.convertedCount++;
          report.details.push({ filename: path, status: 'converted', outputPath: targetPath });
        } else {
          // Special metadata handling
          if (direction === 'java-to-bedrock' && relativePath === 'pack.mcmeta') {
            const bVersion = BEDROCK_VERSIONS.find(v => v.id === options.bedrockVersionId) || BEDROCK_VERSIONS[0];
            const manifestStr = generateManifestContent(packName, packDescription, headerUuid, moduleUuid, bVersion.minEngineVersion);
            targetFiles['manifest.json'] = [strToU8(manifestStr), { level: getFileCompressionLevel('manifest.json') }];
            report.convertedCount++;
            report.details.push({ filename: path, status: 'converted', outputPath: 'manifest.json' });
          } else if (direction === 'bedrock-to-java' && relativePath === 'manifest.json') {
            const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
            const mcmetaStr = generateMcmetaContent(packDescription, jVersion.packFormat);
            targetFiles['pack.mcmeta'] = [strToU8(mcmetaStr), { level: getFileCompressionLevel('pack.mcmeta') }];
            report.convertedCount++;
            report.details.push({ filename: path, status: 'converted', outputPath: 'pack.mcmeta' });
          } else if (relativePath === 'pack_icon.png' || relativePath === 'pack.png' || relativePath.endsWith('/pack_icon.png') || relativePath.endsWith('/pack.png')) {
            const iconName = direction === 'java-to-bedrock' ? 'pack_icon.png' : 'pack.png';
            targetFiles[iconName] = [content, { level: getFileCompressionLevel(iconName) }];
            report.convertedCount++;
            report.details.push({ filename: path, status: 'converted', outputPath: iconName });
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

    // Finalization Phase
    if (direction === 'java-to-bedrock') {
      if (convertedBlockTextures.size > 0) {
        targetFiles['textures/terrain_texture.json'] = [strToU8(generateTerrainTexture(convertedBlockTextures)), { level: 1 }];
        targetFiles['blocks.json'] = [strToU8(generateBlocksJson(convertedBlockTextures)), { level: 1 }];
        report.convertedCount += 2;
      }
      if (convertedItemTextures.size > 0) {
        targetFiles['textures/item_texture.json'] = [strToU8(generateItemTexture(convertedItemTextures)), { level: 1 }];
        report.convertedCount++;
      }
      if (flipbookEntries.length > 0) {
        targetFiles['textures/flipbook_textures.json'] = [strToU8(JSON.stringify(flipbookEntries, null, 2)), { level: 1 }];
        report.convertedCount++;
      }
      if (allTargetTextures.size > 0) {
        targetFiles['textures/textures_list.json'] = [strToU8(JSON.stringify(Array.from(allTargetTextures), null, 2)), { level: 1 }];
        report.convertedCount++;
      }
      if (supportedLanguages.size > 0) {
        targetFiles['texts/languages.json'] = [strToU8(JSON.stringify(Array.from(supportedLanguages), null, 2)), { level: 1 }];
        report.convertedCount++;
      }
      for (const [tPath, content] of mergedLangs.entries()) {
        targetFiles[tPath] = [strToU8(content), { level: 1 }];
      }
    } else if (direction === 'bedrock-to-java' || direction === 'java-to-java') {
      if (!targetFiles['pack.mcmeta']) {
        const jVersion = JAVA_VERSIONS.find(v => v.id === options.javaVersionId) || JAVA_VERSIONS[0];
        const mcmetaStr = generateMcmetaContent(packDescription, jVersion.packFormat);
        targetFiles['pack.mcmeta'] = [strToU8(mcmetaStr), { level: getFileCompressionLevel('pack.mcmeta') }];
        report.convertedCount++;
        report.details.push({ filename: 'manifest.json', status: 'converted', outputPath: 'pack.mcmeta' });
      }
    }

    const outputBuffer = zipSync(targetFiles);
    const bufferToTransfer = (outputBuffer.byteOffset === 0 && outputBuffer.byteLength === outputBuffer.buffer.byteLength)
      ? outputBuffer.buffer
      : outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength);

    postMessage(
      { type: 'complete', buffer: bufferToTransfer, report },
      { transfer: [bufferToTransfer] }
    );
  } catch (err) {
    postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Unknown worker error'
    });
  }
};


