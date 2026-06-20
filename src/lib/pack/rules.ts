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
  { match: /^assets\/minecraft\/texts\/splashes\.txt$/, replace: 'texts/splashes.json' },
  { match: /^pack\.png$/, replace: 'pack_icon.png' },
];

export const BEDROCK_TO_JAVA_RULES: PathRule[] = [
  { match: /^textures\/blocks\/(.*)$/, replace: 'assets/minecraft/textures/block/$1' },
  { match: /^textures\/items\/(.*)$/, replace: 'assets/minecraft/textures/item/$1' },
  { match: /^textures\/models\/armor\/(.*)_([12])\.png$/, replace: 'assets/minecraft/textures/models/armor/$1_layer_$2.png' },
  { match: /^textures\/entity\/(.*)$/, replace: 'assets/minecraft/textures/entity/$1' },
  { match: /^textures\/gui\/realms\/(.*)$/, replace: 'assets/realms/textures/$1' },
  { match: /^textures\/ui\/(.*)$/, replace: 'assets/minecraft/textures/gui/$1' },
  { match: /^textures\/(.*)$/, replace: 'assets/minecraft/textures/$1' },
  { match: /^sounds\/(.*)$/, replace: 'assets/minecraft/sounds/$1' },
  { match: /^texts\/(.*)\.lang$/, replace: 'assets/minecraft/lang/$1.json' },
  { match: /^pack_icon\.png$/, replace: 'pack.png' },
];

interface MappingsData {
  java_to_bedrock: Record<string, string>;
  bedrock_to_java: Record<string, string>;
}

const typedMappings = mappings as MappingsData;
let activeMappings: MappingsData = { java_to_bedrock: {}, bedrock_to_java: {} };
let fallbackMappings: MappingsData = typedMappings; // The global mappings.json as fallback
export async function loadMappings(javaVersionId?: string, bedrockVersionId?: string) {
  if (!javaVersionId || !bedrockVersionId) {
    activeMappings = fallbackMappings;
    return;
  }
  
  // Clean versions for the filename format used by the script
  const jClean = javaVersionId; // e.g. '1.20.4' or '1.21.0'
  const bClean = bedrockVersionId; // e.g. '1.20.80'
  
  try {
    // Attempt to load the specific mapping file dynamically
    // In a browser/vite context, we can fetch it from public dir, or use dynamic import.
    // For now, if we assume they are bundled or available via dynamic import:
    // This requires Vite to bundle them, which we can do using an explicit import or fetch.
    const mapModule = await import(`./mappings/${jClean}_to_${bClean}.json`);
    activeMappings = mapModule.default;
  } catch (e) {
    console.warn(`Could not load specific mapping for ${jClean} <-> ${bClean}. Falling back to default mappings.`);
    activeMappings = fallbackMappings;
  }
}

export function getTargetContext(path: string, direction: ConversionDirection): string | null {
  // Normalize path for mappings.json lookup since mappings.json incorrectly uses 'assets/textures/...' instead of 'assets/minecraft/textures/...'
  const lookupPath = direction === 'java-to-bedrock' 
    ? path.replace(/^assets\/minecraft\//, 'assets/') 
    : path;

  // 1. Try exact mapping from the generated database
  const map = direction === 'java-to-bedrock'
    ? activeMappings.java_to_bedrock
    : activeMappings.bedrock_to_java;

  const exactMatch = map[lookupPath] || (direction === 'java-to-bedrock' ? fallbackMappings.java_to_bedrock[lookupPath] : fallbackMappings.bedrock_to_java[lookupPath]);
  if (exactMatch) {
    if (direction === 'bedrock-to-java') {
      // Map returns 'assets/textures/...', needs to be 'assets/minecraft/textures/...'
      return exactMatch.replace(/^assets\//, 'assets/minecraft/');
    }
    return exactMatch;
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
