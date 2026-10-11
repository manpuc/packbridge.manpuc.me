import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import minecraftData from 'minecraft-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.json();
}

// Fetch authoritative sound mappings from GeyserMC/mappings
async function fetchGeyserSounds(): Promise<{ java_to_bedrock: Record<string, string>; bedrock_to_java: Record<string, string> }> {
  const j2b: Record<string, string> = {};
  const b2j: Record<string, string> = {};

  try {
    console.log("Fetching authoritative sound mappings from GeyserMC/mappings...");
    const geyserSounds = await fetchJson('https://raw.githubusercontent.com/GeyserMC/mappings/master/sounds.json');

    for (const [javaEvent, mapping] of Object.entries(geyserSounds) as [string, any][]) {
      const bedrockEvent = mapping.playsound_mapping;
      if (bedrockEvent && typeof bedrockEvent === 'string') {
        j2b[javaEvent] = bedrockEvent;
        if (!b2j[bedrockEvent]) {
          b2j[bedrockEvent] = javaEvent;
        }
      }
    }
    console.log(`  Loaded ${Object.keys(j2b).length} Geyser sound events!`);
  } catch (e) {
    console.warn("  Failed to fetch Geyser sounds, will use fallback.", e);
  }

  return { java_to_bedrock: j2b, bedrock_to_java: b2j };
}

// Generate language and item mapping from PrismarineJS minecraft-data
function getPrismarineLanguageMappings(javaVerId: string, bedrockVerId: string) {
  const j2b: Record<string, string> = {};
  const b2j: Record<string, string> = {};

  try {
    // Clean versions for minecraft-data lookup
    const jClean = javaVerId.split('.').slice(0, 3).join('.');
    const bClean = bedrockVerId.split('.').slice(0, 3).join('.');

    const javaData = minecraftData(jClean) || minecraftData('1.21.4');
    const bedData = minecraftData(`bedrock_${bClean}`) || minecraftData('bedrock_1.21.0');

    if (javaData?.language && bedData?.language) {
      const valToBKey = new Map<string, string>();
      for (const [bk, bv] of Object.entries(bedData.language)) {
        if (bv && typeof bv === 'string') {
          valToBKey.set(bv.toLowerCase().trim(), bk);
        }
      }

      for (const [jk, jv] of Object.entries(javaData.language)) {
        if (!jv || typeof jv !== 'string') continue;
        const bk = valToBKey.get(jv.toLowerCase().trim());
        if (bk) {
          j2b[jk] = bk;
          if (!b2j[bk]) b2j[bk] = jk;
        }
      }
      console.log(`  PrismarineJS matched ${Object.keys(j2b).length} language keys for Java ${jClean} <-> Bedrock ${bClean}`);
    }
  } catch (e) {
    console.warn(`  Warning matching PrismarineJS language keys:`, e);
  }

  return { java_to_bedrock: j2b, bedrock_to_java: b2j };
}

async function updateMappings() {
  // 1. Fetch Geyser sound mappings
  const geyserSounds = await fetchGeyserSounds();

  const mappingsDir = path.join(__dirname, '../src/lib/pack/mappings');
  const baseMappingPath = path.join(__dirname, '../src/lib/pack/mappings.json');

  const files = await fs.readdir(mappingsDir);
  console.log(`Found ${files.length} mapping files in ${mappingsDir}`);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(mappingsDir, file);
    try {
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Parse versions from filename, e.g., "1.21.4_to_1.21.50.json"
      const parts = file.replace('.json', '').split('_to_');
      const javaVer = parts[0] || '1.21.4';
      const bedrockVer = parts[1] || '1.21.50';

      const langMap = getPrismarineLanguageMappings(javaVer, bedrockVer);

      // Merge Geyser sounds and Prismarine language keys
      content.sounds_java_to_bedrock = {
        ...(content.sounds_java_to_bedrock || {}),
        ...geyserSounds.java_to_bedrock
      };
      content.sounds_bedrock_to_java = {
        ...(content.sounds_bedrock_to_java || {}),
        ...geyserSounds.bedrock_to_java
      };
      content.lang_java_to_bedrock = langMap.java_to_bedrock;
      content.lang_bedrock_to_java = langMap.bedrock_to_java;

      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      console.log(`  Updated ${file} with Geyser sounds (${Object.keys(content.sounds_java_to_bedrock).length}) and Prismarine lang (${Object.keys(content.lang_java_to_bedrock).length})`);
    } catch (e) {
      console.error(`  Failed to update ${file}:`, e);
    }
  }

  // Also update fallback mappings.json
  console.log("Updating fallback mappings.json...");
  try {
    const baseContent = JSON.parse(await fs.readFile(baseMappingPath, 'utf8'));
    const defaultLang = getPrismarineLanguageMappings('1.21.4', '1.21.50');

    baseContent.sounds_java_to_bedrock = {
      ...(baseContent.sounds_java_to_bedrock || {}),
      ...geyserSounds.java_to_bedrock
    };
    baseContent.sounds_bedrock_to_java = {
      ...(baseContent.sounds_bedrock_to_java || {}),
      ...geyserSounds.bedrock_to_java
    };
    baseContent.lang_java_to_bedrock = defaultLang.java_to_bedrock;
    baseContent.lang_bedrock_to_java = defaultLang.bedrock_to_java;

    await fs.writeFile(baseMappingPath, JSON.stringify(baseContent, null, 2));
    console.log("Fallback mappings.json updated successfully!");
  } catch (e) {
    console.error("Failed to update base mappings.json:", e);
  }
}

updateMappings().catch(console.error);
