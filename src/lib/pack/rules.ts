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
  { match: /^assets\/minecraft\/textures\/(.*)$/, replace: 'textures/$1' },
  { match: /^assets\/minecraft\/sounds\/(.*)$/, replace: 'sounds/$1' },
  { match: /^assets\/(minecraft|realms)\/lang\/(.*)\.json$/, replace: 'texts/$2.lang' },
  { match: /^assets\/realms\/textures\/(.*)$/, replace: 'textures/gui/realms/$1' },
  { match: /^pack\.png$/, replace: 'pack_icon.png' },
];

export const BEDROCK_TO_JAVA_RULES: PathRule[] = [
  { match: /^textures\/blocks\/(.*)$/, replace: 'assets/minecraft/textures/block/$1' },
  { match: /^textures\/items\/(.*)$/, replace: 'assets/minecraft/textures/item/$1' },
  { match: /^textures\/models\/armor\/(.*)_([12])\.png$/, replace: 'assets/minecraft/textures/models/armor/$1_layer_$2.png' },
  { match: /^textures\/entity\/(.*)$/, replace: 'assets/minecraft/textures/entity/$1' },
  { match: /^textures\/gui\/realms\/(.*)$/, replace: 'assets/realms/textures/$1' },
  { match: /^textures\/(.*)$/, replace: 'assets/minecraft/textures/$1' },
  { match: /^sounds\/(.*)$/, replace: 'assets/minecraft/sounds/$1' },
  { match: /^texts\/(.*)\.lang$/, replace: 'assets/minecraft/lang/$1.json' },
  { match: /^pack_icon\.png$/, replace: 'pack.png' },
];

export function getTargetContext(path: string, direction: ConversionDirection): string | null {
  // 1. Try exact mapping from the generated database
  const map: Record<string, string> = direction === 'java-to-bedrock'
    ? (mappings as any).java_to_bedrock
    : (mappings as any).bedrock_to_java;

  if (map[path]) {
    return map[path];
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
