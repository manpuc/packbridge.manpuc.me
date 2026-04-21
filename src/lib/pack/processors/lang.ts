/**
 * Converts Java Edition language JSON to Bedrock Edition .lang format
 */
export function javaToBedrockLang(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    let output = "";
    for (const [key, value] of Object.entries(data)) {
      output += `${key}=${value}\n`;
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
  const lines = langContent.split('\n');
  const output: Record<string, string> = {};

  for (const line of lines) {
    const trimLine = line.trim();
    if (!trimLine || trimLine.startsWith('##') || trimLine.startsWith('#')) continue;

    const firstEquals = trimLine.indexOf('=');
    if (firstEquals !== -1) {
      const key = trimLine.substring(0, firstEquals).trim();
      const value = trimLine.substring(firstEquals + 1).trim();
      output[key] = value;
    }
  }

  return JSON.stringify(output, null, 2);
}
