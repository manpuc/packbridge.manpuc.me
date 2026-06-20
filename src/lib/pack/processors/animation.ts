export interface FlipbookEntry {
  flipbook_texture: string;
  atlas_tile: string;
  ticks_per_frame: number;
  frames?: number[];
  replicate?: number;
  blend_frames?: boolean;
}

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

    const entry: FlipbookEntry = {
      flipbook_texture: texturePath,
      atlas_tile: shortName,
      ticks_per_frame: data.animation.frametime || 1
    };

    if (data.animation.interpolate) {
      entry.blend_frames = true;
    }

    if (data.animation.frames && Array.isArray(data.animation.frames)) {
      // Check for variable time frames
      const hasVariableTime = data.animation.frames.some((f: any) => typeof f === 'object' && typeof f.time === 'number');
      if (hasVariableTime) {
        entry.ticks_per_frame = 1; // Force 1 tick per frame and duplicate frames
        const newFrames: number[] = [];
        const defaultTime = data.animation.frametime || 1;
        for (const f of data.animation.frames) {
          const idx = typeof f === 'number' ? f : f.index;
          const time = (typeof f === 'object' && typeof f.time === 'number') ? f.time : defaultTime;
          for (let i = 0; i < time; i++) {
            newFrames.push(idx);
          }
        }
        entry.frames = newFrames;
      } else {
        entry.frames = data.animation.frames.map((f: any) => typeof f === 'number' ? f : f.index);
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
