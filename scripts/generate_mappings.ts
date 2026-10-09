import fs from 'fs/promises';
import path from 'path';
import stringSimilarity from 'string-similarity';

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.json();
}

async function fetchAllPages(url: string) {
  let page = 1;
  let all: any[] = [];
  while (true) {
    const res = await fetchJson(`${url}&page=${page}`);
    if (res.length === 0) break;
    all = all.concat(res);
    page++;
  }
  return all;
}

async function getJavaVersions() {
  const branches = await fetchAllPages('https://api.github.com/repos/InventivetalentDev/minecraft-assets/branches?per_page=100');
  return branches.map((b: any) => b.name);
}

async function getBedrockVersions() {
  const tags = await fetchAllPages('https://api.github.com/repos/Mojang/bedrock-samples/tags?per_page=100');
  return tags.map((t: any) => t.name);
}

function findClosestVersion(target: string, available: string[]) {
  const cleanTarget = target.replace(/^v/, '');
  const prefix = cleanTarget.split('.').slice(0, 2).join('.');
  const match = available.find(v => {
    const vClean = v.replace(/^v/, '');
    return vClean === cleanTarget || vClean.startsWith(cleanTarget + '.') || vClean.startsWith(prefix + '.');
  });
  return match || available.find(v => v.includes(prefix)) || available[available.length - 1];
}

// Utility to score word matches
function scoreWordMatch(str1: string, str2: string): number {
  const words1 = str1.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  const words2 = str2.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  for (const w1 of words1) {
    if (words2.includes(w1)) matches++;
  }
  return (matches * 2) / (words1.length + words2.length);
}

async function fetchSoundsJson(repo: string, version: string, p: string) {
  try {
    const url = `https://raw.githubusercontent.com/${repo}/${version}/${p}`;
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) { }
  return null;
}

async function generateMappings() {
  console.log("Fetching available versions from GitHub...");
  const javaAvailable = await getJavaVersions();
  const bedrockAvailable = await getBedrockVersions();

  const targetJavaVers = ['26.3.0'];
  const targetBedrockVers = ['1.26.50'];

  const baseMappingPath = path.join(__dirname, '../src/lib/pack/mappings.json');
  const baseMapping = JSON.parse(await fs.readFile(baseMappingPath, 'utf8'));
  const normalizedBase = {
    java_to_bedrock: {} as Record<string, string>,
    bedrock_to_java: {} as Record<string, string>
  };
  for (const [jPath, bPath] of Object.entries(baseMapping.java_to_bedrock as Record<string, string>)) {
    const javaPath = jPath.startsWith('assets/minecraft/') ? jPath : jPath.replace('assets/', 'assets/minecraft/');
    normalizedBase.java_to_bedrock[javaPath] = bPath;
    normalizedBase.bedrock_to_java[bPath] = javaPath;
  }

  const outDir = path.join(__dirname, '../src/lib/pack/mappings');
  await fs.mkdir(outDir, { recursive: true });

  for (let i = 0; i < targetJavaVers.length; i++) {
    const jVer = findClosestVersion(targetJavaVers[i], javaAvailable);
    const bVer = findClosestVersion(targetBedrockVers[i], bedrockAvailable);

    console.log(`Processing mapping for Java ${jVer} <-> Bedrock ${bVer}...`);
    try {
      const javaTree = await fetchJson(`https://api.github.com/repos/InventivetalentDev/minecraft-assets/git/trees/${jVer}?recursive=1`);
      const bedrockTree = await fetchJson(`https://api.github.com/repos/Mojang/bedrock-samples/git/trees/${bVer}?recursive=1`);

      const javaFiles = javaTree.tree.filter((t: any) => t.type === 'blob' && t.path.startsWith('assets/minecraft/')).map((t: any) => t.path);
      const bedrockFiles = bedrockTree.tree.filter((t: any) => t.type === 'blob' && t.path.startsWith('resource_pack/')).map((t: any) => t.path.replace('resource_pack/', ''));
      const bedrockSet = new Set<string>(bedrockFiles);

      const newMapping = {
        java_to_bedrock: {} as Record<string, string>,
        bedrock_to_java: {} as Record<string, string>,
        sounds_java_to_bedrock: {} as Record<string, string>
      };

      // 1. File Path Mapping (Blocks/Items/Entities)
      const bPathList = Array.from(bedrockSet);
      for (const jPath of javaFiles) {
        if (!jPath.endsWith('.png')) continue; // Focus on textures for fuzzy match

        let mappedBPath = normalizedBase.java_to_bedrock[jPath];

        // Fuzzy Matching if not in base map
        if (!mappedBPath) {
          const jName = path.basename(jPath, '.png');
          const isBlock = jPath.includes('/block/') || jPath.includes('/blocks/');
          const isItem = jPath.includes('/item/') || jPath.includes('/items/');

          if (isBlock || isItem) {
            const bCategory = isBlock ? '/blocks/' : '/items/';
            const candidates = bPathList.filter(b => b.includes(bCategory) && b.endsWith('.png'));

            let bestMatch = '';
            let bestScore = 0;
            for (const cand of candidates) {
              const cName = path.basename(cand, '.png');
              const sim = scoreWordMatch(jName, cName) + (stringSimilarity.compareTwoStrings(jName, cName) * 0.5);
              if (sim > bestScore) {
                bestScore = sim;
                bestMatch = cand;
              }
            }
            if (bestScore >= 0.8 && bestMatch) { // Threshold for auto-match
              mappedBPath = bestMatch;
            }
          }
        }

        if (mappedBPath && bedrockSet.has(mappedBPath)) {
          newMapping.java_to_bedrock[jPath] = mappedBPath;
          newMapping.bedrock_to_java[mappedBPath] = jPath;
        }
      }

      // 2. Sound Mapping
      console.log(`  Fetching sounds JSON for ${jVer} <-> ${bVer}`);
      const javaSounds = await fetchSoundsJson('InventivetalentDev/minecraft-assets', jVer, 'assets/minecraft/sounds.json');
      const bedrockSounds = await fetchSoundsJson('Mojang/bedrock-samples', bVer, 'resource_pack/sounds/sound_definitions.json');

      if (javaSounds && bedrockSounds && bedrockSounds.sound_definitions) {
        const jEvents = Object.keys(javaSounds);
        const bEvents = Object.keys(bedrockSounds.sound_definitions);

        // Predefined crucial sound mappings
        const baseSoundMap: Record<string, string> = {
          "block.anvil.land": "random.anvil_land",
          "block.chest.open": "random.chestopen",
          "block.chest.close": "random.chestclosed",
          "entity.zombie.ambient": "mob.zombie.say",
          "entity.creeper.primed": "random.fuse",
          "entity.generic.explode": "random.explode"
        };

        for (const je of jEvents) {
          if (baseSoundMap[je] && bEvents.includes(baseSoundMap[je])) {
            newMapping.sounds_java_to_bedrock[je] = baseSoundMap[je];
            continue;
          }

          let bestMatch = '';
          let bestScore = 0;
          for (const be of bEvents) {
            const sim = scoreWordMatch(je, be) + (stringSimilarity.compareTwoStrings(je, be) * 0.5);
            if (sim > bestScore) {
              bestScore = sim;
              bestMatch = be;
            }
          }
          if (bestScore >= 0.9 && bestMatch) {
            newMapping.sounds_java_to_bedrock[je] = bestMatch;
          }
        }
      }

      const outFile = path.join(outDir, `${targetJavaVers[i]}_to_${targetBedrockVers[i]}.json`);
      await fs.writeFile(outFile, JSON.stringify(newMapping, null, 2));
      console.log(`  Saved mapping to ${outFile}`);
    } catch (e) {
      console.error(`  Failed to process ${jVer} <-> ${bVer}:`, e);
    }
  }
}

generateMappings().catch(console.error);
