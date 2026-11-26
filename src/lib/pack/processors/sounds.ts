import { getActiveMappings, getFallbackMappings } from '../rules';
import { isUnsafeObjectKey } from '../security';
import { parseJsonc } from '../metadata';
import { compareBedrockVersion, type BedrockSemver } from './gui';

export { parseJsonc };

const EXTRA_JAVA_TO_BEDROCK_EVENTS: Record<string, string> = {
  'entity.fishing_bobber.retrieve': 'random.bowhit',
};

const VALID_BEDROCK_CATEGORIES = new Set([
  'ambient', 'block', 'bottle', 'bucket', 'hostile',
  'music', 'neutral', 'player', 'record', 'ui', 'weather',
]);

const VALID_JAVA18_CATEGORIES = new Set([
  'master', 'music', 'record', 'weather', 'block',
  'hostile', 'neutral', 'player', 'ambient',
]);

const HOSTILE_MOBS = new Set([
  'blaze', 'bogged', 'breeze', 'cave_spider', 'creaking', 'creeper', 'drowned',
  'elder_guardian', 'elderguardian', 'ender_dragon', 'enderdragon', 'enderman',
  'endermen', 'endermite', 'evocation_fangs', 'evocation_illager', 'evoker',
  'evoker_fangs', 'ghast', 'guardian', 'hoglin', 'husk', 'illusioner',
  'magma_cube', 'magmacube', 'phantom', 'piglin', 'piglin_brute', 'pillager',
  'ravager', 'shulker', 'silverfish', 'skeleton', 'slime', 'spider', 'stray',
  'vex', 'vindicator', 'warden', 'witch', 'wither', 'wither_skeleton', 'zoglin',
  'zombie', 'zombie_nautilus', 'zombie_villager', 'zombified_piglin', 'pigzombie',
  'zombiepig', 'parched', 'camel_husk',
]);

const PLAYER_RANDOM_EVENTS = new Set([
  'random.eat', 'random.burp', 'random.levelup', 'random.orb', 'random.break',
  'random.bow', 'random.bowhit', 'random.pop', 'random.swim', 'random.splash',
  'random.totem', 'random.hurt',
]);

const BLOCK_RANDOM_EVENTS = new Set([
  'random.glass', 'random.lever_click', 'random.wood_click',
  'random.fizz', 'random.explode', 'random.fuse', 'random.potion.brewed',
]);

const BLOCK_BEDROCK_PREFIXES = [
  'block.', 'dig.', 'step.', 'hit.', 'place.', 'fall.', 'break.',
  'open.', 'close.', 'open_door.', 'close_door.', 'open_trapdoor.',
  'click_on.', 'click_off.', 'note.', 'tile.', 'use.', 'fire.', 'liquid.',
  'portal.', 'beacon.', 'conduit.', 'crafter.', 'drip.', 'cauldron_drip.',
  'respawn_anchor.', 'smithing_table.', 'trial_spawner.', 'vault.',
  'random.chest', 'random.enderchest', 'random.shulkerbox', 'random.anvil', 'random.door_',
];

const AUDIO_EXT_RE = /\.(ogg|fsb|wav|mp3)$/i;

function isPlainObject(v: unknown): v is Record<string, any> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function normalizeEventKey(raw: string): string {
  return raw.trim().replace(/^minecraft:/i, '').toLowerCase();
}

function isValidJavaEventKey(key: string): boolean {
  if (!key || isUnsafeObjectKey(key)) return false;
  if (!/^[a-z0-9/._-]+$/.test(key)) return false;
  if (key.startsWith('/') || key.endsWith('/') || key.includes('//')) return false;
  return !key.split('/').some(seg => seg === '.' || seg === '..');
}

function normalizeSoundPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let p = raw.trim().replace(/\\/g, '/');
  if (!p) return null;

  const colonIdx = p.indexOf(':');
  if (colonIdx !== -1) {
    const ns = p.slice(0, colonIdx).toLowerCase();
    if (ns !== 'minecraft') return null;
    p = p.slice(colonIdx + 1);
  }

  p = p.replace(/^(?:\.\/|\/)+/, '').replace(/^sounds\//i, '').replace(AUDIO_EXT_RE, '').toLowerCase();
  if (!p || p.endsWith('/') || p.includes('//') || !/^[a-z0-9/._-]+$/.test(p)) return null;
  if (p.split('/').some(seg => seg === '.' || seg === '..')) return null;
  return p;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function normalizePositiveNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return round4(val);
  if (Array.isArray(val) && val.length > 0) {
    const nums = val.map(Number).filter(n => Number.isFinite(n) && n > 0);
    if (nums.length > 0) return round4(nums.reduce((a, b) => a + b, 0) / nums.length);
  }
  return null;
}

function lookupJavaToBedrockEvent(ev: string): string | undefined {
  const active = getActiveMappings();
  if (active.sounds_java_to_bedrock && Object.hasOwn(active.sounds_java_to_bedrock, ev)) {
    return active.sounds_java_to_bedrock[ev];
  }
  const fallback = getFallbackMappings();
  if (fallback.sounds_java_to_bedrock && Object.hasOwn(fallback.sounds_java_to_bedrock, ev)) {
    return fallback.sounds_java_to_bedrock[ev];
  }
  return Object.hasOwn(EXTRA_JAVA_TO_BEDROCK_EVENTS, ev) ? EXTRA_JAVA_TO_BEDROCK_EVENTS[ev] : undefined;
}

function lookupBedrockToJavaEvent(ev: string): string | undefined {
  const active = getActiveMappings();
  if (active.sounds_bedrock_to_java && Object.hasOwn(active.sounds_bedrock_to_java, ev)) {
    return active.sounds_bedrock_to_java[ev];
  }
  const fallback = getFallbackMappings();
  if (fallback.sounds_bedrock_to_java && Object.hasOwn(fallback.sounds_bedrock_to_java, ev)) {
    return fallback.sounds_bedrock_to_java[ev];
  }
  return undefined;
}

function upgradeJava18EventToBedrock(ev: string): string {
  if (ev.startsWith('records.')) return `record.${ev.slice('records.'.length)}`;
  if (ev === 'gui.button.press') return 'random.click';
  if (ev === 'game.tnt.primed' || ev === 'creeper.primed') return 'random.fuse';
  if (ev === 'game.neutral.hurt' || ev === 'game.hostile.hurt') return 'random.hurt';
  if (ev === 'game.neutral.die' || ev === 'game.hostile.die') return 'game.player.die';
  return ev;
}

function upgradeJava112EventTo113(ev: string): string {
  if (ev.startsWith('record.')) return `music_disc.${ev.slice('record.'.length)}`;
  if (ev.startsWith('block.note.')) return `block.note_block.${ev.slice('block.note.'.length)}`;
  if (ev.startsWith('entity.bobber.')) return `entity.fishing_bobber.${ev.slice('entity.bobber.'.length)}`;
  if (ev.startsWith('entity.enderdragon.')) return `entity.ender_dragon.${ev.slice('entity.enderdragon.'.length)}`;
  if (ev.startsWith('entity.endermen.')) return `entity.enderman.${ev.slice('entity.endermen.'.length)}`;
  if (ev.startsWith('entity.zombie_pig.')) return `entity.zombified_piglin.${ev.slice('entity.zombie_pig.'.length)}`;
  return ev;
}

function downgradeJava113EventTo112(ev: string): string {
  if (ev.startsWith('music_disc.')) return `record.${ev.slice('music_disc.'.length)}`;
  if (ev.startsWith('block.note_block.')) return `block.note.${ev.slice('block.note_block.'.length)}`;
  if (ev.startsWith('entity.fishing_bobber.')) return `entity.bobber.${ev.slice('entity.fishing_bobber.'.length)}`;
  if (ev.startsWith('entity.ender_dragon.')) return `entity.enderdragon.${ev.slice('entity.ender_dragon.'.length)}`;
  if (ev.startsWith('entity.enderman.')) return `entity.endermen.${ev.slice('entity.enderman.'.length)}`;
  if (ev.startsWith('entity.zombified_piglin.')) return `entity.zombie_pig.${ev.slice('entity.zombified_piglin.'.length)}`;
  return ev;
}

function bedrockEventToJava18(ev: string): string {
  if (ev.startsWith('record.')) return `records.${ev.slice('record.'.length)}`;
  return ev;
}

function inferBedrockCategory(bedrockEvent: string, javaEvent: string, explicitCategory?: unknown): string {
  if (typeof explicitCategory === 'string') {
    const lower = explicitCategory.toLowerCase();
    if (VALID_BEDROCK_CATEGORIES.has(lower)) return lower;
  }
  const ev = bedrockEvent || javaEvent;
  if (ev.startsWith('record.') || javaEvent.startsWith('music_disc.') || javaEvent.startsWith('records.')) return 'record';
  if (ev.startsWith('music.') || javaEvent.startsWith('music.')) return 'music';
  if (ev.startsWith('ambient.weather.') || javaEvent.startsWith('weather.')) return 'weather';
  if (ev.startsWith('ambient.') || javaEvent.startsWith('ambient.')) return 'ambient';
  if (ev.startsWith('ui.') || ev === 'random.click' || ev.startsWith('random.toast') || javaEvent.startsWith('ui.')) return 'ui';
  if (ev.startsWith('bucket.') || javaEvent.startsWith('item.bucket.')) return 'bucket';
  if (
    ev.startsWith('bottle.') || ev === 'random.drink' || ev === 'random.drink_honey' ||
    ev.startsWith('ominous_bottle.') || javaEvent.startsWith('item.bottle.') ||
    javaEvent.startsWith('item.honey_bottle.') || javaEvent.startsWith('item.ominous_bottle.')
  ) {
    return 'bottle';
  }
  if (
    ev.startsWith('game.player.') || ev.startsWith('mob.player.') || ev.startsWith('entity.player.') ||
    ev.startsWith('damage.') || ev.startsWith('armor.') || ev.startsWith('crossbow.') ||
    ev.startsWith('elytra.') || ev.startsWith('mace.') || ev.startsWith('brush.') ||
    ev.startsWith('bundle.') || ev.startsWith('horn.') || ev.startsWith('item.') ||
    javaEvent.startsWith('item.') || PLAYER_RANDOM_EVENTS.has(ev)
  ) {
    return 'player';
  }
  if (javaEvent.startsWith('block.') || BLOCK_RANDOM_EVENTS.has(ev) || BLOCK_BEDROCK_PREFIXES.some(p => ev.startsWith(p))) {
    return 'block';
  }
  const parts = ev.split('.');
  const jParts = javaEvent.split('.');
  if (
    (parts[0] === 'mob' && HOSTILE_MOBS.has(parts[1] || '')) ||
    (jParts[0] === 'entity' && HOSTILE_MOBS.has(jParts[1] || ''))
  ) {
    return 'hostile';
  }
  return 'neutral';
}

function inferJava18Category(bedrockCategory: unknown, bedrockEvent: string, javaEvent = bedrockEvent): string {
  if (typeof bedrockCategory === 'string') {
    const lower = bedrockCategory.toLowerCase();
    if (lower === 'ui') return 'master';
    if (lower === 'bucket' || lower === 'bottle') return 'player';
    if (VALID_JAVA18_CATEGORIES.has(lower)) return lower;
  }
  const inferred = inferBedrockCategory(bedrockEvent, javaEvent);
  if (inferred === 'ui') return 'master';
  if (inferred === 'bucket' || inferred === 'bottle') return 'player';
  return VALID_JAVA18_CATEGORIES.has(inferred) ? inferred : 'neutral';
}

function soundEntryKey(entry: unknown): string {
  return typeof entry === 'string' ? entry : (entry as Record<string, any>).name;
}

function mergeSoundEntries(existing: unknown[], incoming: unknown[]): unknown[] {
  const seen = new Set(existing.map(soundEntryKey));
  const merged = [...existing];
  for (const item of incoming) {
    const key = soundEntryKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function upsertEventEntry(
  store: Record<string, any>,
  primaryWritten: Set<string>,
  key: string,
  isPrimary: boolean,
  incomingSounds: unknown[],
  buildEntry: () => Record<string, any>,
  onMerge?: (existing: Record<string, any>) => void
): void {
  const existing = store[key];
  if (existing) {
    if (primaryWritten.has(key) && !isPrimary) return;
    if (isPrimary && !primaryWritten.has(key)) {
      primaryWritten.add(key);
    } else {
      if (Array.isArray(existing.sounds) && incomingSounds.length > 0) {
        existing.sounds = mergeSoundEntries(existing.sounds, incomingSounds);
      }
      onMerge?.(existing);
      return;
    }
  } else if (isPrimary) {
    primaryWritten.add(key);
  }
  store[key] = buildEntry();
}

interface ResolvedJavaSounds {
  sounds: unknown[];
  maxDistance?: number;
}

const MAX_RESOLVED_SOUNDS = 256;
const MAX_EVENT_RESOLVE_STEPS = 512;

function resolveJavaSoundEntries(
  eventIndex: Map<string, Record<string, any>>,
  normKey: string,
  visited: Set<string>,
  state: { steps: number } = { steps: 0 },
  budget = MAX_RESOLVED_SOUNDS
): ResolvedJavaSounds {
  if (!normKey || isUnsafeObjectKey(normKey) || visited.has(normKey)) return { sounds: [] };
  if (budget <= 0 || state.steps >= MAX_EVENT_RESOLVE_STEPS) return { sounds: [] };
  state.steps++;
  const data = eventIndex.get(normKey);
  if (!data || !Array.isArray(data.sounds)) return { sounds: [] };

  visited.add(normKey);
  const out: unknown[] = [];
  let maxDist: number | undefined;

  for (const s of data.sounds) {
    if (out.length >= budget) break;
    if (typeof s === 'string') {
      const clean = normalizeSoundPath(s);
      if (clean) out.push(`sounds/${clean}`);
      continue;
    }
    if (!isPlainObject(s)) continue;

    if (s.type === 'event') {
      if (typeof s.name !== 'string') continue;
      const targetNorm = normalizeEventKey(s.name);
      if (!targetNorm) continue;
      const sub = resolveJavaSoundEntries(eventIndex, targetNorm, visited, state, budget - out.length);
      if (sub.maxDistance !== undefined) {
        maxDist = maxDist === undefined ? sub.maxDistance : Math.max(maxDist, sub.maxDistance);
      }
      const mulVol = normalizePositiveNumber(s.volume);
      const mulPitch = normalizePositiveNumber(s.pitch);
      const extWeight = typeof s.weight === 'number' && Number.isFinite(s.weight) && s.weight >= 1 ? Math.round(s.weight) : undefined;
      const extStream = typeof s.stream === 'boolean' ? s.stream : undefined;

      for (const item of sub.sounds) {
        if (out.length >= budget) break;
        if (typeof item === 'string') {
          if (mulVol !== null || mulPitch !== null || extWeight !== undefined || extStream !== undefined) {
            const obj: Record<string, any> = { name: item };
            if (mulVol !== null) obj.volume = mulVol;
            if (mulPitch !== null) obj.pitch = mulPitch;
            if (extWeight !== undefined) obj.weight = extWeight;
            if (extStream !== undefined) obj.stream = extStream;
            out.push(obj);
          } else {
            out.push(item);
          }
        } else if (isPlainObject(item)) {
          const obj: Record<string, any> = { ...item };
          if (mulVol !== null) obj.volume = round4((typeof obj.volume === 'number' ? obj.volume : 1) * mulVol);
          if (mulPitch !== null) obj.pitch = round4((typeof obj.pitch === 'number' ? obj.pitch : 1) * mulPitch);
          if (extWeight !== undefined && obj.weight === undefined) obj.weight = extWeight;
          if (extStream !== undefined && obj.stream === undefined) obj.stream = extStream;
          out.push(obj);
        }
      }
      continue;
    }

    const clean = normalizeSoundPath(s.name);
    if (!clean) continue;

    if (typeof s.attenuation_distance === 'number' && Number.isFinite(s.attenuation_distance) && s.attenuation_distance >= 1) {
      const dist = Math.round(s.attenuation_distance);
      if (dist !== 16) maxDist = maxDist === undefined ? dist : Math.max(maxDist, dist);
    }

    const obj: Record<string, any> = { name: `sounds/${clean}` };
    const vol = normalizePositiveNumber(s.volume);
    const pitch = normalizePositiveNumber(s.pitch);
    if (vol !== null) obj.volume = vol;
    if (pitch !== null) obj.pitch = pitch;
    if (typeof s.weight === 'number' && Number.isFinite(s.weight) && s.weight >= 1) obj.weight = Math.round(s.weight);
    if (typeof s.stream === 'boolean') obj.stream = s.stream;
    if (typeof s.is3D === 'boolean') obj.is3D = s.is3D;

    out.push(Object.keys(obj).length === 1 ? obj.name : obj);
  }

  visited.delete(normKey);
  return { sounds: out, maxDistance: maxDist };
}

/**
 * Converts Java Edition sounds.json to Bedrock Edition sound_definitions.json
 */
export function javaToBedrockSounds(
  jsonContent: string,
  options?: { sourcePackFormat?: number; targetBedrockMinEngine?: BedrockSemver }
): string | null {
  let parsed: unknown;
  try {
    parsed = parseJsonc(jsonContent);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  const eventIndex = new Map<string, Record<string, any>>();
  for (const [k, v] of Object.entries(parsed)) {
    if (isUnsafeObjectKey(k) || !isPlainObject(v)) continue;
    const nk = normalizeEventKey(k);
    if (nk && !isUnsafeObjectKey(nk)) eventIndex.set(nk, v);
  }

  const sourcePackFormat = options?.sourcePackFormat;
  const definitions: Record<string, any> = Object.create(null);
  const primaryWritten = new Set<string>();

  for (const [rawEvent, data] of Object.entries(parsed)) {
    if (isUnsafeObjectKey(rawEvent) || !isPlainObject(data)) continue;
    const normalizedKey = normalizeEventKey(rawEvent);
    if (!normalizedKey || isUnsafeObjectKey(normalizedKey) || /[\r\n\0]/.test(normalizedKey)) continue;

    const resolved = resolveJavaSoundEntries(eventIndex, normalizedKey, new Set());
    if (resolved.sounds.length === 0) continue;

    let lookupKey = normalizedKey;
    let mappedEvent: string;
    if (sourcePackFormat === 1) {
      const upgraded = upgradeJava18EventToBedrock(normalizedKey);
      mappedEvent = lookupJavaToBedrockEvent(upgraded) || upgraded;
    } else {
      if (sourcePackFormat !== undefined && sourcePackFormat <= 3) {
        lookupKey = upgradeJava112EventTo113(normalizedKey);
      }
      mappedEvent = lookupJavaToBedrockEvent(lookupKey) || lookupKey;
    }

    if (isUnsafeObjectKey(mappedEvent) || /[\r\n\0]/.test(mappedEvent)) continue;

    const canonicalJava = lookupBedrockToJavaEvent(mappedEvent);
    const isPrimary = canonicalJava === lookupKey || mappedEvent === normalizedKey;

    upsertEventEntry(
      definitions,
      primaryWritten,
      mappedEvent,
      isPrimary,
      resolved.sounds,
      () => {
        const def: Record<string, any> = {
          category: inferBedrockCategory(mappedEvent, lookupKey, data.category),
          sounds: resolved.sounds,
        };
        if (resolved.maxDistance !== undefined) def.max_distance = resolved.maxDistance;
        return def;
      },
      (existing) => {
        if (resolved.maxDistance !== undefined && existing.max_distance === undefined) {
          existing.max_distance = resolved.maxDistance;
        }
      }
    );
  }

  if (options?.targetBedrockMinEngine && compareBedrockVersion(options.targetBedrockMinEngine, [1, 14, 0]) < 0) {
    return JSON.stringify(definitions, null, 2);
  }

  return JSON.stringify({
    format_version: '1.14.0',
    sound_definitions: definitions,
  }, null, 2);
}

/**
 * Converts Bedrock Edition sound_definitions.json to Java Edition sounds.json
 */
export function bedrockToJavaSounds(
  jsonContent: string,
  options?: { targetPackFormat?: number }
): string | null {
  let bedrockData: unknown;
  try {
    bedrockData = parseJsonc(jsonContent);
  } catch {
    return null;
  }
  if (!isPlainObject(bedrockData)) return null;

  let definitions: Record<string, any>;
  if (Object.hasOwn(bedrockData, 'sound_definitions')) {
    if (!isPlainObject(bedrockData.sound_definitions)) return null;
    definitions = bedrockData.sound_definitions;
  } else if (Object.hasOwn(bedrockData, 'format_version')) {
    definitions = {};
  } else {
    definitions = bedrockData;
  }

  const targetPackFormat = options?.targetPackFormat;
  const javaData: Record<string, any> = Object.create(null);
  const primaryWritten = new Set<string>();

  for (const [soundEvent, data] of Object.entries(definitions)) {
    if (isUnsafeObjectKey(soundEvent) || !isPlainObject(data) || !Array.isArray(data.sounds)) continue;

    let attenuationDistance: number | undefined;
    if (
      (targetPackFormat ?? 46) >= 3 &&
      typeof data.max_distance === 'number' &&
      Number.isFinite(data.max_distance) &&
      data.max_distance >= 1 &&
      Math.round(data.max_distance) !== 16
    ) {
      attenuationDistance = Math.round(data.max_distance);
    }

    const jSounds = data.sounds
      .map((s: any) => {
        if (typeof s === 'string') {
          const clean = normalizeSoundPath(s);
          if (!clean) return null;
          return attenuationDistance !== undefined ? { name: clean, attenuation_distance: attenuationDistance } : clean;
        }
        if (!isPlainObject(s)) return null;
        const cleanName = normalizeSoundPath(s.name);
        if (!cleanName) return null;
        const newObj: Record<string, any> = { name: cleanName };
        const vol = s.volume !== undefined && s.volume !== null ? normalizePositiveNumber(s.volume) : null;
        const pitch = s.pitch !== undefined && s.pitch !== null ? normalizePositiveNumber(s.pitch) : null;
        if (vol !== null) newObj.volume = vol;
        if (pitch !== null) newObj.pitch = pitch;
        if (typeof s.weight === 'number' && Number.isFinite(s.weight) && s.weight >= 1) newObj.weight = Math.round(s.weight);
        if (typeof s.stream === 'boolean') newObj.stream = s.stream;
        if (attenuationDistance !== undefined) newObj.attenuation_distance = attenuationDistance;
        return newObj;
      })
      .filter(Boolean);

    if (jSounds.length === 0) continue;

    const normBedrock = normalizeEventKey(soundEvent);
    let mappedEvent: string;
    let modernJava: string | undefined;
    if (targetPackFormat === 1) {
      mappedEvent = bedrockEventToJava18(normBedrock);
    } else {
      modernJava = (lookupBedrockToJavaEvent(normBedrock) || normBedrock).toLowerCase();
      mappedEvent = targetPackFormat !== undefined && targetPackFormat <= 3
        ? downgradeJava113EventTo112(modernJava)
        : modernJava;
    }

    if (!isValidJavaEventKey(mappedEvent)) continue;

    const isPrimary = modernJava !== undefined
      ? (lookupJavaToBedrockEvent(modernJava) === normBedrock || modernJava === normBedrock)
      : true;

    upsertEventEntry(
      javaData,
      primaryWritten,
      mappedEvent,
      isPrimary,
      jSounds,
      () => {
        const entry: Record<string, any> = { replace: true };
        if (targetPackFormat === 1) {
          entry.category = inferJava18Category(data.category, normBedrock);
        }
        entry.sounds = jSounds;
        return entry;
      }
    );
  }

  return JSON.stringify(javaData, null, 2);
}

/**
 * Migrates Java Edition sounds.json event names and categories across Java pack formats
 */
export function migrateJavaSounds(
  jsonContent: string,
  sourcePackFormat: number,
  targetPackFormat: number
): string | null {
  let parsed: unknown;
  try {
    parsed = parseJsonc(jsonContent);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  const toModernAndTarget = (rawKey: string): { modernKey: string; targetKey: string } => {
    const k = normalizeEventKey(rawKey);
    let modernKey: string;
    if (sourcePackFormat === 1) {
      const b = upgradeJava18EventToBedrock(k);
      modernKey = lookupBedrockToJavaEvent(b) || b;
    } else if (sourcePackFormat <= 3) {
      modernKey = upgradeJava112EventTo113(k);
    } else {
      modernKey = k;
    }

    let targetKey: string;
    if (targetPackFormat === 1) {
      if (modernKey === 'ui.button.click') {
        targetKey = 'gui.button.press';
      } else {
        const b = lookupJavaToBedrockEvent(modernKey) || modernKey;
        targetKey = bedrockEventToJava18(b);
      }
    } else if (targetPackFormat <= 3) {
      targetKey = downgradeJava113EventTo112(modernKey);
    } else {
      targetKey = modernKey;
    }
    return { modernKey: modernKey.toLowerCase(), targetKey: targetKey.toLowerCase() };
  };

  const out: Record<string, any> = Object.create(null);
  const primaryWritten = new Set<string>();

  for (const [rawKey, data] of Object.entries(parsed)) {
    if (isUnsafeObjectKey(rawKey) || !isPlainObject(data)) continue;
    const rawNorm = normalizeEventKey(rawKey);
    const { modernKey, targetKey } = toModernAndTarget(rawKey);
    if (!isValidJavaEventKey(targetKey)) continue;

    const nextData: Record<string, any> = { ...data };
    if (targetPackFormat === 1) {
      nextData.category = inferJava18Category(
        data.category,
        lookupJavaToBedrockEvent(modernKey) || targetKey,
        modernKey
      );
    } else {
      delete nextData.category;
    }

    if (Array.isArray(data.sounds)) {
      nextData.sounds = data.sounds.map((s: any) => {
        if (isPlainObject(s) && s.type === 'event' && typeof s.name === 'string') {
          if (!s.name.includes(':') || /^minecraft:/i.test(s.name)) {
            const rewritten = toModernAndTarget(s.name).targetKey;
            if (isValidJavaEventKey(rewritten)) return { ...s, name: rewritten };
          }
          return s;
        }
        if (targetPackFormat <= 3) {
          if (typeof s === 'string') return s.replace(/^minecraft:/i, '');
          if (isPlainObject(s) && typeof s.name === 'string') {
            return { ...s, name: s.name.replace(/^minecraft:/i, '') };
          }
        }
        return s;
      });
    }

    let isPrimary: boolean;
    if (targetPackFormat === 1) {
      const bKey = targetKey.startsWith('records.')
        ? `record.${targetKey.slice('records.'.length)}`
        : targetKey === 'gui.button.press'
          ? 'random.click'
          : targetKey;
      isPrimary = lookupBedrockToJavaEvent(bKey) === modernKey || modernKey === targetKey;
    } else {
      const upgraded18 = upgradeJava18EventToBedrock(rawNorm);
      isPrimary = (sourcePackFormat === 1 && rawNorm === 'gui.button.press') ||
        upgraded18 === rawNorm ||
        lookupBedrockToJavaEvent(upgraded18) === modernKey;
    }

    upsertEventEntry(
      out,
      primaryWritten,
      targetKey,
      isPrimary,
      Array.isArray(nextData.sounds) ? nextData.sounds : [],
      () => nextData
    );
  }

  return JSON.stringify(out, null, 2);
}
