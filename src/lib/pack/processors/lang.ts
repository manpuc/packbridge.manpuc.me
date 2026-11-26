import { getActiveMappings, getFallbackMappings } from '../rules';
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

export function mapLangEntries(
  entries: Map<string, string>,
  direction: 'java-to-bedrock' | 'bedrock-to-java' | 'identity'
): Map<string, string> {
  if (direction === 'identity') return new Map(entries);

  const active = getActiveMappings();
  const fallback = getFallbackMappings();
  const activeMap = direction === 'java-to-bedrock' ? active.lang_java_to_bedrock : active.lang_bedrock_to_java;
  const fallbackMap = direction === 'java-to-bedrock' ? fallback.lang_java_to_bedrock : fallback.lang_bedrock_to_java;

  const mapped = new Map<string, string>();
  for (const [key, value] of entries) {
    const mappedKey =
      (activeMap && Object.hasOwn(activeMap, key) ? activeMap[key] : undefined) ||
      (fallbackMap && Object.hasOwn(fallbackMap, key) ? fallbackMap[key] : undefined) ||
      key;
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
