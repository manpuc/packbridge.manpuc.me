/**
 * Processor for handling Minecraft grass textures during pack conversion.
 * 
 * Specifically addresses Bedrock Edition texture packs where `grass_side_snowed`
 * is authored as an alpha overlay (snow on top, transparent dirt below).
 * In Java Edition, `grass_block_snow.png` is rendered on solid blocks without multi-pass,
 * so transparency results in a see-through block side.
 * This processor composites the snow overlay onto the pack's `dirt` texture.
 */

import { decodeImageToRgba, decodeImageToRgbaSync } from './pbr';
import { encodeRgbaToPngSync, encodeRgbaToTgaSync } from './tga';

/**
 * Composites a potentially transparent Bedrock snowy grass side texture
 * onto a dirt texture base so it renders properly as an opaque block side in Java Edition.
 */
export async function compositeSnowyGrassSide(
  snowBytes: Uint8Array,
  dirtBytes?: Uint8Array | null
): Promise<Uint8Array | null> {
  const snowImg = await decodeImageToRgba(snowBytes);
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
  let dirtImg = dirtBytes ? await decodeImageToRgba(dirtBytes) : null;
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

/**
 * Composites Java `grass_block_side.png` + optional `grass_block_side_overlay.png` into Bedrock `grass_side.tga`.
 * Bedrock uses alpha=255 for biome-tinted grass blade pixels and alpha=0 for untinted dirt pixels.
 */
export function compositeJavaGrassSideToBedrockTga(
  sideBytes: Uint8Array | null,
  overlayBytes: Uint8Array | null
): Uint8Array | null {
  const sideImg = sideBytes ? decodeImageToRgbaSync(sideBytes) : null;
  const overlayImg = overlayBytes ? decodeImageToRgbaSync(overlayBytes) : null;
  if (!sideImg && !overlayImg) return null;

  const width = sideImg ? sideImg.width : overlayImg!.width;
  const height = sideImg ? sideImg.height : overlayImg!.height;
  const baseImg = sideImg ?? generateFallbackDirtRgba(width, height);
  const outRgba = new Uint8Array(width * height * 4);

  if (!overlayImg) {
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      outRgba[idx] = baseImg.rgba[idx];
      outRgba[idx + 1] = baseImg.rgba[idx + 1];
      outRgba[idx + 2] = baseImg.rgba[idx + 2];
      outRgba[idx + 3] = 0;
    }
    return encodeRgbaToTgaSync(width, height, outRgba);
  }

  for (let y = 0; y < height; y++) {
    const oy = Math.min(overlayImg.height - 1, Math.floor((y * overlayImg.height) / height));
    for (let x = 0; x < width; x++) {
      const ox = Math.min(overlayImg.width - 1, Math.floor((x * overlayImg.width) / width));
      const dIdx = (y * width + x) * 4;
      const oIdx = (oy * overlayImg.width + ox) * 4;
      if (overlayImg.rgba[oIdx + 3] > 0) {
        outRgba[dIdx] = overlayImg.rgba[oIdx];
        outRgba[dIdx + 1] = overlayImg.rgba[oIdx + 1];
        outRgba[dIdx + 2] = overlayImg.rgba[oIdx + 2];
        outRgba[dIdx + 3] = 255;
      } else {
        outRgba[dIdx] = baseImg.rgba[dIdx];
        outRgba[dIdx + 1] = baseImg.rgba[dIdx + 1];
        outRgba[dIdx + 2] = baseImg.rgba[dIdx + 2];
        outRgba[dIdx + 3] = 0;
      }
    }
  }

  return encodeRgbaToTgaSync(width, height, outRgba);
}

/**
 * Splits Bedrock alpha-masked `grass_side.(tga|png)` into Java `grass_block_side.png` (opaque)
 * and `grass_block_side_overlay.png` (grayscale grass blades).
 */
export function splitBedrockGrassSideForJava(
  grassSideBytes: Uint8Array
): { sidePng: Uint8Array; overlayPng: Uint8Array | null } | null {
  const img = decodeImageToRgbaSync(grassSideBytes);
  if (!img) return null;

  const { width, height, rgba } = img;
  const totalPixels = width * height;
  let hasZeroAlpha = false;
  let hasHighAlpha = false;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] === 0) hasZeroAlpha = true;
    else if (rgba[i] >= 128) hasHighAlpha = true;
    if (hasZeroAlpha && hasHighAlpha) break;
  }

  if (!hasZeroAlpha || !hasHighAlpha) {
    return { sidePng: encodeRgbaToPngSync(width, height, rgba), overlayPng: null };
  }

  const sideRgba = new Uint8Array(totalPixels * 4);
  const overlayRgba = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (rgba[idx + 3] >= 128) {
      sideRgba[idx] = Math.round((rgba[idx] * 121) / 255);
      sideRgba[idx + 1] = Math.round((rgba[idx + 1] * 192) / 255);
      sideRgba[idx + 2] = Math.round((rgba[idx + 2] * 90) / 255);
      sideRgba[idx + 3] = 255;

      overlayRgba[idx] = rgba[idx];
      overlayRgba[idx + 1] = rgba[idx + 1];
      overlayRgba[idx + 2] = rgba[idx + 2];
      overlayRgba[idx + 3] = 255;
    } else {
      sideRgba[idx] = rgba[idx];
      sideRgba[idx + 1] = rgba[idx + 1];
      sideRgba[idx + 2] = rgba[idx + 2];
      sideRgba[idx + 3] = 255;
    }
  }

  return {
    sidePng: encodeRgbaToPngSync(width, height, sideRgba),
    overlayPng: encodeRgbaToPngSync(width, height, overlayRgba),
  };
}
