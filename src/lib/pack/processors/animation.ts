export interface FlipbookEntry {
  flipbook_texture: string;
  atlas_tile: string;
  ticks_per_frame: number;
  frames?: number[];
  replicate?: number;
  blend_frames?: boolean;
}

export const MAX_ANIMATION_FRAME_TIME = 1200; // Max 60 seconds per frame at 20 TPS
export const MAX_TOTAL_EXPANDED_FRAMES = 4096;

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
    const data = JSON.parse(mcmetaContent);
    if (!data.animation) return null;

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
      ticks_per_frame: defaultTime
    };

    if (data.animation.interpolate) {
      entry.blend_frames = true;
    }

    if (data.animation.frames && Array.isArray(data.animation.frames)) {
      // Check for variable time frames
      const hasVariableTime = data.animation.frames.some((f: any) => f && typeof f === 'object' && typeof f.time === 'number');
      if (hasVariableTime) {
        entry.ticks_per_frame = 1; // Force 1 tick per frame and duplicate frames
        const newFrames: number[] = [];
        for (const f of data.animation.frames) {
          const idx = typeof f === 'number' ? f : (f && typeof f === 'object' ? Number(f.index) : NaN);
          if (!Number.isFinite(idx) || idx < 0) continue;
          const rawTime = (f && typeof f === 'object' && typeof f.time === 'number') ? f.time : defaultTime;
          const time = Math.min(Math.max(1, Math.floor(rawTime)), MAX_ANIMATION_FRAME_TIME);
          for (let i = 0; i < time && newFrames.length < MAX_TOTAL_EXPANDED_FRAMES; i++) {
            newFrames.push(idx);
          }
          if (newFrames.length >= MAX_TOTAL_EXPANDED_FRAMES) break;
        }
        entry.frames = newFrames;
      } else {
        entry.frames = data.animation.frames
          .slice(0, MAX_TOTAL_EXPANDED_FRAMES)
          .map((f: any) => typeof f === 'number' ? f : (f && typeof f === 'object' ? Number(f.index) : NaN))
          .filter((n: number) => Number.isFinite(n) && n >= 0);
      }
    }

    return entry;
  } catch (e) {
    return null;
  }
}

/**
 * Generates a Java .mcmeta content string from a Bedrock Flipbook Entry.
 */
export function generateJavaAnimation(entry: FlipbookEntry): string {
  const mcmeta: any = {
    animation: {}
  };

  if (entry.blend_frames) {
    mcmeta.animation.interpolate = true;
  }

  if (entry.ticks_per_frame && entry.ticks_per_frame !== 1) {
    mcmeta.animation.frametime = entry.ticks_per_frame;
  }

  if (entry.frames && Array.isArray(entry.frames) && entry.frames.length > 0) {
    mcmeta.animation.frames = entry.frames;
  }

  return JSON.stringify(mcmeta, null, 2);
}
