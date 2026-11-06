/**
 * Bidirectional PBR / Shader Map Converter
 * - Bedrock RTX / Deferred Rendering (`*.texture_set.json`, `*_mer.png`, `*_mers.png`, `*_normal.png`, `*_heightmap.png`)
 * - Java LabPBR 1.3 (`*_s.png`, `*_n.png`)
 */

import { inflateSync, unzlibSync } from 'fflate';
import { decodeTgaToRgba, encodeRgbaToPngSync, convertTgaToPng } from './tga';

export interface DecodedRgbaImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

const MAX_PBR_DIMENSION = 8192;

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Pure-JS synchronous PNG decoder (supports 8-bit Grayscale, RGB, Palette, Grayscale+Alpha, RGBA)
 */
export function decodePngToRgbaSync(data: Uint8Array): DecodedRgbaImage | null {
  if (
    data.length < 33 ||
    data[0] !== 0x89 ||
    data[1] !== 0x50 ||
    data[2] !== 0x4e ||
    data[3] !== 0x47
  ) {
    return null;
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idatParts: Uint8Array[] = [];
  let totalIdatLen = 0;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  while (offset + 8 <= data.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );
    const chunkStart = offset + 8;
    if (chunkStart + length + 4 > data.length) break;

    if (type === 'IHDR' && length >= 13) {
      width = view.getUint32(chunkStart, false);
      height = view.getUint32(chunkStart + 4, false);
      bitDepth = data[chunkStart + 8];
      colorType = data[chunkStart + 9];
      interlace = data[chunkStart + 12];
    } else if (type === 'PLTE') {
      palette = data.subarray(chunkStart, chunkStart + length);
    } else if (type === 'tRNS') {
      trns = data.subarray(chunkStart, chunkStart + length);
    } else if (type === 'IDAT') {
      idatParts.push(data.subarray(chunkStart, chunkStart + length));
      totalIdatLen += length;
    } else if (type === 'IEND') {
      break;
    }

    offset = chunkStart + length + 4;
  }

  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_PBR_DIMENSION ||
    height > MAX_PBR_DIMENSION ||
    ![1, 2, 4, 8].includes(bitDepth) ||
    (bitDepth < 8 && colorType !== 0 && colorType !== 3) ||
    interlace !== 0 ||
    totalIdatLen === 0
  ) {
    return null;
  }

  const channels =
    colorType === 6 ? 4 :
    colorType === 2 ? 3 :
    colorType === 4 ? 2 :
    colorType === 0 || colorType === 3 ? 1 : 0;

  if (channels === 0) return null;

  const compressed = new Uint8Array(totalIdatLen);
  let pos = 0;
  for (const part of idatParts) {
    compressed.set(part, pos);
    pos += part.length;
  }

  let rawScanlines: Uint8Array;
  try {
    rawScanlines = unzlibSync(compressed);
  } catch {
    try {
      rawScanlines = inflateSync(compressed);
    } catch {
      return null;
    }
  }

  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const expectedLen = (stride + 1) * height;
  if (rawScanlines.length < expectedLen) return null;

  const unfiltered = new Uint8Array(stride * height);

  for (let y = 0; y < height; y++) {
    const srcRow = y * (stride + 1);
    const dstRow = y * stride;
    const prevRow = (y - 1) * stride;
    const filter = rawScanlines[srcRow];

    for (let x = 0; x < stride; x++) {
      const raw = rawScanlines[srcRow + 1 + x];
      const a = x >= bpp ? unfiltered[dstRow + x - bpp] : 0;
      const b = y > 0 ? unfiltered[prevRow + x] : 0;
      const c = y > 0 && x >= bpp ? unfiltered[prevRow + x - bpp] : 0;

      let val = raw;
      if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + ((a + b) >>> 1)) & 0xff;
      else if (filter === 4) val = (raw + paethPredictor(a, b, c)) & 0xff;

      unfiltered[dstRow + x] = val;
    }
  }

  if (colorType === 6) {
    return { width, height, rgba: unfiltered };
  }

  // Unpack sub-byte samples (bitDepth 1, 2, 4) into 1-byte indices per pixel
  let samples = unfiltered;
  if (bitDepth < 8) {
    samples = new Uint8Array(width * height);
    const mask = (1 << bitDepth) - 1;
    const pixelsPerByte = 8 / bitDepth;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * stride;
      for (let x = 0; x < width; x++) {
        const byteVal = unfiltered[rowOffset + Math.floor(x / pixelsPerByte)];
        const shift = (pixelsPerByte - 1 - (x % pixelsPerByte)) * bitDepth;
        samples[y * width + x] = (byteVal >>> shift) & mask;
      }
    }
  }

  const totalPixels = width * height;
  const rgba = new Uint8Array(totalPixels * 4);

  if (colorType === 2) {
    for (let i = 0; i < totalPixels; i++) {
      const s = i * 3;
      const d = i * 4;
      rgba[d] = samples[s];
      rgba[d + 1] = samples[s + 1];
      rgba[d + 2] = samples[s + 2];
      rgba[d + 3] = 255;
    }
  } else if (colorType === 0) {
    const scale = 255 / ((1 << bitDepth) - 1);
    for (let i = 0; i < totalPixels; i++) {
      const v = Math.round(samples[i] * scale);
      const d = i * 4;
      rgba[d] = v;
      rgba[d + 1] = v;
      rgba[d + 2] = v;
      rgba[d + 3] = 255;
    }
  } else if (colorType === 4) {
    for (let i = 0; i < totalPixels; i++) {
      const s = i * 2;
      const d = i * 4;
      const v = samples[s];
      rgba[d] = v;
      rgba[d + 1] = v;
      rgba[d + 2] = v;
      rgba[d + 3] = samples[s + 1];
    }
  } else if (colorType === 3 && palette) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = samples[i];
      const pIdx = idx * 3;
      const d = i * 4;
      rgba[d] = pIdx < palette.length ? palette[pIdx] : 0;
      rgba[d + 1] = pIdx + 1 < palette.length ? palette[pIdx + 1] : 0;
      rgba[d + 2] = pIdx + 2 < palette.length ? palette[pIdx + 2] : 0;
      rgba[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }

  return { width, height, rgba };
}

export function decodeImageToRgbaSync(bytes: Uint8Array): DecodedRgbaImage | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return decodePngToRgbaSync(bytes);
  }
  return decodeTgaToRgba(bytes);
}

/**
 * Converts Bedrock MER / MERS map (`*_mer.png`, `*_mers.png`, or `.tga`)
 * into Java LabPBR 1.3 Specular Map (`*_s.png`).
 *
 * Bedrock MER(S):
 *   R = Metalness (0..255)
 *   G = Emissive (0..255)
 *   B = Linear Roughness (0..255)
 *   A = Subsurface Scattering (0..255, when MERS)
 *
 * Java LabPBR 1.3 Specular (`_s.png`):
 *   R = Perceptual Smoothness: (1.0 - sqrt(roughness)) * 255
 *   G = F0 / Metalness (0..229 = dielectric F0, 230..255 = metal)
 *   B = Porosity (0..64) / Subsurface Scattering (65..255)
 *   A = Emissive (0..254 = 0..100% emissive, 255 = 0% emissive)
 */
export async function convertBedrockMerToLabPbrSpec(
  merBytes: Uint8Array,
  hasSubsurface = false
): Promise<Uint8Array | null> {
  const decoded = decodeImageToRgbaSync(merBytes);
  if (!decoded) {
    return await convertTgaToPng(merBytes);
  }

  const { width, height, rgba } = decoded;
  const out = new Uint8Array(rgba.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const metallic = rgba[idx];
    const emissive = rgba[idx + 1];
    const roughness = rgba[idx + 2];
    const sss = hasSubsurface ? rgba[idx + 3] : 0;

    // 1. Perceptual Smoothness = 1.0 - sqrt(linearRoughness)
    const normRoughness = roughness / 255;
    const smoothness = Math.round(Math.max(0, Math.min(1, 1 - Math.sqrt(normRoughness))) * 255);

    // 2. Metalness / F0
    // In LabPBR, values >= 230 represent metals (255 = pure metal albedo); dielectric F0 is ~4..229.
    const f0OrMetal = metallic >= 200
      ? Math.max(230, metallic)
      : Math.max(4, Math.min(229, Math.round((metallic / 200) * 225) + 4));

    // 3. Subsurface Scattering (65..255 in LabPBR when SSS > 0)
    const labB = sss > 4 ? Math.min(255, 65 + Math.round((sss / 255) * 190)) : 0;

    // 4. Emissive (in LabPBR, alpha 255 means NO emission; 1..254 means increasing emission)
    const labA = emissive > 0
      ? Math.max(1, Math.min(254, Math.round((emissive / 255) * 253) + 1))
      : 255;

    out[idx] = smoothness;
    out[idx + 1] = f0OrMetal;
    out[idx + 2] = labB;
    out[idx + 3] = labA;
  }

  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Converts Java LabPBR 1.3 Specular Map (`*_s.png`)
 * into Bedrock MER / MERS map (`*_mer.png`).
 */
export function convertLabPbrSpecToBedrockMer(specBytes: Uint8Array): Uint8Array | null {
  const decoded = decodeImageToRgbaSync(specBytes);
  if (!decoded) return null;

  const { width, height, rgba } = decoded;
  const out = new Uint8Array(rgba.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const smoothness = rgba[idx];
    const f0 = rgba[idx + 1];
    const porosityOrSss = rgba[idx + 2];
    const labEmissive = rgba[idx + 3];

    // 1. Metallic from LabPBR G channel
    const metallic = f0 >= 230 ? 255 : Math.max(0, Math.round(((f0 - 4) / 225) * 180));

    // 2. Emissive from LabPBR A channel (255 = 0 emission)
    const emissive = labEmissive === 255 ? 0 : Math.min(255, Math.round((labEmissive / 254) * 255));

    // 3. Linear Roughness = (1.0 - perceptualSmoothness)^2
    const perceptualRoughness = 1 - smoothness / 255;
    const roughness = Math.round(Math.max(0, Math.min(1, perceptualRoughness * perceptualRoughness)) * 255);

    // 4. Subsurface Scattering
    const sss = porosityOrSss >= 65
      ? Math.round(((porosityOrSss - 65) / 190) * 255)
      : 255;

    out[idx] = metallic;
    out[idx + 1] = emissive;
    out[idx + 2] = roughness;
    out[idx + 3] = sss;
  }

  return encodeRgbaToPngSync(width, height, out);
}

export interface ParsedTextureSet {
  color?: string;
  mer?: string;
  normal?: string;
  heightmap?: string;
  hasSubsurface?: boolean;
}

/**
 * Parses a Bedrock `*.texture_set.json` file to identify linked color, MER/MERS, and normal/heightmap textures.
 */
export function parseTextureSetJson(jsonStr: string): ParsedTextureSet | null {
  try {
    const cleaned = jsonStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const parsed = JSON.parse(cleaned);
    const ts = parsed?.['minecraft:texture_set'];
    if (!ts || typeof ts !== 'object') return null;

    const result: ParsedTextureSet = {};
    if (typeof ts.color === 'string') result.color = ts.color;
    if (typeof ts.metalness_emissive_roughness_subsurface === 'string') {
      result.mer = ts.metalness_emissive_roughness_subsurface;
      result.hasSubsurface = true;
    } else if (typeof ts.metalness_emissive_roughness === 'string') {
      result.mer = ts.metalness_emissive_roughness;
    }
    if (typeof ts.normal === 'string') result.normal = ts.normal;
    if (typeof ts.heightmap === 'string') result.heightmap = ts.heightmap;

    return result;
  } catch {
    return null;
  }
}

/**
 * Generates a Bedrock `*.texture_set.json` file (format_version 1.16.100, compatible with 1.16.100 - 1.26.60+).
 */
export function generateBedrockTextureSetJson(
  baseName: string,
  hasMer: boolean,
  hasNormal: boolean
): string {
  const textureSet: Record<string, string> = {
    color: baseName
  };
  if (hasMer) {
    textureSet.metalness_emissive_roughness = `${baseName}_mer`;
  }
  if (hasNormal) {
    textureSet.normal = `${baseName}_normal`;
  }

  return JSON.stringify(
    {
      format_version: '1.16.100',
      'minecraft:texture_set': textureSet
    },
    null,
    2
  );
}

/**
 * Checks if a Bedrock relative path is a PBR companion asset (`*.texture_set.json`, `*_mer.png`, `*_mers.png`, `*_normal.png`, `*_heightmap.png`).
 */
export function classifyBedrockPbrPath(relativePath: string): {
  type: 'texture_set' | 'mer' | 'mers' | 'normal' | 'heightmap';
  baseBedrockTexturePath: string;
} | null {
  if (/\.texture_set\.json(?:\.json)?$/i.test(relativePath)) {
    const base = relativePath.replace(/\.texture_set\.json(?:\.json)?$/i, '.png');
    return { type: 'texture_set', baseBedrockTexturePath: base };
  }

  const m = relativePath.match(/^(textures\/.*?)_(mers|mer|normal|heightmap)(?:_weak)?\.(png|tga)$/i);
  if (m) {
    const rawKind = m[2].toLowerCase() as 'mer' | 'mers' | 'normal' | 'heightmap';
    return {
      type: rawKind,
      baseBedrockTexturePath: `${m[1]}.png`
    };
  }

  return null;
}

/**
 * Checks if a Java relative path is a LabPBR companion asset (`*_s.png`, `*_n.png`).
 */
export function classifyJavaLabPbrPath(relativePath: string): {
  type: 'specular' | 'normal';
  baseJavaTexturePath: string;
} | null {
  const m = relativePath.match(/^(assets\/minecraft\/textures\/.*?)_([sn])\.png$/);
  if (m) {
    return {
      type: m[2] === 's' ? 'specular' : 'normal',
      baseJavaTexturePath: `${m[1]}.png`
    };
  }
  return null;
}

