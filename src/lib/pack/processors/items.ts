import { getTargetContext } from '../rules';
import { isUnsafeObjectKey } from '../security';
import { decodeImageToRgbaSync } from './pbr';
import { encodeRgbaToPngSync } from './tga';

export type DialItemKind = 'compass' | 'recovery_compass' | 'clock';

export interface DialItemSpec {
  kind: DialItemKind;
  frameCount: number;
  javaBase: string;
  javaMinPackFormat: number;
  bedrockMinEngine?: [number, number, number];
  bedrockAtlasPaths: string[];
  bedrockIcons: Array<{ path: string; itemTextureKey: string }>;
  preferredIconFrames: number[];
}

export const DIAL_ITEM_SPECS: Record<DialItemKind, DialItemSpec> = {
  compass: {
    kind: 'compass',
    frameCount: 32,
    javaBase: 'compass',
    javaMinPackFormat: 1,
    bedrockAtlasPaths: ['textures/items/compass_atlas.png', 'textures/items/lodestonecompass_atlas.png'],
    bedrockIcons: [
      { path: 'textures/items/compass_item.png', itemTextureKey: 'compass_item' },
      { path: 'textures/items/lodestonecompass_item.png', itemTextureKey: 'lodestonecompass_item' },
    ],
    preferredIconFrames: [19, 16, 0],
  },
  recovery_compass: {
    kind: 'recovery_compass',
    frameCount: 32,
    javaBase: 'recovery_compass',
    javaMinPackFormat: 9,
    bedrockMinEngine: [1, 19, 0],
    bedrockAtlasPaths: ['textures/items/recovery_compass_atlas.png'],
    bedrockIcons: [{ path: 'textures/items/recovery_compass_item.png', itemTextureKey: 'recovery_compass' }],
    preferredIconFrames: [16, 0],
  },
  clock: {
    kind: 'clock',
    frameCount: 64,
    javaBase: 'clock',
    javaMinPackFormat: 1,
    bedrockAtlasPaths: ['textures/items/watch_atlas.png'],
    bedrockIcons: [{ path: 'textures/items/clock_item.png', itemTextureKey: 'clock_item' }],
    preferredIconFrames: [0],
  },
};

const MAX_DIAL_ATLAS_DIM = 8192;

export function classifyJavaDialPath(
  relativePath: string
): { kind: DialItemKind; mode: 'frame'; index: number } | { kind: DialItemKind; mode: 'strip' } | null {
  const frameMatch = relativePath.match(/^assets\/minecraft\/textures\/items?\/(compass|recovery_compass|clock)_(\d{2})\.png$/);
  if (frameMatch) {
    const kind = frameMatch[1] as DialItemKind;
    const index = parseInt(frameMatch[2], 10);
    if (index >= 0 && index < DIAL_ITEM_SPECS[kind].frameCount) {
      return { kind, mode: 'frame', index };
    }
    return null;
  }
  const stripMatch = relativePath.match(/^assets\/minecraft\/textures\/items?\/(compass|clock)\.png$/);
  if (stripMatch) {
    return { kind: stripMatch[1] as DialItemKind, mode: 'strip' };
  }
  return null;
}

export function classifyBedrockDialPath(
  relativePath: string
): { kind: DialItemKind; role: 'atlas' | 'icon'; priority: number } | null {
  const m = relativePath.match(/^textures\/items\/(compass_atlas|lodestonecompass_atlas|recovery_compass_atlas|watch_atlas|compass_item|lodestonecompass_item|recovery_compass_item|clock_item)\.(png|tga)$/i);
  if (!m) return null;
  switch (m[1].toLowerCase()) {
    case 'compass_atlas': return { kind: 'compass', role: 'atlas', priority: 2 };
    case 'lodestonecompass_atlas': return { kind: 'compass', role: 'atlas', priority: 1 };
    case 'recovery_compass_atlas': return { kind: 'recovery_compass', role: 'atlas', priority: 2 };
    case 'watch_atlas': return { kind: 'clock', role: 'atlas', priority: 2 };
    case 'compass_item':
    case 'lodestonecompass_item': return { kind: 'compass', role: 'icon', priority: 0 };
    case 'recovery_compass_item': return { kind: 'recovery_compass', role: 'icon', priority: 0 };
    case 'clock_item': return { kind: 'clock', role: 'icon', priority: 0 };
    default: return null;
  }
}

export function stitchDialAtlas(
  frames: Map<number, Uint8Array>,
  spec: DialItemSpec
): { atlasPng: Uint8Array; iconPng: Uint8Array } | null {
  const decodedFrames = new Map<number, { width: number; height: number; rgba: Uint8Array }>();
  let firstDecoded: { width: number; height: number; rgba: Uint8Array } | null = null;
  for (const [idx, bytes] of frames.entries()) {
    const img = decodeImageToRgbaSync(bytes);
    if (img && img.width > 0 && img.height > 0) {
      decodedFrames.set(idx, img);
      if (!firstDecoded) firstDecoded = img;
    }
  }
  if (!firstDecoded) return null;

  const frameSize = firstDecoded.width;
  if (frameSize <= 0 || frameSize * spec.frameCount > MAX_DIAL_ATLAS_DIM) return null;

  const atlasRgba = new Uint8Array(frameSize * frameSize * spec.frameCount * 4);
  const frameByteLen = frameSize * frameSize * 4;
  let lastValid = firstDecoded;

  for (let i = 0; i < spec.frameCount; i++) {
    const src = decodedFrames.get(i) ?? lastValid;
    if (decodedFrames.has(i)) lastValid = src;
    const dstYBase = i * frameSize;
    if (src.width === frameSize && src.height === frameSize) {
      atlasRgba.set(src.rgba.subarray(0, frameByteLen), dstYBase * frameSize * 4);
    } else {
      for (let y = 0; y < frameSize; y++) {
        const sy = Math.min(src.height - 1, Math.floor((y * src.height) / frameSize));
        for (let x = 0; x < frameSize; x++) {
          const sx = Math.min(src.width - 1, Math.floor((x * src.width) / frameSize));
          const sIdx = (sy * src.width + sx) * 4;
          const dIdx = ((dstYBase + y) * frameSize + x) * 4;
          atlasRgba[dIdx] = src.rgba[sIdx];
          atlasRgba[dIdx + 1] = src.rgba[sIdx + 1];
          atlasRgba[dIdx + 2] = src.rgba[sIdx + 2];
          atlasRgba[dIdx + 3] = src.rgba[sIdx + 3];
        }
      }
    }
  }

  const atlasPng = encodeRgbaToPngSync(frameSize, frameSize * spec.frameCount, atlasRgba);
  const iconIdx = spec.preferredIconFrames.find((idx) => idx >= 0 && idx < spec.frameCount) ?? 0;
  const iconSlice = atlasRgba.subarray(iconIdx * frameByteLen, (iconIdx + 1) * frameByteLen);
  const iconPng = encodeRgbaToPngSync(frameSize, frameSize, iconSlice);
  return { atlasPng, iconPng };
}

export function sliceDialAtlas(
  bytes: Uint8Array,
  spec: DialItemSpec
): { frames: Uint8Array[]; stripPng: Uint8Array; iconPng: Uint8Array } | null {
  const decoded = decodeImageToRgbaSync(bytes);
  if (!decoded || decoded.width <= 0 || decoded.height < decoded.width || decoded.height % decoded.width !== 0) {
    return null;
  }
  const size = decoded.width;
  const srcCount = decoded.height / size;
  if (size * spec.frameCount > MAX_DIAL_ATLAS_DIM) return null;

  const frameByteLen = size * size * 4;
  const stripRgba = new Uint8Array(frameByteLen * spec.frameCount);
  const frames: Uint8Array[] = [];

  for (let i = 0; i < spec.frameCount; i++) {
    const srcIdx = srcCount === spec.frameCount ? i : Math.floor((i * srcCount) / spec.frameCount);
    const frameSlice = decoded.rgba.subarray(srcIdx * frameByteLen, (srcIdx + 1) * frameByteLen);
    stripRgba.set(frameSlice, i * frameByteLen);
    frames.push(encodeRgbaToPngSync(size, size, frameSlice));
  }

  const stripPng = encodeRgbaToPngSync(size, size * spec.frameCount, stripRgba);
  const iconIdx = spec.preferredIconFrames.find((idx) => idx >= 0 && idx < spec.frameCount) ?? 0;
  return { frames, stripPng, iconPng: frames[iconIdx] };
}

/**
 * Generates Bedrock Edition item_texture.json content
 * based on the items encountered during conversion.
 */
export function generateItemTexture(
  convertedItems: Set<string>,
  extraEntries?: Record<string, string>
): string {
  const itemTexture: any = {
    resource_pack_name: "pack.name",
    texture_name: "atlas.items",
    texture_data: Object.create(null)
  };

  for (const javaPath of convertedItems) {
    const bedrockPath = getTargetContext(javaPath, 'java-to-bedrock');
    if (bedrockPath && bedrockPath.startsWith('textures/items/')) {
      const texturePath = bedrockPath.replace(/\.(png|tga)$/, '');
      const shortName = texturePath.split('/').pop() || '';
      if (!shortName || isUnsafeObjectKey(shortName)) continue;

      itemTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  if (extraEntries) {
    for (const [key, texturePath] of Object.entries(extraEntries)) {
      if (!key || isUnsafeObjectKey(key)) continue;
      itemTexture.texture_data[key] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(itemTexture, null, 2);
}
