import { getActiveMappings } from '../rules';

// Basic mapping for common sound event names between Java and Bedrock (fallback)
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
  "entity.generic.explode": "random.explode",
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
      format_version: "1.14.0",
      sound_definitions: {}
    };

    for (const [soundEvent, data] of Object.entries(javaData) as [string, any][]) {
      const bSounds = (data.sounds || []).map((s: any) => {
        if (typeof s === 'string') {
          return s.startsWith('sounds/') ? s : `sounds/${s}`;
        }
        // Preserve object properties (volume, pitch, weight)
        const newObj = { ...s };
        const name = s.name || "";
        newObj.name = name.startsWith('sounds/') ? name : `sounds/${name}`;
        // Optional: convert stream to load_on_join if needed (skipping for now to just preserve standard props)
        return newObj;
      });

      // Map the event name using dynamic mappings first, then fallback
      const active = getActiveMappings();
      const dynamicMapped = active.sounds_java_to_bedrock ? active.sounds_java_to_bedrock[soundEvent] : undefined;
      const mappedEvent = dynamicMapped || JAVA_TO_BEDROCK_EVENT_MAP[soundEvent] || soundEvent;

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

/**
 * Converts Bedrock Edition sound_definitions.json to Java Edition sounds.json
 */
export function bedrockToJavaSounds(jsonContent: string): string {
  try {
    const bedrockData = JSON.parse(jsonContent);
    const javaData: any = {};
    const definitions = bedrockData.sound_definitions || {};

    const BEDROCK_TO_JAVA_EVENT_MAP: Record<string, string> = Object.entries(JAVA_TO_BEDROCK_EVENT_MAP).reduce((acc, [j, b]) => {
      // Keep only the first mapping found if there are duplicates
      if (!acc[b]) acc[b] = j;
      return acc;
    }, {} as Record<string, string>);

    for (const [soundEvent, data] of Object.entries(definitions) as [string, any][]) {
      const jSounds = (data.sounds || []).map((s: any) => {
        if (typeof s === 'string') {
          return s.replace(/^sounds\//, '');
        }
        const newObj = { ...s };
        const name = s.name || "";
        newObj.name = name.replace(/^sounds\//, '');
        return newObj;
      });

      // Build reverse dynamic map on the fly if provided
      const active = getActiveMappings();
      let dynamicMapped: string | undefined;
      if (active.sounds_java_to_bedrock) {
        // Ideally sounds_bedrock_to_java would be pre-built, but we can search reverse
        const jKey = Object.keys(active.sounds_java_to_bedrock).find(k => active.sounds_java_to_bedrock![k] === soundEvent);
        if (jKey) dynamicMapped = jKey;
      }

      const mappedEvent = dynamicMapped || BEDROCK_TO_JAVA_EVENT_MAP[soundEvent] || soundEvent;

      javaData[mappedEvent] = {
        category: data.category || "neutral",
        sounds: jSounds
      };
    }

    return JSON.stringify(javaData, null, 2);
  } catch (e) {
    return jsonContent;
  }
}
