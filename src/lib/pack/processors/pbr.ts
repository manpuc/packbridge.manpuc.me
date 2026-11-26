/**
 * Bidirectional PBR / Shader Map Converter
 * - Bedrock RTX / Deferred Rendering (`*.texture_set.json`, `*_mer.png`, `*_mers.png`, `*_normal.png`, `*_heightmap.png`)
 * - Java LabPBR 1.3 (`*_s.png`, `*_n.png`)
 */

import { inflateSync, unzlibSync } from 'fflate';
import { parseJsonc } from '../metadata';
import { decodeTgaToRgba, encodeRgbaToPngSync } from './tga';

export interface DecodedRgbaImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

const MAX_PBR_DIMENSION = 8192;
const MAX_PBR_PIXELS = 4096 * 4096;

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

  const isInterlaced = interlace === 1;
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_PBR_DIMENSION ||
    height > MAX_PBR_DIMENSION ||
    width * height > MAX_PBR_PIXELS ||
    ![1, 2, 4, 8, 16].includes(bitDepth) ||
    (bitDepth < 8 && colorType !== 0 && colorType !== 3) ||
    (bitDepth === 16 && colorType === 3) ||
    (colorType === 3 && !palette) ||
    (interlace !== 0 && interlace !== 1) ||
    totalIdatLen === 0 ||
    totalIdatLen > MAX_PBR_PIXELS * 8
  ) {
    return null;
  }

  const channels =
    colorType === 6 ? 4 :
    colorType === 2 ? 3 :
    colorType === 4 ? 2 :
    colorType === 0 || colorType === 3 ? 1 : 0;

  if (channels === 0) return null;

  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const ADAM7_X0 = [0, 4, 0, 2, 0, 1, 0];
  const ADAM7_DX = [8, 8, 4, 4, 2, 2, 1];
  const ADAM7_Y0 = [0, 0, 4, 0, 2, 0, 1];
  const ADAM7_DY = [8, 8, 4, 4, 2, 2, 1];

  const passSpecs: Array<{ pw: number; ph: number; stride: number; x0: number; dx: number; y0: number; dy: number }> = [];
  let expectedLen = 0;
  if (!isInterlaced) {
    const stride = Math.ceil((width * channels * bitDepth) / 8);
    passSpecs.push({ pw: width, ph: height, stride, x0: 0, dx: 1, y0: 0, dy: 1 });
    expectedLen = (stride + 1) * height;
  } else {
    for (let p = 0; p < 7; p++) {
      const pw = Math.ceil((width - ADAM7_X0[p]) / ADAM7_DX[p]);
      const ph = Math.ceil((height - ADAM7_Y0[p]) / ADAM7_DY[p]);
      if (pw > 0 && ph > 0) {
        const stride = Math.ceil((pw * channels * bitDepth) / 8);
        passSpecs.push({ pw, ph, stride, x0: ADAM7_X0[p], dx: ADAM7_DX[p], y0: ADAM7_Y0[p], dy: ADAM7_DY[p] });
        expectedLen += (stride + 1) * ph;
      }
    }
  }

  const compressed = new Uint8Array(totalIdatLen);
  let pos = 0;
  for (const part of idatParts) {
    compressed.set(part, pos);
    pos += part.length;
  }

  let rawScanlines: Uint8Array;
  try {
    rawScanlines = unzlibSync(compressed, { out: new Uint8Array(expectedLen) });
  } catch {
    try {
      rawScanlines = inflateSync(compressed, { out: new Uint8Array(expectedLen) });
    } catch {
      return null;
    }
  }

  if (rawScanlines.length < expectedLen) return null;

  const unfilterPass = (srcOffset: number, pw: number, ph: number, stride: number): Uint8Array | null => {
    const unfiltered = new Uint8Array(stride * ph);
    for (let y = 0; y < ph; y++) {
      const srcRow = srcOffset + y * (stride + 1);
      const dstRow = y * stride;
      const prevRow = (y - 1) * stride;
      const filter = rawScanlines[srcRow];
      if (filter > 4) return null;

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
    return unfiltered;
  };

  const passToRgba = (unfiltered: Uint8Array, pw: number, ph: number, stride: number): Uint8Array => {
    if (colorType === 6 && bitDepth === 8) {
      return unfiltered;
    }
    const totalPixels = pw * ph;
    const rgba = new Uint8Array(totalPixels * 4);

    if (bitDepth === 16) {
      if (colorType === 6) {
        for (let i = 0; i < totalPixels; i++) {
          const s = i * 8;
          const d = i * 4;
          rgba[d] = unfiltered[s];
          rgba[d + 1] = unfiltered[s + 2];
          rgba[d + 2] = unfiltered[s + 4];
          rgba[d + 3] = unfiltered[s + 6];
        }
      } else if (colorType === 2) {
        const hasTrns = trns !== null && trns.length >= 6;
        const trnsR = hasTrns ? (trns![0] << 8) | trns![1] : -1;
        const trnsG = hasTrns ? (trns![2] << 8) | trns![3] : -1;
        const trnsB = hasTrns ? (trns![4] << 8) | trns![5] : -1;
        for (let i = 0; i < totalPixels; i++) {
          const s = i * 6;
          const d = i * 4;
          const r16 = (unfiltered[s] << 8) | unfiltered[s + 1];
          const g16 = (unfiltered[s + 2] << 8) | unfiltered[s + 3];
          const b16 = (unfiltered[s + 4] << 8) | unfiltered[s + 5];
          rgba[d] = unfiltered[s];
          rgba[d + 1] = unfiltered[s + 2];
          rgba[d + 2] = unfiltered[s + 4];
          rgba[d + 3] = hasTrns && r16 === trnsR && g16 === trnsG && b16 === trnsB ? 0 : 255;
        }
      } else if (colorType === 0) {
        const hasTrns = trns !== null && trns.length >= 2;
        const trnsGray = hasTrns ? (trns![0] << 8) | trns![1] : -1;
        for (let i = 0; i < totalPixels; i++) {
          const s = i * 2;
          const d = i * 4;
          const v16 = (unfiltered[s] << 8) | unfiltered[s + 1];
          const v = unfiltered[s];
          rgba[d] = v;
          rgba[d + 1] = v;
          rgba[d + 2] = v;
          rgba[d + 3] = hasTrns && v16 === trnsGray ? 0 : 255;
        }
      } else if (colorType === 4) {
        for (let i = 0; i < totalPixels; i++) {
          const s = i * 4;
          const d = i * 4;
          const v = unfiltered[s];
          rgba[d] = v;
          rgba[d + 1] = v;
          rgba[d + 2] = v;
          rgba[d + 3] = unfiltered[s + 2];
        }
      }
      return rgba;
    }

    let samples = unfiltered;
    if (bitDepth < 8) {
      samples = new Uint8Array(pw * ph);
      const mask = (1 << bitDepth) - 1;
      const pixelsPerByte = 8 / bitDepth;
      for (let y = 0; y < ph; y++) {
        const rowOffset = y * stride;
        for (let x = 0; x < pw; x++) {
          const byteVal = unfiltered[rowOffset + Math.floor(x / pixelsPerByte)];
          const shift = (pixelsPerByte - 1 - (x % pixelsPerByte)) * bitDepth;
          samples[y * pw + x] = (byteVal >>> shift) & mask;
        }
      }
    }

    if (colorType === 2) {
      const hasTrns = trns !== null && trns.length >= 6;
      const trnsR = hasTrns ? ((trns![0] << 8) | trns![1]) & 0xff : -1;
      const trnsG = hasTrns ? ((trns![2] << 8) | trns![3]) & 0xff : -1;
      const trnsB = hasTrns ? ((trns![4] << 8) | trns![5]) & 0xff : -1;
      for (let i = 0; i < totalPixels; i++) {
        const s = i * 3;
        const d = i * 4;
        const r = samples[s];
        const g = samples[s + 1];
        const b = samples[s + 2];
        rgba[d] = r;
        rgba[d + 1] = g;
        rgba[d + 2] = b;
        rgba[d + 3] = hasTrns && r === trnsR && g === trnsG && b === trnsB ? 0 : 255;
      }
    } else if (colorType === 0) {
      const hasTrns = trns !== null && trns.length >= 2;
      const trnsGray = hasTrns ? (trns![0] << 8) | trns![1] : -1;
      const scale = 255 / ((1 << bitDepth) - 1);
      for (let i = 0; i < totalPixels; i++) {
        const raw = samples[i];
        const v = Math.round(raw * scale);
        const d = i * 4;
        rgba[d] = v;
        rgba[d + 1] = v;
        rgba[d + 2] = v;
        rgba[d + 3] = hasTrns && raw === trnsGray ? 0 : 255;
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

    return rgba;
  };

  if (!isInterlaced) {
    const spec = passSpecs[0];
    const unfiltered = unfilterPass(0, spec.pw, spec.ph, spec.stride);
    if (!unfiltered) return null;
    return { width, height, rgba: passToRgba(unfiltered, spec.pw, spec.ph, spec.stride) };
  }

  const outRgba = new Uint8Array(width * height * 4);
  let srcOffset = 0;
  for (const spec of passSpecs) {
    const unfiltered = unfilterPass(srcOffset, spec.pw, spec.ph, spec.stride);
    if (!unfiltered) return null;
    srcOffset += (spec.stride + 1) * spec.ph;
    const passRgba = passToRgba(unfiltered, spec.pw, spec.ph, spec.stride);
    for (let py = 0; py < spec.ph; py++) {
      const dy = spec.y0 + py * spec.dy;
      for (let px = 0; px < spec.pw; px++) {
        const dx = spec.x0 + px * spec.dx;
        const sIdx = (py * spec.pw + px) * 4;
        const dIdx = (dy * width + dx) * 4;
        outRgba[dIdx] = passRgba[sIdx];
        outRgba[dIdx + 1] = passRgba[sIdx + 1];
        outRgba[dIdx + 2] = passRgba[sIdx + 2];
        outRgba[dIdx + 3] = passRgba[sIdx + 3];
      }
    }
  }

  return { width, height, rgba: outRgba };
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

export async function decodeImageToRgba(
  bytes: Uint8Array,
  maxDim = MAX_PBR_DIMENSION
): Promise<DecodedRgbaImage | null> {
  const sync = decodeImageToRgbaSync(bytes);
  if (sync) {
    return sync.width <= maxDim && sync.height <= maxDim && sync.width * sync.height <= MAX_PBR_PIXELS
      ? sync
      : null;
  }

  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return null;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as any], { type: 'image/png' }));
    if (
      bitmap.width <= 0 ||
      bitmap.height <= 0 ||
      bitmap.width > maxDim ||
      bitmap.height > maxDim ||
      bitmap.width * bitmap.height > MAX_PBR_PIXELS
    ) {
      return null;
    }
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
  } finally {
    bitmap?.close();
  }
}

function packBedrockMerPixelToLabPbr(
  out: Uint8Array,
  idx: number,
  metallic: number,
  emissive: number,
  roughness: number,
  sss: number,
  hasSubsurface: boolean
): void {
  // Both Bedrock RTX/Vibrant Visuals MER Blue and LabPBR _s Red store perceptual smoothness/roughness.
  const smoothness = 255 - roughness;

  // In LabPBR, 230..254 are hardcoded metal IDs and 255 is custom metal (albedo as F0).
  // Map Bedrock metals (>=128) to 255 so they never collide with hardcoded metal IDs, and dielectrics to 10..51 (4%..20% F0).
  const f0OrMetal = metallic >= 128
    ? 255
    : Math.round((0.04 + (metallic / 128) * 0.16) * 255);

  // Subsurface Scattering (65..255 in LabPBR when SSS > 0)
  const labB = hasSubsurface && sss > 0
    ? Math.min(255, 65 + Math.round((sss / 255) * 190))
    : 0;

  // Emissive (in LabPBR, alpha 255 means NO emission; 1..254 means increasing emission)
  const labA = emissive > 0
    ? Math.max(1, Math.min(254, Math.round((emissive / 255) * 254)))
    : 255;

  out[idx] = smoothness;
  out[idx + 1] = f0OrMetal;
  out[idx + 2] = labB;
  out[idx + 3] = labA;
}

/**
 * Converts Bedrock MER / MERS map (`*_mer.png`, `*_mers.png`, or `.tga`)
 * into Java LabPBR 1.3 Specular Map (`*_s.png`).
 */
export async function convertBedrockMerToLabPbrSpec(
  merBytes: Uint8Array,
  hasSubsurface = false
): Promise<Uint8Array | null> {
  const decoded = await decodeImageToRgba(merBytes);
  if (!decoded) {
    return null;
  }

  const { width, height, rgba } = decoded;
  const out = new Uint8Array(rgba.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    packBedrockMerPixelToLabPbr(
      out,
      idx,
      rgba[idx],
      rgba[idx + 1],
      rgba[idx + 2],
      hasSubsurface ? rgba[idx + 3] : 0,
      hasSubsurface
    );
  }

  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Synthesizes a uniform LabPBR 1.3 Specular Map (`*_s.png`) from constant Bedrock MER(S) values.
 */
export function synthesizeUniformLabPbrSpec(
  width: number,
  height: number,
  mer: [number, number, number, number],
  hasSubsurface = false
): Uint8Array | null {
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_PBR_DIMENSION ||
    height > MAX_PBR_DIMENSION ||
    width * height > MAX_PBR_PIXELS
  ) {
    return null;
  }
  const pixel = new Uint8Array(4);
  packBedrockMerPixelToLabPbr(pixel, 0, mer[0], mer[1], mer[2], mer[3], hasSubsurface);
  const totalPixels = width * height;
  const out = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    out[idx] = pixel[0];
    out[idx + 1] = pixel[1];
    out[idx + 2] = pixel[2];
    out[idx + 3] = pixel[3];
  }
  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Synthesizes a uniform RGBA PNG from a constant color value.
 */
export function synthesizeUniformColorPng(
  width: number,
  height: number,
  rgbaVal: [number, number, number, number]
): Uint8Array | null {
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_PBR_DIMENSION ||
    height > MAX_PBR_DIMENSION ||
    width * height > MAX_PBR_PIXELS
  ) {
    return null;
  }
  const totalPixels = width * height;
  const out = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    out[idx] = rgbaVal[0];
    out[idx + 1] = rgbaVal[1];
    out[idx + 2] = rgbaVal[2];
    out[idx + 3] = rgbaVal[3];
  }
  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Converts Java LabPBR 1.3 Specular Map (`*_s.png`)
 * into Bedrock MER / MERS map (`*_mer.png`).
 */
export async function convertLabPbrSpecToBedrockMer(
  specBytes: Uint8Array,
  allowSubsurface = false
): Promise<{ png: Uint8Array; hasSubsurface: boolean } | null> {
  const decoded = await decodeImageToRgba(specBytes);
  if (!decoded) return null;

  const { width, height, rgba } = decoded;
  const totalPixels = width * height;

  let hasSubsurface = false;
  if (allowSubsurface) {
    for (let i = 0; i < totalPixels; i++) {
      if (rgba[i * 4 + 2] > 65) {
        hasSubsurface = true;
        break;
      }
    }
  }

  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const smoothness = rgba[idx];
    const f0 = rgba[idx + 1];
    const porosityOrSss = rgba[idx + 2];
    const labEmissive = rgba[idx + 3];

    // 1. Metallic from LabPBR G channel (0..229 = dielectric, 230..255 = metal)
    const metallic = f0 >= 230 ? 255 : 0;

    // 2. Emissive from LabPBR A channel (255 = 0 emission)
    const emissive = labEmissive === 255 ? 0 : Math.min(255, Math.round((labEmissive / 254) * 255));

    // 3. Roughness = 255 - perceptualSmoothness
    const roughness = 255 - smoothness;

    // 4. Subsurface Scattering (MERS A channel; 255 opaque when standard 3-channel MER)
    const alpha = hasSubsurface
      ? (metallic > 0 ? 0 : (porosityOrSss >= 65 ? Math.round(((porosityOrSss - 65) / 190) * 255) : 0))
      : 255;

    out[idx] = metallic;
    out[idx + 1] = emissive;
    out[idx + 2] = roughness;
    out[idx + 3] = alpha;
  }

  return {
    png: encodeRgbaToPngSync(width, height, out),
    hasSubsurface
  };
}

/**
 * Converts Bedrock Normal Map (and optional Heightmap) into Java LabPBR 1.3 Normal Map (`*_n.png`).
 * R = X, G = Y (DirectX Y-), B = 255 (neutral AO), A = Heightmap (or 255 flush).
 */
export async function convertBedrockNormalToLabPbr(
  normalBytes: Uint8Array,
  heightBytes?: Uint8Array | null
): Promise<Uint8Array | null> {
  const decoded = await decodeImageToRgba(normalBytes);
  if (!decoded) return null;

  const decodedHeight = heightBytes ? await decodeImageToRgba(heightBytes) : null;
  const { width, height, rgba } = decoded;
  const out = new Uint8Array(rgba.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      out[idx] = rgba[idx];
      out[idx + 1] = rgba[idx + 1];
      out[idx + 2] = 255; // Neutral LabPBR AO (never copy Bedrock Z-normal into AO)

      if (decodedHeight) {
        const hx = Math.min(decodedHeight.width - 1, Math.floor((x * decodedHeight.width) / width));
        const hy = Math.min(decodedHeight.height - 1, Math.floor((y * decodedHeight.height) / height));
        const hIdx = (hy * decodedHeight.width + hx) * 4;
        const lum = Math.round(
          0.299 * decodedHeight.rgba[hIdx] +
          0.587 * decodedHeight.rgba[hIdx + 1] +
          0.114 * decodedHeight.rgba[hIdx + 2]
        );
        out[idx + 3] = Math.max(1, lum);
      } else {
        out[idx + 3] = 255;
      }
    }
  }

  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Converts Bedrock grayscale Heightmap into Java LabPBR 1.3 Normal Map (`*_n.png`)
 * using a seamless 3x3 Sobel filter (DirectX Y- convention) and stores height in Alpha.
 */
export async function convertBedrockHeightmapToLabPbr(
  heightBytes: Uint8Array,
  strength = 1.5
): Promise<Uint8Array | null> {
  const decoded = await decodeImageToRgba(heightBytes);
  if (!decoded) return null;

  const { width, height, rgba } = decoded;
  const totalPixels = width * height;
  const heights = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    heights[i] = Math.round(0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]);
  }

  const isAnimatedStrip = height > width && height % width === 0;
  const frameH = isAnimatedStrip ? width : height;
  const out = new Uint8Array(totalPixels * 4);

  const sample = (x: number, y: number, frameBase: number): number => {
    const wx = ((x % width) + width) % width;
    const localY = (((y - frameBase) % frameH) + frameH) % frameH;
    return heights[(frameBase + localY) * width + wx];
  };

  for (let y = 0; y < height; y++) {
    const frameBase = isAnimatedStrip ? Math.floor(y / frameH) * frameH : 0;
    for (let x = 0; x < width; x++) {
      const tl = sample(x - 1, y - 1, frameBase);
      const t = sample(x, y - 1, frameBase);
      const tr = sample(x + 1, y - 1, frameBase);
      const l = sample(x - 1, y, frameBase);
      const r = sample(x + 1, y, frameBase);
      const bl = sample(x - 1, y + 1, frameBase);
      const b = sample(x, y + 1, frameBase);
      const br = sample(x + 1, y + 1, frameBase);

      const sobelX = -tl + tr - 2 * l + 2 * r - bl + br;
      const sobelY = -tl - 2 * t - tr + bl + 2 * b + br;
      const gx = (sobelX / (4 * 255)) * strength;
      const gy = (sobelY / (4 * 255)) * strength;

      // DirectX Y- convention: +X right, +Y down
      const nx = -gx;
      const ny = -gy;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * width + x) * 4;
      out[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      out[idx + 2] = 255;
      out[idx + 3] = Math.max(1, heights[y * width + x]);
    }
  }

  return encodeRgbaToPngSync(width, height, out);
}

/**
 * Converts Java LabPBR 1.3 Normal Map (`*_n.png`) into Bedrock Normal Map or Heightmap.
 * Reconstructs Z normal into Blue and sets Alpha = 255; emits a grayscale Heightmap if RG is flat and Alpha varies.
 */
export async function convertLabPbrNormalToBedrock(
  normalBytes: Uint8Array
): Promise<{ kind: 'normal' | 'heightmap'; png: Uint8Array } | null> {
  const decoded = await decodeImageToRgba(normalBytes);
  if (!decoded) return null;

  const { width, height, rgba } = decoded;
  const totalPixels = width * height;

  let hasNormalDetail = false;
  let minA = 255;
  let maxA = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (Math.abs(rgba[idx] - 128) > 2 || Math.abs(rgba[idx + 1] - 128) > 2) {
      hasNormalDetail = true;
    }
    const a = rgba[idx + 3];
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }

  const out = new Uint8Array(rgba.length);
  if (!hasNormalDetail && minA < maxA) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const h = rgba[idx + 3];
      out[idx] = h;
      out[idx + 1] = h;
      out[idx + 2] = h;
      out[idx + 3] = 255;
    }
    return { kind: 'heightmap', png: encodeRgbaToPngSync(width, height, out) };
  }

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const nx = (r / 255) * 2 - 1;
    const ny = (g / 255) * 2 - 1;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    out[idx] = r;
    out[idx + 1] = g;
    out[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    out[idx + 3] = 255;
  }

  return { kind: 'normal', png: encodeRgbaToPngSync(width, height, out) };
}

export interface ParsedTextureSet {
  color?: string;
  colorUniform?: [number, number, number, number];
  mer?: string;
  merUniform?: [number, number, number, number];
  normal?: string;
  heightmap?: string;
  heightmapUniform?: number;
  hasSubsurface?: boolean;
}

function clampByte(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : fallback;
}

function parseHexUniform(hex: string, defaultAlpha: number): [number, number, number, number] | null {
  const clean = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(clean)) {
    return [
      parseInt(clean.slice(1, 3), 16),
      parseInt(clean.slice(3, 5), 16),
      parseInt(clean.slice(5, 7), 16),
      defaultAlpha
    ];
  }
  // shortcut: assumes #RRGGBBAA hex order when 8-digit hex is used in texture_set.json
  if (/^#[0-9a-f]{8}$/i.test(clean)) {
    return [
      parseInt(clean.slice(1, 3), 16),
      parseInt(clean.slice(3, 5), 16),
      parseInt(clean.slice(5, 7), 16),
      parseInt(clean.slice(7, 9), 16)
    ];
  }
  return null;
}

function parseTextureSetField(
  val: unknown,
  defaultAlpha: number
): { ref?: string; uniform?: [number, number, number, number] } {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('#')) {
      const hex = parseHexUniform(trimmed, defaultAlpha);
      return hex ? { uniform: hex } : {};
    }
    const normalized = trimmed.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\.(png|tga)$/i, '');
    return normalized ? { ref: normalized } : {};
  }
  if (Array.isArray(val) && val.length >= 3) {
    return {
      uniform: [
        clampByte(val[0]),
        clampByte(val[1]),
        clampByte(val[2]),
        val.length >= 4 ? clampByte(val[3], defaultAlpha) : defaultAlpha
      ]
    };
  }
  return {};
}

export function parseTextureSetJson(jsonStr: string): ParsedTextureSet | null {
  try {
    const parsed = parseJsonc(jsonStr) as Record<string, any>;
    const ts = parsed?.['minecraft:texture_set'];
    if (!ts || typeof ts !== 'object') return null;

    const result: ParsedTextureSet = {};
    const colorField = parseTextureSetField(ts.color, 255);
    if (colorField.ref) result.color = colorField.ref;
    if (colorField.uniform) result.colorUniform = colorField.uniform;

    if (ts.metalness_emissive_roughness_subsurface !== undefined) {
      const mersField = parseTextureSetField(ts.metalness_emissive_roughness_subsurface, 0);
      if (mersField.ref) result.mer = mersField.ref;
      if (mersField.uniform) result.merUniform = mersField.uniform;
      result.hasSubsurface = true;
    } else if (ts.metalness_emissive_roughness !== undefined) {
      const merField = parseTextureSetField(ts.metalness_emissive_roughness, 255);
      if (merField.ref) result.mer = merField.ref;
      if (merField.uniform) result.merUniform = merField.uniform;
    }

    const normalField = parseTextureSetField(ts.normal, 255);
    if (normalField.ref) result.normal = normalField.ref;

    if (typeof ts.heightmap === 'number' && Number.isFinite(ts.heightmap)) {
      result.heightmapUniform = clampByte(ts.heightmap);
    } else {
      const heightField = parseTextureSetField(ts.heightmap, 255);
      if (heightField.ref) result.heightmap = heightField.ref;
    }

    return result;
  } catch {
    return null;
  }
}

export interface BedrockTextureSetOptions {
  hasMer?: boolean;
  hasSubsurface?: boolean;
  hasNormal?: boolean;
  hasHeightmap?: boolean;
}

/**
 * Generates a Bedrock `*.texture_set.json` file (`1.21.30` when MERS subsurface is used, `1.16.100` otherwise).
 */
export function generateBedrockTextureSetJson(
  baseName: string,
  hasMerOrOptions: boolean | BedrockTextureSetOptions,
  hasNormalArg = false
): string {
  const opts: BedrockTextureSetOptions = typeof hasMerOrOptions === 'boolean'
    ? { hasMer: hasMerOrOptions, hasNormal: hasNormalArg }
    : hasMerOrOptions;

  const textureSet: Record<string, string> = {
    color: baseName
  };
  if (opts.hasMer) {
    if (opts.hasSubsurface) {
      textureSet.metalness_emissive_roughness_subsurface = `${baseName}_mer`;
    } else {
      textureSet.metalness_emissive_roughness = `${baseName}_mer`;
    }
  }
  if (opts.hasNormal) {
    textureSet.normal = `${baseName}_normal`;
  } else if (opts.hasHeightmap) {
    textureSet.heightmap = `${baseName}_heightmap`;
  }

  return JSON.stringify(
    {
      format_version: opts.hasSubsurface ? '1.21.30' : '1.16.100',
      'minecraft:texture_set': textureSet
    },
    null,
    2
  );
}

const VANILLA_BEDROCK_NORMAL_DIFFUSE = new Set([
  'textures/blocks/piston_top_normal',
  'textures/blocks/rail_normal',
  'textures/blocks/red_sandstone_normal',
  'textures/blocks/sandstone_normal',
  'textures/items/book_normal',
  'textures/items/minecart_normal',
]);

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

  const m = relativePath.match(
    /^(textures\/(?:blocks?|items?|entity|models|environment|painting|particle|trims)\/.*?)_(mers|mer|normal|heightmap)(?:_weak)?\.(png|tga)$/i
  );
  if (m) {
    const rawKind = m[2].toLowerCase() as 'mer' | 'mers' | 'normal' | 'heightmap';
    if (rawKind === 'normal') {
      const normKey = relativePath
        .toLowerCase()
        .replace(/\.(png|tga)$/i, '')
        .replace(/^textures\/block\//, 'textures/blocks/')
        .replace(/^textures\/item\//, 'textures/items/');
      if (VANILLA_BEDROCK_NORMAL_DIFFUSE.has(normKey)) {
        return null;
      }
    }
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
  const m = relativePath.match(/^(assets\/minecraft\/textures\/(?!(?:gui|font|colormap|misc)\/).*?)_([sn])\.png$/i);
  if (m) {
    return {
      type: m[2].toLowerCase() === 's' ? 'specular' : 'normal',
      baseJavaTexturePath: `${m[1]}.png`
    };
  }
  return null;
}

