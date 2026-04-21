// Basic mapping for common sound event names between Java and Bedrock
const JAVA_TO_BEDROCK_EVENT_MAP: Record<string, string> = {
  "block.anvil.land": "random.anvil_land",
  "block.anvil.use": "random.anvil_use",
  "block.anvil.break": "random.anvil_break",
  "block.chest.open": "random.chestopen",
  "block.chest.close": "random.chestclosed",
  "ui.button.click": "random.click",
  "entity.generic.eat": "random.eat",
  "entity.generic.drink": "random.drink",
  "entity.experience_orb.pickup": "random.orb",
  "entity.player.levelup": "random.levelup",
  "entity.item.break": "random.break",
  "block.end_portal_frame.fill": "block.end_portal_frame.fill",
  "block.end_portal.spawn": "block.end_portal.spawn",
  "entity.tnt.primed": "random.fuse",
  "entity.genric.explode": "random.explode",
  "entity.bobber.retrieve": "random.bowhit",
  "entity.bobber.throw": "random.bow",
  "entity.bobber.splash": "random.splash",
  "entity.arrow.hit": "random.bowhit",
  "entity.arrow.hit_player": "random.bowhit",
  "entity.arrow.shoot": "random.bow",
};

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

      // Map the event name if a mapping exists, otherwise use the original
      const mappedEvent = JAVA_TO_BEDROCK_EVENT_MAP[soundEvent] || soundEvent.replace(/\./g, '.');

      bedrockData.sound_definitions[mappedEvent] = {
        category: data.category || "neutral",
        sounds: bSounds
      };
    }

    return JSON.stringify(bedrockData, null, 2);
  } catch (e) {
    return jsonContent;
  }
}
