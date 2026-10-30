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

/**
 * Parses a Java .mcmeta file and returns a Bedrock Flipbook Entry if it contains animation.
 */
export function parseJavaAnimation(mcmetaContent: string, bedrockPath: string): FlipbookEntry | null {
  try {
    const data = JSON.parse(mcmetaContent);
    if (!data.animation) return null;

    if (!bedrockPath) return null;

    const shortName = bedrockPath.replace('textures/blocks/', '').replace('textures/items/', '').replace('.png', '');
    const texturePath = bedrockPath.replace('.png', '');

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
