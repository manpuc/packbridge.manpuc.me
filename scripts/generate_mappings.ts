import fs from 'fs/promises';
import path from 'path';

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.json();
}

async function getJavaVersions() {
  const branches = await fetchJson('https://api.github.com/repos/InventivetalentDev/minecraft-assets/branches');
  return branches.map((b: any) => b.name);
}

async function getBedrockVersions() {
  const tags = await fetchJson('https://api.github.com/repos/Mojang/bedrock-samples/tags?per_page=100');
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

async function getLocalFiles(dir: string, prefix: string = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await getLocalFiles(fullPath, relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

async function generateMappings() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');

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

  if (isLocal) {
    console.log("Running in local mode...");
    const javaDirIdx = args.indexOf('--local-java');
    const bedrockDirIdx = args.indexOf('--local-bedrock');
    const outIdx = args.indexOf('--out');
    
    if (javaDirIdx === -1 || bedrockDirIdx === -1) {
      console.error("Usage: npx tsx generate_mappings.ts --local --local-java <path> --local-bedrock <path> [--out <name>]");
      return;
    }

    const javaDir = args[javaDirIdx + 1];
    const bedrockDir = args[bedrockDirIdx + 1];
    const outFile = outIdx !== -1 ? args[outIdx + 1] : 'local_mapping.json';

    try {
      const javaFilesRaw = await getLocalFiles(javaDir);
      const bedrockFilesRaw = await getLocalFiles(bedrockDir);

      // Filter local files just like remote ones
      const javaFiles = javaFilesRaw.filter(p => p.startsWith('assets/minecraft/'));
      const bedrockFiles = bedrockFilesRaw; // Bedrock is usually the root of resource_pack
      const bedrockSet = new Set(bedrockFiles);

      const newMapping = {
        java_to_bedrock: {} as Record<string, string>,
        bedrock_to_java: {} as Record<string, string>
      };

      for (const jPath of javaFiles) {
        const mappedBPath = normalizedBase.java_to_bedrock[jPath];
        if (mappedBPath && bedrockSet.has(mappedBPath)) {
          newMapping.java_to_bedrock[jPath] = mappedBPath;
          newMapping.bedrock_to_java[mappedBPath] = jPath;
        }
      }

      const outPath = path.join(outDir, outFile);
      await fs.writeFile(outPath, JSON.stringify(newMapping, null, 2));
      console.log(`Saved local mapping to ${outPath}`);
    } catch (e) {
      console.error("Local mapping generation failed:", e);
    }
    return;
  }

  console.log("Fetching available versions from GitHub...");
  const javaAvailable = await getJavaVersions();
  const bedrockAvailable = await getBedrockVersions();

  const targetJavaVers = ['1.21.4', '1.20.4', '1.19.4', '1.18.2', '1.17.1', '1.16.5'];
  const targetBedrockVers = ['1.21.50', '1.20.80', '1.19.80', '1.18.30', '1.17.40', '1.16.200'];

  for (let i = 0; i < targetJavaVers.length; i++) {
    const jVer = findClosestVersion(targetJavaVers[i], javaAvailable);
    const bVer = findClosestVersion(targetBedrockVers[i], bedrockAvailable);

    console.log(`Processing mapping for Java ${jVer} <-> Bedrock ${bVer}...`);
    try {
      const javaTree = await fetchJson(`https://api.github.com/repos/InventivetalentDev/minecraft-assets/git/trees/${jVer}?recursive=1`);
      const bedrockTree = await fetchJson(`https://api.github.com/repos/Mojang/bedrock-samples/git/trees/${bVer}?recursive=1`);

      const javaFiles = javaTree.tree.filter((t: any) => t.type === 'blob' && t.path.startsWith('assets/minecraft/')).map((t: any) => t.path);
      const bedrockFiles = bedrockTree.tree.filter((t: any) => t.type === 'blob' && t.path.startsWith('resource_pack/')).map((t: any) => t.path.replace('resource_pack/', ''));
      const bedrockSet = new Set(bedrockFiles);

      const newMapping = {
        java_to_bedrock: {} as Record<string, string>,
        bedrock_to_java: {} as Record<string, string>
      };

      for (const jPath of javaFiles) {
        const mappedBPath = normalizedBase.java_to_bedrock[jPath];
        if (mappedBPath && bedrockSet.has(mappedBPath)) {
          newMapping.java_to_bedrock[jPath] = mappedBPath;
          newMapping.bedrock_to_java[mappedBPath] = jPath;
        }
      }

      const outFile = path.join(outDir, `${targetJavaVers[i]}_to_${targetBedrockVers[i]}.json`);
      await fs.writeFile(outFile, JSON.stringify(newMapping, null, 2));
      console.log(`Saved mapping to ${outFile}`);
    } catch (e) {
      console.error(`Failed to process ${jVer} <-> ${bVer}:`, e);
    }
  }
}

generateMappings().catch(console.error);
