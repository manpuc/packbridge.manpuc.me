/**
 * Processor for handling Minecraft grass textures during pack conversion.
 * 
 * Specifically addresses Bedrock Edition texture packs where `grass_side_snowed`
 * is authored as an alpha overlay (snow on top, transparent dirt below).
 * In Java Edition, `grass_block_snow.png` is rendered on solid blocks without multi-pass,
 * so transparency results in a see-through block side.
 * This processor composites the snow overlay onto the pack's `dirt` texture.
 */

import { decodeImageToRgbaSync, type DecodedRgbaImage } from './pbr';
import { encodeRgbaToPngSync } from './tga';

async function decodeImageAsync(bytes: Uint8Array): Promise<DecodedRgbaImage | null> {
  const sync = decodeImageToRgbaSync(bytes);
  if (sync) return sync;

  if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(new Blob([bytes as any]));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      return {
        width: bitmap.width,
        height: bitmap.height,
        rgba: new Uint8Array(imgData.data.buffer, imgData.data.byteOffset, imgData.data.byteLength),
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Composites a potentially transparent Bedrock snowy grass side texture
 * onto a dirt texture base so it renders properly as an opaque block side in Java Edition.
 */
export async function compositeSnowyGrassSide(
  snowBytes: Uint8Array,
  dirtBytes?: Uint8Array | null
): Promise<Uint8Array | null> {
  const snowImg = await decodeImageAsync(snowBytes);
  if (!snowImg) return null;

  // 1. Check if the snow texture actually has any transparent/semi-transparent pixels
  let hasTransparency = false;
  for (let i = 3; i < snowImg.rgba.length; i += 4) {
    if (snowImg.rgba[i] < 250) {
      hasTransparency = true;
      break;
    }
  }

  // If it's already completely opaque, no composite is necessary
  if (!hasTransparency) {
    return encodeRgbaToPngSync(snowImg.width, snowImg.height, snowImg.rgba);
  }

  // 2. Decode pack's dirt texture, or generate fallback dirt
  let dirtImg = dirtBytes ? await decodeImageAsync(dirtBytes) : null;
  if (!dirtImg) {
    dirtImg = generateFallbackDirtRgba(snowImg.width, snowImg.height);
  }

  // 3. Composite snow over dirt
  const width = snowImg.width;
  const height = snowImg.height;
  const outRgba = new Uint8Array(width * height * 4);

  const dWidth = dirtImg.width;
  const dHeight = dirtImg.height;
  const dRgba = dirtImg.rgba;
  const snowFrameH = height > width && height % width === 0 ? width : height;
  const dirtFrameH = dHeight > dWidth && dHeight % dWidth === 0 ? dWidth : dHeight;

  for (let y = 0; y < height; y++) {
    const dY = Math.floor(((y % snowFrameH) * dirtFrameH) / snowFrameH);
    for (let x = 0; x < width; x++) {
      const dX = Math.floor((x * dWidth) / width);
      const sIdx = (y * width + x) * 4;
      const dIdx = (dY * dWidth + dX) * 4;

      const sR = snowImg.rgba[sIdx];
      const sG = snowImg.rgba[sIdx + 1];
      const sB = snowImg.rgba[sIdx + 2];
      const sA = snowImg.rgba[sIdx + 3];

      const dR = dRgba[dIdx];
      const dG = dRgba[dIdx + 1];
      const dB = dRgba[dIdx + 2];

      const alpha = sA / 255.0;
      outRgba[sIdx] = Math.round(sR * alpha + dR * (1 - alpha));
      outRgba[sIdx + 1] = Math.round(sG * alpha + dG * (1 - alpha));
      outRgba[sIdx + 2] = Math.round(sB * alpha + dB * (1 - alpha));
      outRgba[sIdx + 3] = 255; // 100% opaque for Java block rendering!
    }
  }

  return encodeRgbaToPngSync(width, height, outRgba);
}

function generateFallbackDirtRgba(width: number, height: number): { width: number; height: number; rgba: Uint8Array } {
  const rgba = new Uint8Array(width * height * 4);
  // Standard Minecraft dirt palette colors
  const palette = [
    [134, 96, 67],   // #866043
    [121, 84, 58],   // #79543a
    [114, 79, 54],   // #724f36
    [104, 72, 50],   // #684832
    [142, 103, 73],  // #8e6749
  ];

  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const color = palette[Math.floor(rand() * palette.length)];
    rgba[idx] = color[0];
    rgba[idx + 1] = color[1];
    rgba[idx + 2] = color[2];
    rgba[idx + 3] = 255;
  }

  return { width, height, rgba };
}
