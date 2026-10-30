/**
 * Converts Truevision TGA (TARGA) images (uncompressed & RLE, 24/32-bit true-color, 8-bit grayscale)
 * into PNG binary data using OffscreenCanvas or standard zlib/PNG encoding fallback.
 */

import { deflateSync } from 'fflate';

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

  // Supported types: 2 (Uncompressed True-Color), 3 (Uncompressed Grayscale),
  // 10 (RLE True-Color), 11 (RLE Grayscale)
  if (colorMapType !== 0 || ![2, 3, 10, 11].includes(imageType)) {
    return null;
  }

  const width = data[12] | (data[13] << 8);
  const height = data[14] | (data[15] << 8);
  const pixelDepth = data[16];
  const descriptor = data[17];

  if (width <= 0 || height <= 0 || width > MAX_TGA_DIMENSION || height > MAX_TGA_DIMENSION) {
    return null;
  }

  const bytesPerPixel = pixelDepth >> 3;
  if (![1, 3, 4].includes(bytesPerPixel)) {
    return null;
  }

  const isTopOrigin = (descriptor & 0x20) !== 0;
  const isRightOrigin = (descriptor & 0x10) !== 0;

  let offset = 18 + idLength;
  if (offset >= data.length) return null;

  const totalPixels = width * height;
  const rawPixels = new Uint8Array(totalPixels * 4);
  const isRle = imageType === 10 || imageType === 11;

  let pixelIndex = 0;

  const readPixelInto = (srcOffset: number, dstPixelIdx: number) => {
    const dst = dstPixelIdx * 4;
    if (bytesPerPixel === 4) {
      rawPixels[dst] = data[srcOffset + 2];     // R
      rawPixels[dst + 1] = data[srcOffset + 1]; // G
      rawPixels[dst + 2] = data[srcOffset];     // B
      rawPixels[dst + 3] = data[srcOffset + 3]; // A
    } else if (bytesPerPixel === 3) {
      rawPixels[dst] = data[srcOffset + 2];     // R
      rawPixels[dst + 1] = data[srcOffset + 1]; // G
      rawPixels[dst + 2] = data[srcOffset];     // B
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

  const compressed = deflateSync(rawScanlines, { level: 6 });

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

export async function convertTgaToPng(tgaBytes: Uint8Array): Promise<Uint8Array | null> {
  // Check if file is already a valid PNG (some packs name PNG files with .tga extension)
  if (
    tgaBytes.length > 8 &&
    tgaBytes[0] === 0x89 &&
    tgaBytes[1] === 0x50 &&
    tgaBytes[2] === 0x4e &&
    tgaBytes[3] === 0x47
  ) {
    return tgaBytes;
  }

  const decoded = decodeTgaToRgba(tgaBytes);
  if (!decoded) return null;

  return encodeRgbaToPngSync(decoded.width, decoded.height, decoded.rgba);
}

