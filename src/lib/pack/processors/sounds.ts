/**
 * Converts Java Edition sounds.json to Bedrock Edition sound_definitions.json
 */
export function javaToBedrockSounds(jsonContent: string): string {
  try {
    const javaData = JSON.parse(jsonContent);
    const bedrockData: any = {
      format_version: "1.21.0",
      sound_definitions: {}
    };

    for (const [soundEvent, data] of Object.entries(javaData) as [string, any][]) {
      const bSounds = (data.sounds || []).map((s: any) => {
        const name = typeof s === 'string' ? s : s.name;
        // Prepend sounds/ if not present
        return name.startsWith('sounds/') ? name : `sounds/${name}`;
      });

      bedrockData.sound_definitions[soundEvent] = {
        category: data.category || "neutral",
        sounds: bSounds
      };
    }

    return JSON.stringify(bedrockData, null, 2);
  } catch (e) {
    return jsonContent;
  }
}
