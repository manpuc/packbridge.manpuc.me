import type { ConversionDirection } from './types';
import mappings from './mappings.json';

export interface PathRule {
  match: RegExp;
  replace: string;
}

export const JAVA_TO_BEDROCK_RULES: PathRule[] = [
  // Keeping generic regex rules as fallback
  { match: /^assets\/minecraft\/textures\/blocks?\/(.*)$/, replace: 'textures/blocks/$1' },
  { match: /^assets\/minecraft\/textures\/items?\/(.*)$/, replace: 'textures/items/$1' },
  { match: /^assets\/minecraft\/textures\/models\/armor\/(.*)_layer_([12])\.png$/, replace: 'textures/models/armor/$1_$2.png' },
  { match: /^assets\/minecraft\/textures\/entity\/(.*)$/, replace: 'textures/entity/$1' },
  { match: /^assets\/minecraft\/textures\/gui\/(.*)$/, replace: 'textures/ui/$1' },
  { match: /^assets\/minecraft\/textures\/(.*)\.mcmeta$/, replace: 'textures/$1.mcmeta' },
  { match: /^assets\/minecraft\/textures\/(.*)$/, replace: 'textures/$1' },
  { match: /^assets\/minecraft\/sounds\/(.*)$/, replace: 'sounds/$1' },
  { match: /^assets\/(minecraft|realms)\/lang\/(.*)\.json$/, replace: 'texts/$2.lang' },
  { match: /^assets\/realms\/textures\/(.*)$/, replace: 'textures/gui/realms/$1' },
  { match: /^assets\/minecraft\/models\/block\/(.*)\.json$/, replace: 'models/entity/block_$1.geo.json' },
  { match: /^assets\/minecraft\/models\/item\/(.*)\.json$/, replace: 'models/entity/item_$1.geo.json' },
  { match: /^assets\/minecraft\/texts\/splashes\.txt$/, replace: 'texts/splashes.json' },
  { match: /^pack\.png$/, replace: 'pack_icon.png' },
];

export const BEDROCK_TO_JAVA_RULES: PathRule[] = [
  { match: /^textures\/blocks?\/(.*)\.(png|tga)$/, replace: 'assets/minecraft/textures/block/$1.png' },
  { match: /^textures\/items?\/(.*)\.(png|tga)$/, replace: 'assets/minecraft/textures/item/$1.png' },
  { match: /^textures\/models\/armor\/(.*)_(layer_)?([12])\.(png|tga)$/, replace: 'assets/minecraft/textures/models/armor/$1_layer_$3.png' },
  { match: /^textures\/entity\/(.*)\.(png|tga)$/, replace: 'assets/minecraft/textures/entity/$1.png' },
  { match: /^textures\/gui\/realms\/(.*)\.(png|tga)$/, replace: 'assets/realms/textures/$1.png' },
  { match: /^textures\/ui\/(.*)\.(png|tga)$/, replace: 'assets/minecraft/textures/gui/$1.png' },
  { match: /^textures\/(.*)\.(png|tga)$/, replace: 'assets/minecraft/textures/$1.png' },
  { match: /^sounds\/(.*)$/, replace: 'assets/minecraft/sounds/$1' },
  { match: /^texts\/(.*)\.lang$/, replace: 'assets/minecraft/lang/$1.json' },
  { match: /^models\/entity\/block_(.*)\.geo\.json$/, replace: 'assets/minecraft/models/block/$1.json' },
  { match: /^models\/entity\/item_(.*)\.geo\.json$/, replace: 'assets/minecraft/models/item/$1.json' },
  { match: /^pack_icon\.(png|tga)$/, replace: 'pack.png' },
  { match: /^pack\.png$/, replace: 'pack.png' },
];

interface MappingsData {
  java_to_bedrock: Record<string, string>;
  bedrock_to_java: Record<string, string>;
  sounds_java_to_bedrock?: Record<string, string>;
  sounds_bedrock_to_java?: Record<string, string>;
  lang_java_to_bedrock?: Record<string, string>;
  lang_bedrock_to_java?: Record<string, string>;
}

const typedMappings = mappings as MappingsData;
let activeMappings: MappingsData = { java_to_bedrock: {}, bedrock_to_java: {} };
const fallbackMappings: MappingsData = typedMappings; // The global mappings.json as fallback

const mappingModules = import.meta.glob<{ default: MappingsData }>('./mappings/*.json');

function parseSemver(v: string): [number, number, number] {
  const parts = v.split('.').map(n => parseInt(n, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function versionDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) * 1000000 + Math.abs(a[1] - b[1]) * 1000 + Math.abs(a[2] - b[2]);
}

function resolveBestMappingLoader(javaVersionId: string, bedrockVersionId: string) {
  const exactKey = `./mappings/${javaVersionId}_to_${bedrockVersionId}.json`;
  if (Object.hasOwn(mappingModules, exactKey)) {
    return mappingModules[exactKey];
  }

  const targetJ = parseSemver(javaVersionId);
  const targetB = parseSemver(bedrockVersionId);
  let bestKey: string | null = null;
  let bestScore = Infinity;

  for (const key of Object.keys(mappingModules)) {
    const m = key.match(/^\.\/mappings\/([^/]+)_to_([^/]+)\.json$/);
    if (!m) continue;
    const candJ = parseSemver(m[1]);
    const candB = parseSemver(m[2]);
    const score = versionDistance(targetJ, candJ) + versionDistance(targetB, candB);
    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestKey ? mappingModules[bestKey] : null;
}

export function getActiveMappings(): MappingsData {
  return activeMappings;
}

export function getFallbackMappings(): MappingsData {
  return fallbackMappings;
}

export async function loadMappings(javaVersionId?: string, bedrockVersionId?: string) {
  if (!javaVersionId || !bedrockVersionId) {
    activeMappings = fallbackMappings;
    return;
  }

  try {
    const loader = resolveBestMappingLoader(javaVersionId, bedrockVersionId);
    if (loader) {
      const mapModule = await loader();
      activeMappings = mapModule.default;
      return;
    }
  } catch (e) {
    console.warn(`Could not load specific mapping for ${javaVersionId} <-> ${bedrockVersionId}. Falling back to default mappings.`);
  }
  activeMappings = fallbackMappings;
}

export function getTargetContext(path: string, direction: ConversionDirection): string | null {
  if (direction === 'java-to-java' || direction === 'bedrock-to-bedrock') {
    return path;
  }

  if (direction === 'java-to-bedrock') {
    // Active version mapping uses full Java path ('assets/minecraft/...')
    if (Object.hasOwn(activeMappings.java_to_bedrock, path)) {
      return activeMappings.java_to_bedrock[path];
    }
    // Fallback mapping uses normalized path ('assets/...')
    const lookupPath = path.replace(/^assets\/minecraft\//, 'assets/');
    if (Object.hasOwn(fallbackMappings.java_to_bedrock, lookupPath)) {
      return fallbackMappings.java_to_bedrock[lookupPath];
    }
  } else if (direction === 'bedrock-to-java') {
    // Active version mapping returns full Java path ('assets/minecraft/...')
    if (Object.hasOwn(activeMappings.bedrock_to_java, path)) {
      return activeMappings.bedrock_to_java[path];
    }
    // Fallback mapping returns 'assets/textures/...' (needs 'assets/minecraft/')
    if (Object.hasOwn(fallbackMappings.bedrock_to_java, path)) {
      const match = fallbackMappings.bedrock_to_java[path];
      return match.startsWith('assets/minecraft/') ? match : match.replace(/^assets\//, 'assets/minecraft/');
    }
  }

  // 2. Fallback to regex rules for patterns
  const rules = direction === 'java-to-bedrock' ? JAVA_TO_BEDROCK_RULES : BEDROCK_TO_JAVA_RULES;

  for (const rule of rules) {
    if (rule.match.test(path)) {
      return path.replace(rule.match, rule.replace);
    }
  }

  return null;
}
