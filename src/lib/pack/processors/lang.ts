import { getActiveMappings, getFallbackMappings, getLegacyJavaMappings } from '../rules';
import { isUnsafeObjectKey } from '../security';
import { parseJsonc } from '../metadata';

export function formatLocaleCode(code: string, style: 'll_CC' | 'll_cc'): string {
  const trimmed = code.trim();
  if (style === 'll_cc') return trimmed.toLowerCase();
  const parts = trimmed.split('_');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
  }
  return trimmed.toLowerCase();
}

export function parseLangEntries(langContent: string, unescapeNewlines: boolean): Map<string, string> {
  const lines = langContent.replace(/^\uFEFF/, '').split(/\r?\n/);
  const entries = new Map<string, string>();

  for (const line of lines) {
    const trimmedStart = line.trimStart();
    if (!trimmedStart || trimmedStart.startsWith('#')) continue;

    const firstEquals = line.indexOf('=');
    if (firstEquals <= 0) continue;

    const key = line.slice(0, firstEquals).trim();
    if (!key || isUnsafeObjectKey(key)) continue;

    let value = line.slice(firstEquals + 1);
    const commentMatch = value.match(/\t#|##/);
    if (commentMatch && commentMatch.index !== undefined) {
      value = value.slice(0, commentMatch.index).replace(/\t+$/, '');
    }
    if (unescapeNewlines) {
      value = value.replace(/\\n|~LINEBREAK~/g, '\n');
    }
    entries.set(key, value);
  }

  return entries;
}

export function parseJsonLangEntries(jsonContent: string): Map<string, string> | null {
  try {
    const data = parseJsonc(jsonContent);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

    const entries = new Map<string, string>();
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'string') continue;
      if (!key.trim() || key.includes('=') || /[\r\n]/.test(key) || isUnsafeObjectKey(key)) continue;
      entries.set(key, value);
    }
    return entries;
  } catch {
    return null;
  }
}

export interface MapLangOptions {
  legacyJava?: boolean;
  allowModernFallback?: boolean;
}

const LEGACY_JAVA_TO_MODERN_OVERRIDES: Record<string, string> = {
  'tile.wood.oak.name': 'block.minecraft.oak_planks',
  'tile.wood.spruce.name': 'block.minecraft.spruce_planks',
  'tile.wood.birch.name': 'block.minecraft.birch_planks',
  'tile.wood.jungle.name': 'block.minecraft.jungle_planks',
  'tile.wood.acacia.name': 'block.minecraft.acacia_planks',
  'tile.grass.name': 'block.minecraft.grass_block',
};

const MODERN_TO_LEGACY_JAVA_OVERRIDES: Record<string, string> = {
  'block.minecraft.oak_planks': 'tile.wood.oak.name',
  'block.minecraft.spruce_planks': 'tile.wood.spruce.name',
  'block.minecraft.birch_planks': 'tile.wood.birch.name',
  'block.minecraft.jungle_planks': 'tile.wood.jungle.name',
  'block.minecraft.acacia_planks': 'tile.wood.acacia.name',
  'block.minecraft.grass_block': 'tile.grass.name',
};

export function mapLangEntries(
  entries: Map<string, string>,
  direction: 'java-to-bedrock' | 'bedrock-to-java' | 'identity',
  options?: MapLangOptions
): Map<string, string> {
  if (direction === 'identity') return new Map(entries);

  const active = getActiveMappings();
  const fallback = getFallbackMappings();
  const legacy = getLegacyJavaMappings();

  const mapped = new Map<string, string>();
  for (const [key, value] of entries) {
    let mappedKey = key;
    if (direction === 'java-to-bedrock') {
      if (options?.legacyJava) {
        mappedKey =
          (legacy?.lang_java_to_bedrock && Object.hasOwn(legacy.lang_java_to_bedrock, key)
            ? legacy.lang_java_to_bedrock[key]
            : undefined) ||
          (active.lang_java_to_bedrock && Object.hasOwn(active.lang_java_to_bedrock, key)
            ? active.lang_java_to_bedrock[key]
            : undefined) ||
          key;
      } else {
        mappedKey =
          (active.lang_java_to_bedrock && Object.hasOwn(active.lang_java_to_bedrock, key)
            ? active.lang_java_to_bedrock[key]
            : undefined) ||
          (fallback.lang_java_to_bedrock && Object.hasOwn(fallback.lang_java_to_bedrock, key)
            ? fallback.lang_java_to_bedrock[key]
            : undefined) ||
          key;
      }
    } else {
      const allowModern = options?.allowModernFallback !== false;
      const activeMap = !allowModern && active === fallback ? undefined : active.lang_bedrock_to_java;
      const secondaryMap = allowModern ? fallback.lang_bedrock_to_java : legacy?.lang_bedrock_to_java;
      mappedKey =
        (activeMap && Object.hasOwn(activeMap, key) ? activeMap[key] : undefined) ||
        (secondaryMap && Object.hasOwn(secondaryMap, key) ? secondaryMap[key] : undefined) ||
        key;
    }
    if (isUnsafeObjectKey(mappedKey)) continue;
    mapped.set(mappedKey, value);
  }
  return mapped;
}

export function mapJavaLangEntries(
  entries: Map<string, string>,
  direction: '1.12-to-1.13' | '1.13-to-1.12'
): Map<string, string> {
  const legacy = getLegacyJavaMappings();
  const modern = getFallbackMappings();
  const mapped = new Map<string, string>();

  for (const [key, value] of entries) {
    let mappedKey = key;
    if (direction === '1.13-to-1.12') {
      if (Object.hasOwn(MODERN_TO_LEGACY_JAVA_OVERRIDES, key)) {
        mappedKey = MODERN_TO_LEGACY_JAVA_OVERRIDES[key];
      } else if (legacy?.lang_java_to_bedrock && Object.hasOwn(legacy.lang_java_to_bedrock, key)) {
        mappedKey = key;
      } else {
        const bKey = modern.lang_java_to_bedrock && Object.hasOwn(modern.lang_java_to_bedrock, key)
          ? modern.lang_java_to_bedrock[key]
          : undefined;
        if (bKey) {
          mappedKey =
            legacy?.lang_bedrock_to_java && Object.hasOwn(legacy.lang_bedrock_to_java, bKey)
              ? legacy.lang_bedrock_to_java[bKey]
              : bKey;
        }
      }
    } else {
      if (Object.hasOwn(LEGACY_JAVA_TO_MODERN_OVERRIDES, key)) {
        mappedKey = LEGACY_JAVA_TO_MODERN_OVERRIDES[key];
      } else if (modern.lang_java_to_bedrock && Object.hasOwn(modern.lang_java_to_bedrock, key)) {
        mappedKey = key;
      } else {
        const bKey =
          legacy?.lang_java_to_bedrock && Object.hasOwn(legacy.lang_java_to_bedrock, key)
            ? legacy.lang_java_to_bedrock[key]
            : key;
        mappedKey =
          modern.lang_bedrock_to_java && Object.hasOwn(modern.lang_bedrock_to_java, bKey)
            ? modern.lang_bedrock_to_java[bKey]
            : key;
      }
    }
    if (isUnsafeObjectKey(mappedKey)) continue;
    mapped.set(mappedKey, value);
  }
  return mapped;
}

export function serializeLangEntries(entries: Map<string, string>): string {
  let output = '';
  for (const [key, value] of entries) {
    output += `${key}=${value.replace(/\r?\n/g, '\\n')}\n`;
  }
  return output;
}

export function serializeJsonLangEntries(entries: Map<string, string>): string {
  const output: Record<string, string> = Object.create(null);
  for (const [key, value] of entries) {
    if (isUnsafeObjectKey(key)) continue;
    output[key] = value;
  }
  return JSON.stringify(output, null, 2);
}
