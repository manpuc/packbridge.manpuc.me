import { getActiveMappings } from '../rules';
import { isUnsafeObjectKey } from '../security';

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
    if (!javaData || typeof javaData !== 'object' || Array.isArray(javaData)) return jsonContent;
    const bedrockData: any = {
      format_version: "1.14.0",
      sound_definitions: Object.create(null)
    };

    const active = getActiveMappings();
    for (const [soundEvent, data] of Object.entries(javaData) as [string, any][]) {
      if (isUnsafeObjectKey(soundEvent) || !data || typeof data !== 'object') continue;
      const bSounds = (Array.isArray(data.sounds) ? data.sounds : []).map((s: any) => {
        if (typeof s === 'string') {
          return s.startsWith('sounds/') ? s : `sounds/${s}`;
        }
        if (!s || typeof s !== 'object') return s;
        // Preserve object properties (volume, pitch, weight)
        const newObj = { ...s };
        const name = typeof s.name === 'string' ? s.name : "";
        newObj.name = name.startsWith('sounds/') ? name : `sounds/${name}`;
        return newObj;
      });

      // Map the event name using dynamic mappings first, then fallback
      const dynamicMapped = active.sounds_java_to_bedrock && Object.hasOwn(active.sounds_java_to_bedrock, soundEvent)
        ? active.sounds_java_to_bedrock[soundEvent]
        : undefined;
      const fallbackMapped = Object.hasOwn(JAVA_TO_BEDROCK_EVENT_MAP, soundEvent)
        ? JAVA_TO_BEDROCK_EVENT_MAP[soundEvent]
        : undefined;
      const mappedEvent = dynamicMapped || fallbackMapped || soundEvent;
      if (isUnsafeObjectKey(mappedEvent)) continue;

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
    if (!bedrockData || typeof bedrockData !== 'object') return jsonContent;
    const javaData: any = Object.create(null);
    const definitions = (bedrockData.sound_definitions && typeof bedrockData.sound_definitions === 'object')
      ? bedrockData.sound_definitions
      : {};

    const BEDROCK_TO_JAVA_EVENT_MAP: Record<string, string> = Object.entries(JAVA_TO_BEDROCK_EVENT_MAP).reduce((acc, [j, b]) => {
      // Keep only the first mapping found if there are duplicates
      if (!acc[b]) acc[b] = j;
      return acc;
    }, Object.create(null) as Record<string, string>);

    const active = getActiveMappings();
    for (const [soundEvent, data] of Object.entries(definitions) as [string, any][]) {
      if (isUnsafeObjectKey(soundEvent) || !data || typeof data !== 'object') continue;
      const jSounds = (Array.isArray(data.sounds) ? data.sounds : []).map((s: any) => {
        if (typeof s === 'string') {
          return s.replace(/^sounds\//, '');
        }
        if (!s || typeof s !== 'object') return s;
        const newObj = { ...s };
        const name = typeof s.name === 'string' ? s.name : "";
        newObj.name = name.replace(/^sounds\//, '');
        return newObj;
      });

      // Build reverse dynamic map on the fly if provided
      let dynamicMapped: string | undefined;
      if (active.sounds_bedrock_to_java && Object.hasOwn(active.sounds_bedrock_to_java, soundEvent)) {
        dynamicMapped = active.sounds_bedrock_to_java[soundEvent];
      } else if (active.sounds_java_to_bedrock) {
        const jKey = Object.keys(active.sounds_java_to_bedrock).find(k => active.sounds_java_to_bedrock![k] === soundEvent);
        if (jKey) dynamicMapped = jKey;
      }

      const mappedEvent = dynamicMapped || BEDROCK_TO_JAVA_EVENT_MAP[soundEvent] || soundEvent;
      if (isUnsafeObjectKey(mappedEvent)) continue;

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
