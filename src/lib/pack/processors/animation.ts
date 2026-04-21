import mappings from '../mappings.json';

export interface FlipbookEntry {
  flipbook_texture: string;
  atlas_tile: string;
  ticks_per_frame: number;
  frames?: number[];
  replicate?: number;
}

/**
 * Parses a Java .mcmeta file and returns a Bedrock Flipbook Entry if it contains animation.
 */
export function parseJavaAnimation(mcmetaContent: string, pngRelativePath: string): FlipbookEntry | null {
  try {
    const data = JSON.parse(mcmetaContent);
    if (!data.animation) return null;

    const bedrockPath = (mappings as any).java_to_bedrock[pngRelativePath];
    if (!bedrockPath) return null;

    const shortName = bedrockPath.replace('textures/blocks/', '').replace('textures/items/', '').replace('.png', '');
    const texturePath = bedrockPath.replace('.png', '');

    const entry: FlipbookEntry = {
      flipbook_texture: texturePath,
      atlas_tile: shortName,
      ticks_per_frame: data.animation.frametime || 1
    };

    if (data.animation.frames && Array.isArray(data.animation.frames)) {
      // frames can be numbers or objects like { "index": 0, "time": 2 }
      entry.frames = data.animation.frames.map((f: any) => typeof f === 'number' ? f : f.index);
    }

    return entry;
  } catch (e) {
    return null;
  }
}
