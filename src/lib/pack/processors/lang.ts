import { getActiveMappings } from '../rules';

/**
 * Converts Java Edition language JSON to Bedrock Edition .lang format
 */
export function javaToBedrockLang(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    const active = getActiveMappings();
    const keyMap = active.lang_java_to_bedrock || {};

    let output = "";
    for (const [key, value] of Object.entries(data)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      // Map Java translation key to Bedrock equivalent if available
      const mappedKey = keyMap[key] || key;
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
      const value = trimLine.substring(firstEquals + 1).trim();
      const mappedKey = keyMap[key] || key;
      if (mappedKey === '__proto__' || mappedKey === 'constructor' || mappedKey === 'prototype') {
        continue;
      }
      output[mappedKey] = value;
    }
  }

  return JSON.stringify(output, null, 2);
}
