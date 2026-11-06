/**
 * Converts Truevision TGA (TARGA) images (uncompressed & RLE, 24/32-bit true-color, 8-bit grayscale)
 * into PNG binary data using OffscreenCanvas or standard zlib/PNG encoding fallback.
 */

import { zlibSync } from 'fflate';

const MAX_TGA_DIMENSION = 8192;

export interface DecodedTga {
  width: number;
  height: number;
  rgba: Uint8Array;
}

export function decodeTgaToRgba(data: Uint8Array): DecodedTga | null {
  if (data.length < 18) return null;

  const idLength = data[0];
  const colorMapType = data[1];
  const imageType = data[2];

  // Supported types: 1 (Uncompressed Color-Mapped), 2 (Uncompressed True-Color),
  // 3 (Uncompressed Grayscale), 9 (RLE Color-Mapped), 10 (RLE True-Color), 11 (RLE Grayscale)
  if (![1, 2, 3, 9, 10, 11].includes(imageType)) {
    return null;
  }

  const colorMapOrigin = data[3] | (data[4] << 8);
  const colorMapLength = data[5] | (data[6] << 8);
  const colorMapDepth = data[7];

  const width = data[12] | (data[13] << 8);
  const height = data[14] | (data[15] << 8);
  const pixelDepth = data[16];
  const descriptor = data[17];

  if (width <= 0 || height <= 0 || width > MAX_TGA_DIMENSION || height > MAX_TGA_DIMENSION) {
    return null;
  }

  const bytesPerPixel = pixelDepth >> 3;
  if (![1, 2, 3, 4].includes(bytesPerPixel)) {
    return null;
  }

  const isTopOrigin = (descriptor & 0x20) !== 0;
  const isRightOrigin = (descriptor & 0x10) !== 0;

  let offset = 18 + idLength;
  if (offset >= data.length) return null;

  const isColorMapped = imageType === 1 || imageType === 9;
  let palette: Uint8Array | null = null;
  if (colorMapType === 1) {
    const cmapBytesPerEntry = Math.ceil(colorMapDepth / 8);
    const cmapTotalBytes = colorMapLength * cmapBytesPerEntry;
    if (offset + cmapTotalBytes > data.length) return null;
    if (isColorMapped) {
      palette = new Uint8Array((colorMapOrigin + colorMapLength) * 4);
      for (let i = 0; i < colorMapLength; i++) {
        const entryOffset = offset + i * cmapBytesPerEntry;
        const dst = (colorMapOrigin + i) * 4;
        if (cmapBytesPerEntry === 4) {
          palette[dst] = data[entryOffset + 2];
          palette[dst + 1] = data[entryOffset + 1];
          palette[dst + 2] = data[entryOffset];
          palette[dst + 3] = data[entryOffset + 3];
        } else if (cmapBytesPerEntry === 3) {
          palette[dst] = data[entryOffset + 2];
          palette[dst + 1] = data[entryOffset + 1];
          palette[dst + 2] = data[entryOffset];
          palette[dst + 3] = 255;
        } else if (cmapBytesPerEntry === 2) {
          const v = data[entryOffset] | (data[entryOffset + 1] << 8);
          palette[dst] = ((v >> 10) & 0x1f) * 255 / 31;
          palette[dst + 1] = ((v >> 5) & 0x1f) * 255 / 31;
          palette[dst + 2] = (v & 0x1f) * 255 / 31;
          palette[dst + 3] = 255;
        }
      }
    }
    offset += cmapTotalBytes;
  } else if (isColorMapped) {
    return null;
  }

  const totalPixels = width * height;
  const rawPixels = new Uint8Array(totalPixels * 4);
  const isRle = imageType === 9 || imageType === 10 || imageType === 11;

  let pixelIndex = 0;

  const readPixelInto = (srcOffset: number, dstPixelIdx: number) => {
    const dst = dstPixelIdx * 4;
    if (isColorMapped && palette) {
      const idx = bytesPerPixel === 2
        ? (data[srcOffset] | (data[srcOffset + 1] << 8))
        : data[srcOffset];
      const pIdx = idx * 4;
      if (pIdx + 3 < palette.length) {
        rawPixels[dst] = palette[pIdx];
        rawPixels[dst + 1] = palette[pIdx + 1];
        rawPixels[dst + 2] = palette[pIdx + 2];
        rawPixels[dst + 3] = palette[pIdx + 3];
      }
    } else if (bytesPerPixel === 4) {
      rawPixels[dst] = data[srcOffset + 2];     // R
      rawPixels[dst + 1] = data[srcOffset + 1]; // G
      rawPixels[dst + 2] = data[srcOffset];     // B
      rawPixels[dst + 3] = data[srcOffset + 3]; // A
    } else if (bytesPerPixel === 3) {
      rawPixels[dst] = data[srcOffset + 2];     // R
      rawPixels[dst + 1] = data[srcOffset + 1]; // G
      rawPixels[dst + 2] = data[srcOffset];     // B
      rawPixels[dst + 3] = 255;
    } else if (bytesPerPixel === 2) {
      const v = data[srcOffset] | (data[srcOffset + 1] << 8);
      rawPixels[dst] = ((v >> 10) & 0x1f) * 255 / 31;
      rawPixels[dst + 1] = ((v >> 5) & 0x1f) * 255 / 31;
      rawPixels[dst + 2] = (v & 0x1f) * 255 / 31;
      rawPixels[dst + 3] = 255;
    } else {
      const v = data[srcOffset];
      rawPixels[dst] = v;
      rawPixels[dst + 1] = v;
      rawPixels[dst + 2] = v;
      rawPixels[dst + 3] = 255;
    }
  };

  if (!isRle) {
    const required = totalPixels * bytesPerPixel;
    if (offset + required > data.length) return null;
    for (let i = 0; i < totalPixels; i++) {
      readPixelInto(offset, i);
      offset += bytesPerPixel;
    }
  } else {
    while (pixelIndex < totalPixels && offset < data.length) {
      const header = data[offset++];
      const count = (header & 0x7f) + 1;
      if ((header & 0x80) !== 0) {
        // RLE packet
        if (offset + bytesPerPixel > data.length) return null;
        for (let i = 0; i < count && pixelIndex < totalPixels; i++) {
          readPixelInto(offset, pixelIndex++);
        }
        offset += bytesPerPixel;
      } else {
        // Raw packet
        if (offset + count * bytesPerPixel > data.length) return null;
        for (let i = 0; i < count && pixelIndex < totalPixels; i++) {
          readPixelInto(offset, pixelIndex++);
          offset += bytesPerPixel;
        }
      }
    }
    if (pixelIndex < totalPixels) return null;
  }

  // Flip vertically/horizontally if needed (TGA default is bottom-left origin)
  if (isTopOrigin && !isRightOrigin) {
    return { width, height, rgba: rawPixels };
  }

  const finalRgba = new Uint8Array(totalPixels * 4);
  for (let y = 0; y < height; y++) {
    const srcY = isTopOrigin ? y : height - 1 - y;
    for (let x = 0; x < width; x++) {
      const srcX = isRightOrigin ? width - 1 - x : x;
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      finalRgba[dstIdx] = rawPixels[srcIdx];
      finalRgba[dstIdx + 1] = rawPixels[srcIdx + 1];
      finalRgba[dstIdx + 2] = rawPixels[srcIdx + 2];
      finalRgba[dstIdx + 3] = rawPixels[srcIdx + 3];
    }
  }

  return { width, height, rgba: finalRgba };
}

// CRC32 table for pure-JS PNG encoder fallback
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);
  return chunk;
}

export function encodeRgbaToPngSync(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4;
  const rawScanlines = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawScanlines[rowStart] = 0; // Filter type 0 (None)
    rawScanlines.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const compressed = zlibSync(rawScanlines, { level: 6 });

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8; // Bit depth 8
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makePngChunk('IHDR', ihdrData);
  const idat = makePngChunk('IDAT', compressed);
  const iend = makePngChunk('IEND', new Uint8Array(0));

  const out = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length);
  let pos = 0;
  out.set(signature, pos); pos += signature.length;
  out.set(ihdr, pos); pos += ihdr.length;
  out.set(idat, pos); pos += idat.length;
  out.set(iend, pos);
  return out;
}

export function isValidPngHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

export function getPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isValidPngHeader(bytes)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width <= 0 || height <= 0 || width > MAX_TGA_DIMENSION || height > MAX_TGA_DIMENSION) {
    return null;
  }
  return { width, height };
}

export async function convertTgaToPng(tgaBytes: Uint8Array): Promise<Uint8Array | null> {
  // Check if file is already a valid PNG (some packs name PNG files with .tga extension)
  if (isValidPngHeader(tgaBytes)) {
    return tgaBytes;
  }

  const decoded = decodeTgaToRgba(tgaBytes);
  if (!decoded) return null;

  return encodeRgbaToPngSync(decoded.width, decoded.height, decoded.rgba);
}

export async function ensureValidPngBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (isValidPngHeader(bytes)) return bytes;
  return convertTgaToPng(bytes);
}

/**
 * Ensures textures placed into Java's mipmapped `blocks` atlas (`assets/minecraft/textures/block/`)
 * have width and height divisible by 16 (2^4 for 4 mipmap levels).
 * Legacy Bedrock unused block textures (`bed_feet_*`, `bed_head_*`, `conduit_base`) are rejected (null),
 * while off-by-1/off-by-2 Bedrock block textures (e.g. `16x17` or `32x34` `end_gateway`) are cropped/padded to a 16x multiple.
 */
export function normalizeJavaBlockAtlasPng(
  targetPath: string,
  pngBytes: Uint8Array,
  decodePngSync: (data: Uint8Array) => { width: number; height: number; rgba: Uint8Array } | null
): Uint8Array | null {
  if (!/^assets\/minecraft\/textures\/(blocks?|entity\/conduit)\//.test(targetPath)) {
    return pngBytes;
  }
  const baseName = targetPath.split('/').pop() || '';
  if (/^(bed_feet_|bed_head_|conduit_base)/.test(baseName)) {
    return null;
  }
  const dims = getPngDimensions(pngBytes);
  if (!dims) return null;

  if (targetPath.startsWith('assets/minecraft/textures/entity/conduit/')) {
    if (baseName.startsWith('base')) {
      // Vanilla Java conduit/base.png is 32x16; Bedrock conduit_base.png is 24x12 (unpadded box UV) or 32x16
      if (dims.width % 16 === 0 && dims.height % 16 === 0) return pngBytes;
      const decoded = decodePngSync(pngBytes);
      if (!decoded) return null;
      const scale = Math.max(1, Math.round(decoded.height / 12));
      const targetW = 32 * scale;
      const targetH = 16 * scale;
      const outRgba = new Uint8Array(targetW * targetH * 4);
      const copyW = Math.min(decoded.width, targetW);
      const copyH = Math.min(decoded.height, targetH);
      for (let y = 0; y < copyH; y++) {
        const srcRow = y * decoded.width * 4;
        const dstRow = y * targetW * 4;
        outRgba.set(decoded.rgba.subarray(srcRow, srcRow + copyW * 4), dstRow);
      }
      return encodeRgbaToPngSync(targetW, targetH, outRgba);
    }
    if (baseName.startsWith('open_eye') || baseName.startsWith('closed_eye')) {
      // Vanilla Java conduit/open_eye.png & closed_eye.png are 8x8 on a 16x16 canvas
      if (dims.width % 16 === 0 && dims.height % 16 === 0) return pngBytes;
      const decoded = decodePngSync(pngBytes);
      if (!decoded) return null;
      const scale = Math.max(1, Math.round(decoded.width / 8));
      const targetW = 16 * scale;
      const targetH = 16 * scale;
      const outRgba = new Uint8Array(targetW * targetH * 4);
      const copyW = Math.min(decoded.width, targetW);
      const copyH = Math.min(decoded.height, targetH);
      for (let y = 0; y < copyH; y++) {
        const srcRow = y * decoded.width * 4;
        const dstRow = y * targetW * 4;
        outRgba.set(decoded.rgba.subarray(srcRow, srcRow + copyW * 4), dstRow);
      }
      return encodeRgbaToPngSync(targetW, targetH, outRgba);
    }
  }

  if (dims.width % 16 === 0 && dims.height % 16 === 0) {
    return pngBytes;
  }

  const decoded = decodePngSync(pngBytes);
  if (!decoded) return null;

  const targetW = Math.max(16, Math.round(decoded.width / 16) * 16);
  const targetH = Math.max(16, Math.round(decoded.height / 16) * 16);
  const outRgba = new Uint8Array(targetW * targetH * 4);

  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(y, decoded.height - 1);
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(x, decoded.width - 1);
      const srcIdx = (srcY * decoded.width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;
      outRgba[dstIdx] = decoded.rgba[srcIdx];
      outRgba[dstIdx + 1] = decoded.rgba[srcIdx + 1];
      outRgba[dstIdx + 2] = decoded.rgba[srcIdx + 2];
      outRgba[dstIdx + 3] = decoded.rgba[srcIdx + 3];
    }
  }

  return encodeRgbaToPngSync(targetW, targetH, outRgba);
}

