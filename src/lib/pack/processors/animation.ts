export interface FlipbookEntry {
  flipbook_texture: string;
  atlas_tile: string;
  atlas_index?: number;
  atlas_tile_variant?: number;
  ticks_per_frame?: number;
  frames?: number[];
  replicate?: number;
  blend_frames?: boolean;
}

export const MAX_ANIMATION_FRAME_TIME = 1200; // Max 60 seconds per frame at 20 TPS
export const MAX_TOTAL_EXPANDED_FRAMES = 4096;

const BEDROCK_FLIPBOOK_REPLICATE: Record<string, number> = {
  'textures/blocks/water_flow_grey': 2,
  'textures/blocks/water_flow': 2,
  'textures/blocks/lava_flow': 2,
};

const BEDROCK_FLIPBOOK_INDICES: Record<string, { indices: number[]; includeVariant?: boolean }> = {
  'textures/blocks/respawn_anchor_top': { indices: [1, 2, 3, 4], includeVariant: true },
  'textures/blocks/respawn_anchor_top_off': { indices: [0], includeVariant: true },
  'textures/blocks/sculk_catalyst_side_bloom': { indices: [1], includeVariant: true },
  'textures/blocks/sculk_catalyst_top_bloom': { indices: [1], includeVariant: true },
  'textures/blocks/sculk_shrieker_inner_top': { indices: [0], includeVariant: true },
  'textures/blocks/sculk_shrieker_can_summon_inner_top': { indices: [1], includeVariant: true },
  'textures/blocks/firefly_bush_firefly': { indices: [1], includeVariant: false },
};

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function extractFrameIndex(f: unknown): number {
  if (typeof f === 'number' && Number.isFinite(f) && f >= 0) {
    return Math.floor(f);
  }
  if (f && typeof f === 'object') {
    const idx = (f as { index?: unknown }).index;
    if (typeof idx === 'number' && Number.isFinite(idx) && idx >= 0) {
      return Math.floor(idx);
    }
  }
  return NaN;
}

// Vanilla Bedrock atlas_tile names that differ from their texture filename
export const BEDROCK_FLIPBOOK_ATLAS_TILES: Record<string, string> = {
  'textures/blocks/water_still_grey': 'still_water_grey',
  'textures/blocks/water_flow_grey': 'flowing_water_grey',
  'textures/blocks/water_still': 'still_water',
  'textures/blocks/water_flow': 'flowing_water',
  'textures/blocks/lava_still': 'still_lava',
  'textures/blocks/lava_flow': 'flowing_lava',
  'textures/blocks/prismarine_rough': 'prismarine',
  'textures/blocks/campfire': 'campfire_fire',
  'textures/blocks/soul_campfire': 'soul_campfire_fire',
  'textures/blocks/seagrass': 'seagrass_short',
  'textures/blocks/seagrass_doubletall_bottom_a': 'seagrass_tall_bot_a',
  'textures/blocks/seagrass_doubletall_bottom_b': 'seagrass_tall_bot_b',
  'textures/blocks/seagrass_doubletall_top_a': 'seagrass_tall_top_a',
  'textures/blocks/seagrass_doubletall_top_b': 'seagrass_tall_top_b',
  'textures/blocks/respawn_anchor_top_off': 'respawn_anchor_top',
  'textures/blocks/sculk_catalyst_side_bloom': 'sculk_catalyst_side',
  'textures/blocks/sculk_catalyst_top_bloom': 'sculk_catalyst_top',
  'textures/blocks/sculk_shrieker_can_summon_inner_top': 'sculk_shrieker_inner_top',
  'textures/blocks/firefly_bush_firefly': 'firefly_bush',
  'textures/blocks/command_block_conditional': 'command_block_conditional_side',
  'textures/blocks/repeating_command_block_front': 'command_block_repeating_front',
  'textures/blocks/repeating_command_block_back': 'command_block_repeating_back',
  'textures/blocks/repeating_command_block_side': 'command_block_repeating_side',
  'textures/blocks/repeating_command_block_conditional': 'command_block_repeating_conditional_side',
  'textures/blocks/chain_command_block_front': 'command_block_chain_front',
  'textures/blocks/chain_command_block_back': 'command_block_chain_back',
  'textures/blocks/chain_command_block_side': 'command_block_chain_side',
  'textures/blocks/chain_command_block_conditional': 'command_block_chain_conditional_side',
  'textures/blocks/leaves_oak': 'oak_leaves',
  'textures/blocks/leaves_spruce': 'spruce_leaves',
  'textures/blocks/leaves_birch': 'birch_leaves',
  'textures/blocks/leaves_jungle': 'jungle_leaves',
  'textures/blocks/leaves_acacia': 'acacia_leaves',
  'textures/blocks/leaves_big_oak': 'big_oak_leaves',
  'textures/blocks/azalea_leaves_flowers': 'azalea_leaves_flowered',
};

export function getBedrockAtlasTile(texturePathNoExt: string): string {
  return BEDROCK_FLIPBOOK_ATLAS_TILES[texturePathNoExt] ?? (texturePathNoExt.split('/').pop() || texturePathNoExt);
}

/**
 * Parses a Java .mcmeta file and returns a Bedrock Flipbook Entry if it contains animation.
 */
export function parseJavaAnimation(mcmetaContent: string, bedrockPath: string): FlipbookEntry | null {
  try {
    const data = JSON.parse(mcmetaContent.replace(/^\uFEFF/, ''));
    if (!data || typeof data.animation !== 'object' || data.animation === null || Array.isArray(data.animation)) {
      return null;
    }

    if (!bedrockPath) return null;

    const texturePath = bedrockPath.replace(/\.(png|tga)$/i, '');
    const shortName = getBedrockAtlasTile(texturePath);

    const rawFrametime = Number(data.animation.frametime);
    const defaultTime = Number.isFinite(rawFrametime) && rawFrametime >= 1
      ? Math.min(Math.floor(rawFrametime), MAX_ANIMATION_FRAME_TIME)
      : 1;

    const entry: FlipbookEntry = {
      flipbook_texture: texturePath,
      atlas_tile: shortName,
      ticks_per_frame: defaultTime,
      blend_frames: Boolean(data.animation.interpolate),
    };

    if (Object.hasOwn(BEDROCK_FLIPBOOK_REPLICATE, texturePath)) {
      entry.replicate = BEDROCK_FLIPBOOK_REPLICATE[texturePath];
    }

    const indexMeta = Object.hasOwn(BEDROCK_FLIPBOOK_INDICES, texturePath)
      ? BEDROCK_FLIPBOOK_INDICES[texturePath]
      : null;
    if (indexMeta && indexMeta.indices.length === 1) {
      entry.atlas_index = indexMeta.indices[0];
      if (indexMeta.includeVariant) {
        entry.atlas_tile_variant = indexMeta.indices[0];
      }
    }

    if (Array.isArray(data.animation.frames)) {
      const hasVariableTime = data.animation.frames.some(
        (f: any) => f && typeof f === 'object' && typeof f.time === 'number' && Number.isFinite(f.time)
      );
      if (hasVariableTime) {
        const pairs: Array<{ idx: number; time: number }> = [];
        for (const f of data.animation.frames) {
          const idx = extractFrameIndex(f);
          if (!Number.isFinite(idx)) continue;
          const rawTime = (f && typeof f === 'object' && typeof f.time === 'number' && Number.isFinite(f.time))
            ? f.time
            : defaultTime;
          const time = Math.min(Math.max(1, Math.floor(rawTime)), MAX_ANIMATION_FRAME_TIME);
          pairs.push({ idx, time });
        }
        if (pairs.length > 0) {
          const step = pairs.reduce((acc, p) => gcd(acc, p.time), pairs[0].time);
          entry.ticks_per_frame = step;
          const newFrames: number[] = [];
          for (const p of pairs) {
            const count = Math.max(1, Math.floor(p.time / step));
            for (let i = 0; i < count && newFrames.length < MAX_TOTAL_EXPANDED_FRAMES; i++) {
              newFrames.push(p.idx);
            }
            if (newFrames.length >= MAX_TOTAL_EXPANDED_FRAMES) break;
          }
          if (newFrames.length > 0) {
            entry.frames = newFrames;
          }
        }
      } else {
        const resolved = data.animation.frames
          .slice(0, MAX_TOTAL_EXPANDED_FRAMES)
          .map((f: unknown) => extractFrameIndex(f))
          .filter((n: number) => Number.isFinite(n));
        if (resolved.length > 0) {
          entry.frames = resolved;
        }
      }
    }

    return entry;
  } catch {
    return null;
  }
}

export function expandBedrockFlipbookEntry(entry: FlipbookEntry): FlipbookEntry[] {
  const meta = Object.hasOwn(BEDROCK_FLIPBOOK_INDICES, entry.flipbook_texture)
    ? BEDROCK_FLIPBOOK_INDICES[entry.flipbook_texture]
    : null;
  if (meta && meta.indices.length > 1) {
    return meta.indices.map((idx) => ({
      ...entry,
      atlas_index: idx,
      ...(meta.includeVariant ? { atlas_tile_variant: idx } : {}),
    }));
  }
  return [entry];
}

/**
 * Generates a Java .mcmeta content string from a Bedrock Flipbook Entry.
 */
export function generateJavaAnimation(entry: FlipbookEntry): string {
  const mcmeta: any = {
    animation: {}
  };

  const rawTicks = typeof entry.ticks_per_frame === 'number' ? entry.ticks_per_frame : NaN;
  const frametime = Number.isFinite(rawTicks) && rawTicks >= 1
    ? Math.min(Math.floor(rawTicks), MAX_ANIMATION_FRAME_TIME)
    : 1;

  if (entry.blend_frames === true || (entry.blend_frames !== false && frametime > 1)) {
    mcmeta.animation.interpolate = true;
  }

  if (frametime !== 1) {
    mcmeta.animation.frametime = frametime;
  }

  if (Array.isArray(entry.frames)) {
    const validFrames = entry.frames
      .filter((f): f is number => typeof f === 'number' && Number.isInteger(f) && f >= 0)
      .slice(0, MAX_TOTAL_EXPANDED_FRAMES);
    if (validFrames.length > 0) {
      mcmeta.animation.frames = validFrames;
    }
  }

  return JSON.stringify(mcmeta, null, 2);
}
