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

function stripJsonComments(str: string): string {
  return str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalizeJavaSoundValue(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val;
  if (Array.isArray(val) && val.length > 0) {
    const nums = val.map(Number).filter(n => Number.isFinite(n) && n > 0);
    if (nums.length > 0) return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
  return fallback;
}

/**
 * Converts Bedrock Edition sound_definitions.json to Java Edition sounds.json
 */
export function bedrockToJavaSounds(jsonContent: string): string {
  try {
    const bedrockData = JSON.parse(stripJsonComments(jsonContent));
    if (!bedrockData || typeof bedrockData !== 'object') return '{}';
    const javaData: any = Object.create(null);
    const definitions = (bedrockData.sound_definitions && typeof bedrockData.sound_definitions === 'object')
      ? bedrockData.sound_definitions
      : (bedrockData.format_version ? {} : bedrockData);

    const BEDROCK_TO_JAVA_EVENT_MAP: Record<string, string> = Object.entries(JAVA_TO_BEDROCK_EVENT_MAP).reduce((acc, [j, b]) => {
      if (!acc[b]) acc[b] = j;
      return acc;
    }, Object.create(null) as Record<string, string>);

    const active = getActiveMappings();
    for (const [soundEvent, data] of Object.entries(definitions) as [string, any][]) {
      if (isUnsafeObjectKey(soundEvent) || !data || typeof data !== 'object' || !Array.isArray(data.sounds)) continue;
      const jSounds = data.sounds
        .map((s: any) => {
          if (typeof s === 'string') {
            const clean = s.replace(/^sounds\//i, '').replace(/\.(ogg|fsb|wav|mp3)$/i, '').toLowerCase();
            return /^[a-z0-9/._-]+$/.test(clean) ? clean : null;
          }
          if (!s || typeof s !== 'object' || typeof s.name !== 'string') return null;
          const cleanName = s.name.replace(/^sounds\//i, '').replace(/\.(ogg|fsb|wav|mp3)$/i, '').toLowerCase();
          if (!/^[a-z0-9/._-]+$/.test(cleanName)) return null;
          const newObj: Record<string, any> = { name: cleanName };
          if (s.volume !== undefined) newObj.volume = normalizeJavaSoundValue(s.volume, 1.0);
          if (s.pitch !== undefined) newObj.pitch = normalizeJavaSoundValue(s.pitch, 1.0);
          if (typeof s.weight === 'number' && s.weight >= 1) newObj.weight = Math.round(s.weight);
          if (typeof s.stream === 'boolean') newObj.stream = s.stream;
          if (typeof s.load_on_low_memory === 'boolean') newObj.stream = s.load_on_low_memory;
          return newObj;
        })
        .filter(Boolean);

      if (jSounds.length === 0) continue;

      let dynamicMapped: string | undefined;
      if (active.sounds_bedrock_to_java && Object.hasOwn(active.sounds_bedrock_to_java, soundEvent)) {
        dynamicMapped = active.sounds_bedrock_to_java[soundEvent];
      } else if (active.sounds_java_to_bedrock) {
        const jKey = Object.keys(active.sounds_java_to_bedrock).find(k => active.sounds_java_to_bedrock![k] === soundEvent);
        if (jKey) dynamicMapped = jKey;
      }

      const mappedEvent = (dynamicMapped || BEDROCK_TO_JAVA_EVENT_MAP[soundEvent] || soundEvent).toLowerCase();
      if (isUnsafeObjectKey(mappedEvent) || !/^[a-z0-9._-]+$/.test(mappedEvent)) continue;

      javaData[mappedEvent] = {
        sounds: jSounds
      };
    }

    return JSON.stringify(javaData, null, 2);
  } catch (e) {
    return '{}';
  }
}
