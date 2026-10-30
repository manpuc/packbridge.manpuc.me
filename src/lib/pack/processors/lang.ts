import { getActiveMappings } from '../rules';
import { isUnsafeObjectKey } from '../security';

/**
 * Converts Java Edition language JSON to Bedrock Edition .lang format
 */
export function javaToBedrockLang(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return jsonContent;
    const active = getActiveMappings();
    const keyMap = active.lang_java_to_bedrock || {};

    let output = "";
    for (const [key, value] of Object.entries(data)) {
      if (isUnsafeObjectKey(key)) continue;
      // Map Java translation key to Bedrock equivalent if available
      const mappedKey = (Object.hasOwn(keyMap, key) ? keyMap[key] : undefined) || key;
      if (isUnsafeObjectKey(mappedKey)) continue;
      // Replace actual newlines with literal \n for Bedrock .lang
      const safeValue = String(value).replace(/\r?\n/g, "\\n");
      output += `${mappedKey}=${safeValue}\n`;
    }
    return output;
  } catch (e) {
    return jsonContent; // Fallback to raw if not valid JSON
  }
}

/**
 * Converts Bedrock Edition .lang format to Java Edition language JSON
 */
export function bedrockToJavaLang(langContent: string): string {
  const lines = langContent.split(/\r?\n/);
  const output: Record<string, string> = Object.create(null);
  const active = getActiveMappings();
  const keyMap = active.lang_bedrock_to_java || {};

  for (const line of lines) {
    const trimLine = line.trim();
    if (!trimLine || trimLine.startsWith('##') || trimLine.startsWith('#')) continue;

    const firstEquals = trimLine.indexOf('=');
    if (firstEquals !== -1) {
      const key = trimLine.substring(0, firstEquals).trim();
      if (isUnsafeObjectKey(key)) continue;
      const value = trimLine.substring(firstEquals + 1).trim();
      const mappedKey = (Object.hasOwn(keyMap, key) ? keyMap[key] : undefined) || key;
      if (isUnsafeObjectKey(mappedKey)) {
        continue;
      }
      output[mappedKey] = value;
    }
  }

  return JSON.stringify(output, null, 2);
}
