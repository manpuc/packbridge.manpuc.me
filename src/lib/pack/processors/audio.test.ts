import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { convertBuffer } from '../convert-core';
import { extractFsb5 } from '../fsb';
import type { ConversionOptions } from '../types';

const mocks = vi.hoisted(() => ({
  execCalls: [] as string[][],
  nextExecCode: 0,
  nextExecThrows: false,
  nextLoadThrows: false,
  nextReadData: new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]),
  detachWriteBuffer: false,
  writeCount: 0,
  terminateCount: 0,
  loadCount: 0,
}));

vi.mock('@ffmpeg/ffmpeg', () => {
  class MockFFmpeg {
    loaded = false;
    async load() {
      mocks.loadCount++;
      if (mocks.nextLoadThrows) {
        throw new Error('mock load failed');
      }
      this.loaded = true;
    }
    async writeFile(_name: string, data: Uint8Array) {
      mocks.writeCount++;
      if (mocks.detachWriteBuffer && data.buffer.byteLength > 0) {
        structuredClone(data.buffer, { transfer: [data.buffer] });
      }
    }
    async exec(args: string[]) {
      mocks.execCalls.push(args);
      if (mocks.nextExecThrows) {
        throw new Error('WASM OOM');
      }
      return mocks.nextExecCode;
    }
    async readFile() {
      return mocks.nextReadData;
    }
    async deleteFile() {}
    terminate() {
      mocks.terminateCount++;
      this.loaded = false;
    }
  }
  return { FFmpeg: MockFFmpeg };
});

import {
  detectAudioFormat,
  inspectOggVorbisHeader,
  reencodeAudio,
  resetAudioReencodeSession,
} from './audio';

function makeOggVorbis(channels: number, sampleRate: number): Uint8Array {
  const buf = new Uint8Array(58);
  buf.set([0x4f, 0x67, 0x67, 0x53], 0); // 'OggS'
  buf[4] = 0; // version
  buf[5] = 0x02; // BOS
  buf[26] = 1; // 1 segment
  buf[27] = 30; // 30-byte Vorbis ID header
  const p = 28;
  buf[p] = 0x01;
  buf.set([0x76, 0x6f, 0x72, 0x62, 0x69, 0x73], p + 1); // 'vorbis'
  const view = new DataView(buf.buffer);
  view.setUint32(p + 7, 0, true); // vorbis_version
  buf[p + 11] = channels;
  view.setUint32(p + 12, sampleRate, true);
  return buf;
}

function makeOggOpus(): Uint8Array {
  const buf = new Uint8Array(47);
  buf.set([0x4f, 0x67, 0x67, 0x53], 0);
  buf[4] = 0;
  buf[5] = 0x02;
  buf[26] = 1;
  buf[27] = 19;
  buf.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 28); // 'OpusHead'
  return buf;
}

function makeWav(): Uint8Array {
  const buf = new Uint8Array(44);
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // 'RIFF'
  buf.set([0x57, 0x41, 0x56, 0x45], 8); // 'WAVE'
  return buf;
}

function makeMp3(): Uint8Array {
  return new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]); // 'ID3'
}

const baseOptions: ConversionOptions = {
  direction: 'bedrock-to-java',
  javaVersionId: '1.21.4',
  bedrockVersionId: '1.21.50',
  enableGuiConversion: false,
  enableModernGuiSprites: true,
  enableAudioReencode: true,
};

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

describe('audio processor & fsb5', () => {
  let revokedUrls: string[];

  beforeEach(() => {
    resetAudioReencodeSession();
    mocks.execCalls = [];
    mocks.nextExecCode = 0;
    mocks.nextExecThrows = false;
    mocks.nextLoadThrows = false;
    mocks.nextReadData = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
    mocks.detachWriteBuffer = false;
    mocks.writeCount = 0;
    mocks.terminateCount = 0;
    mocks.loadCount = 0;
    revokedUrls = [];

    const jsBytes = strToU8('/* mock ffmpeg-core.js */');
    const wasmBytes = strToU8('mock-wasm');
    const jsHash = createHash('sha256').update(jsBytes).digest('hex');
    const wasmHash = createHash('sha256').update(wasmBytes).digest('hex');

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('unpkg.com')) {
        return new Response('err', { status: 500 });
      }
      const body = url.endsWith('.js') ? jsBytes : wasmBytes;
      return new Response(toArrayBuffer(body), { status: 200 });
    }));

    vi.stubGlobal('crypto', {
      subtle: {
        digest: async (_alg: string, data: ArrayBuffer) => {
          const text = new TextDecoder().decode(data);
          if (text.includes('ffmpeg-core.js')) {
            return Uint8Array.from(Buffer.from(jsHash, 'hex')).buffer;
          }
          if (text === 'mock-wasm') {
            return Uint8Array.from(Buffer.from(wasmHash, 'hex')).buffer;
          }
          // Return real sha256 for integrity mismatch test
          return new Uint8Array(createHash('sha256').update(new Uint8Array(data)).digest()).buffer;
        },
      },
    });

    // Override fetch to return real matching hashes for unpkg/jsdelivr
    (globalThis.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('unpkg.com')) {
        return new Response('err', { status: 500 });
      }
      const body = url.endsWith('.js') ? jsBytes : wasmBytes;
      return new Response(toArrayBuffer(body), { status: 200 });
    });

    // Align expected hashes in crypto.subtle.digest with FFMPEG_CORE_SHA256
    vi.stubGlobal('crypto', {
      subtle: {
        digest: async (_alg: string, data: ArrayBuffer) => {
          const u8 = new Uint8Array(data);
          if (u8.byteLength === jsBytes.byteLength && u8[0] === jsBytes[0]) {
            return Uint8Array.from(Buffer.from('67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3', 'hex')).buffer;
          }
          if (u8.byteLength === wasmBytes.byteLength && u8[0] === wasmBytes[0]) {
            return Uint8Array.from(Buffer.from('9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7', 'hex')).buffer;
          }
          return new Uint8Array(createHash('sha256').update(u8).digest()).buffer;
        },
      },
    });

    let urlCounter = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mock-${++urlCounter}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u: string) => {
      revokedUrls.push(u);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('inspects Ogg Vorbis headers and passes through 44.1kHz mono/stereo without loading FFmpeg', async () => {
    const mono44 = makeOggVorbis(1, 44100);
    const stereo44 = makeOggVorbis(2, 44100);
    expect(inspectOggVorbisHeader(mono44)).toEqual({ channels: 1, sampleRate: 44100 });
    expect(inspectOggVorbisHeader(stereo44)).toEqual({ channels: 2, sampleRate: 44100 });
    expect(inspectOggVorbisHeader(makeOggOpus())).toBeNull();

    const r1 = await reencodeAudio(mono44);
    const r2 = await reencodeAudio(stereo44);
    const r0 = await reencodeAudio(new Uint8Array(0));
    const rTxt = await reencodeAudio(strToU8('not-audio'));

    expect(r1.status).toBe('passthrough');
    expect(r2.status).toBe('passthrough');
    expect(r0.status).toBe('passthrough');
    expect(rTxt.status).toBe('passthrough');
    expect(mocks.loadCount).toBe(0);
    expect(mocks.execCalls).toHaveLength(0);
  });

  it('preserves mono/stereo channels, strips video (-vn), downmixes >2ch, and revokes Blob URLs', async () => {
    const mono48 = makeOggVorbis(1, 48000);
    const resMono = await reencodeAudio(mono48);
    expect(resMono.status).toBe('reencoded');
    expect(mocks.execCalls[0]).toContain('-vn');
    expect(mocks.execCalls[0]).not.toContain('-ac');
    expect(revokedUrls).toEqual(['blob:mock-1', 'blob:mock-2']);

    const ch6 = makeOggVorbis(6, 44100);
    const res6 = await reencodeAudio(ch6);
    expect(res6.status).toBe('reencoded');
    expect(mocks.execCalls[1]).toContain('-ac');
    expect(mocks.execCalls[1]).toContain('2');

    const opus = makeOggOpus();
    const resOpus = await reencodeAudio(opus);
    expect(resOpus.status).toBe('reencoded');
    expect(mocks.execCalls[2]).not.toContain('-ac');

    expect(detectAudioFormat(makeWav())).toBe('wav');
    expect(detectAudioFormat(makeMp3())).toBe('mp3');
  });

  it('does not detach inputBuffer on failure and recovers/caps WASM crashes', async () => {
    mocks.detachWriteBuffer = true;
    mocks.nextExecCode = 1;
    const wav = makeWav();
    const res = await reencodeAudio(wav);
    expect(res.status).toBe('failed');
    expect(wav.byteLength).toBe(44); // Original buffer intact

    // WASM crash triggers terminate() and allows next file to reload up to MAX_FFMPEG_CRASHES
    mocks.nextExecCode = 0;
    mocks.nextExecThrows = true;
    const crash1 = await reencodeAudio(makeWav());
    expect(crash1.status).toBe('failed');
    expect(mocks.terminateCount).toBeGreaterThanOrEqual(1);

    const crash2 = await reencodeAudio(makeWav());
    expect(crash2.status).toBe('failed');

    // 3rd attempt hits crash limit without calling load() again
    const loadsBefore = mocks.loadCount;
    const crash3 = await reencodeAudio(makeWav());
    expect(crash3.status).toBe('failed');
    expect(mocks.loadCount).toBe(loadsBefore);
  });

  it('rejects tampered CDN payload via SHA-256 and revokes sibling Blob URL', async () => {
    (globalThis.fetch as any).mockImplementation(async (url: string) => {
      const body = url.endsWith('.js') ? strToU8('/* mock ffmpeg-core.js */') : strToU8('TAMPERED');
      return new Response(toArrayBuffer(body), { status: 200 });
    });

    const res = await reencodeAudio(makeWav());
    expect(res.status).toBe('failed');
    expect(revokedUrls).toEqual(['blob:mock-1']);
  });

  it('integrates with convertBuffer: converts .wav/.mp3 to .ogg, skips duplicate .ogg, and surfaces failure warning', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'Audio', description: 'A', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    const outRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/custom/hit.wav': makeWav(),
        'sounds/custom/bgm.mp3': makeMp3(),
        'sounds/custom/dup.ogg': makeOggVorbis(1, 44100),
        'sounds/custom/dup.wav': makeWav(),
      })),
      'audio.mcpack',
      baseOptions
    );
    const outZip = unzipSync(outRes.buffer);
    expect(outZip['assets/minecraft/sounds/custom/hit.ogg']).toBeDefined();
    expect(outZip['assets/minecraft/sounds/custom/hit.wav']).toBeUndefined();
    expect(outZip['assets/minecraft/sounds/custom/bgm.ogg']).toBeDefined();
    expect(outZip['assets/minecraft/sounds/custom/dup.ogg']).toBeDefined();
    expect(outRes.report.details.some(d => d.reason === 'OGG equivalent already present')).toBe(true);

    // Failure fallback surfaces warning: true
    mocks.nextExecCode = 1;
    const failRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/custom/fail.wav': makeWav(),
      })),
      'audio-fail.mcpack',
      baseOptions
    );
    expect(failRes.report.details.some(d => d.status === 'converted' && d.warning === true && d.reason === 'Audio re-encode failed, using original')).toBe(true);
  });

  it('extractFsb5 safely rejects truncated headers and respects unaligned dataStart', async () => {
    expect(await extractFsb5(new Uint8Array(8))).toBeNull();
    expect(await extractFsb5(new Uint8Array(27))).toBeNull();
    expect(await extractFsb5(new Uint8Array(59))).toBeNull();

    // Build valid 60-byte FSB5 header with mode=4, shdrSize=1, nameSize=0 -> dataStart=61 (unaligned)
    const fsb = new Uint8Array(70);
    const view = new DataView(fsb.buffer);
    view.setUint32(0, 0x35425346, true); // 'FSB5'
    view.setUint32(12, 1, true); // shdrSize = 1 -> dataStart = 61
    view.setUint32(16, 0, true);
    view.setUint32(24, 4, true); // mode = 4
    // Place decoy 'OggS' at offset 60 (inside shdr, before dataStart=61)
    fsb.set([0x4f, 0x67, 0x67, 0x53], 60);
    // Place real 'OggS' at exact end of buffer (offset 66..69)
    fsb.set([0x4f, 0x67, 0x67, 0x53], 66);

    const extracted = await extractFsb5(fsb);
    expect(extracted).not.toBeNull();
    expect(extracted!.byteLength).toBe(4);
  });
});
