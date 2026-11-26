import { FFmpeg } from '@ffmpeg/ffmpeg';

const FFMPEG_CORE_VERSION = '0.12.10';
const FFMPEG_CDN_BASES = [
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
] as const;

const FFMPEG_CORE_SHA256 = {
  'ffmpeg-core.js': '67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3',
  'ffmpeg-core.wasm': '9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7',
} as const;

const FFMPEG_FETCH_TIMEOUT_MS = 30_000;
const FFMPEG_LOAD_TIMEOUT_MS = 30_000;
const FFMPEG_EXEC_TIMEOUT_MS = 30_000;
const MAX_FFMPEG_INIT_ATTEMPTS = 2;
const MAX_FFMPEG_CRASHES = 2;

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;
let ffmpegInitAttempts = 0;
let ffmpegCrashCount = 0;
let loggedLimitWarning = false;

export type AudioFormat = 'ogg' | 'wav' | 'mp3' | 'flac';

export type AudioReencodeResult =
  | { status: 'reencoded'; data: Uint8Array }
  | { status: 'passthrough' }
  | { status: 'failed' };

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(resolve, reject);
  }).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchVerifiedBlobURL(
  fileName: keyof typeof FFMPEG_CORE_SHA256,
  mimeType: string
): Promise<string> {
  let lastError: unknown;
  for (const base of FFMPEG_CDN_BASES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FFMPEG_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/${fileName}`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${fileName}`);
      }
      const buf = await res.arrayBuffer();
      // shortcut: SHA-256 verification runs when WebCrypto subtle is available (secure contexts).
      if (globalThis.crypto?.subtle) {
        const hash = await sha256Hex(buf);
        if (hash !== FFMPEG_CORE_SHA256[fileName]) {
          throw new Error(`FFmpeg integrity check failed for ${fileName}`);
        }
      }
      return URL.createObjectURL(new Blob([buf], { type: mimeType }));
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${fileName}`);
}

function resetFFmpegInstance(): void {
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch {}
  }
  ffmpeg = null;
  ffmpegLoadingPromise = null;
}

export function resetAudioReencodeSession(): void {
  ffmpegInitAttempts = 0;
  ffmpegCrashCount = 0;
  loggedLimitWarning = false;
}

export function hasOggCapturePattern(buf: Uint8Array): boolean {
  return (
    buf.byteLength >= 4 &&
    buf[0] === 0x4f && // 'O'
    buf[1] === 0x67 && // 'g'
    buf[2] === 0x67 && // 'g'
    buf[3] === 0x53    // 'S'
  );
}

export function detectAudioFormat(buf: Uint8Array): AudioFormat | null {
  if (!buf || buf.byteLength < 4) return null;
  if (hasOggCapturePattern(buf)) return 'ogg';
  if (
    buf.byteLength >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // 'RIFF'
    buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45   // 'WAVE'
  ) {
    return 'wav';
  }
  if (
    (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || // 'ID3'
    (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)              // MPEG frame sync
  ) {
    return 'mp3';
  }
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) { // 'fLaC'
    return 'flac';
  }
  return null;
}

export function inspectOggVorbisHeader(buf: Uint8Array): { channels: number; sampleRate: number } | null {
  if (buf.byteLength < 28 || !hasOggCapturePattern(buf)) return null;
  if (buf[4] !== 0) return null; // Ogg stream_structure_version must be 0
  if ((buf[5] & 0x02) === 0 || (buf[5] & 0x01) !== 0) return null; // Must be BOS and not continued

  const pageSegments = buf[26];
  if (pageSegments < 1 || buf.byteLength < 27 + pageSegments) return null;

  let bodyLen = 0;
  for (let i = 0; i < pageSegments; i++) {
    bodyLen += buf[27 + i];
  }
  const p = 27 + pageSegments;
  if (p + bodyLen > buf.byteLength || buf[27] !== 30 || p + 30 > buf.byteLength) return null;

  if (
    buf[p] !== 0x01 ||
    buf[p + 1] !== 0x76 || // 'v'
    buf[p + 2] !== 0x6f || // 'o'
    buf[p + 3] !== 0x72 || // 'r'
    buf[p + 4] !== 0x62 || // 'b'
    buf[p + 5] !== 0x69 || // 'i'
    buf[p + 6] !== 0x73    // 's'
  ) {
    return null;
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const vorbisVersion = view.getUint32(p + 7, true);
  if (vorbisVersion !== 0) return null;

  const channels = buf[p + 11];
  const sampleRate = view.getUint32(p + 12, true);
  if (channels < 1 || sampleRate < 1) return null;

  return { channels, sampleRate };
}

export async function initFFmpeg(): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) return;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;
  if (ffmpegInitAttempts >= MAX_FFMPEG_INIT_ATTEMPTS || ffmpegCrashCount >= MAX_FFMPEG_CRASHES) {
    throw new Error('FFmpeg initialization retry limit reached');
  }

  ffmpegInitAttempts++;
  const instance = new FFmpeg();

  ffmpegLoadingPromise = (async () => {
    const [coreRes, wasmRes] = await Promise.allSettled([
      fetchVerifiedBlobURL('ffmpeg-core.js', 'text/javascript'),
      fetchVerifiedBlobURL('ffmpeg-core.wasm', 'application/wasm'),
    ]);

    const coreURL = coreRes.status === 'fulfilled' ? coreRes.value : null;
    const wasmURL = wasmRes.status === 'fulfilled' ? wasmRes.value : null;

    try {
      if (coreRes.status === 'rejected') throw coreRes.reason;
      if (wasmRes.status === 'rejected') throw wasmRes.reason;
      await withTimeout(
        instance.load({ coreURL: coreURL!, wasmURL: wasmURL! }),
        FFMPEG_LOAD_TIMEOUT_MS,
        'FFmpeg load timed out'
      );
    } finally {
      if (coreURL) URL.revokeObjectURL(coreURL);
      if (wasmURL) URL.revokeObjectURL(wasmURL);
    }

    ffmpeg = instance;
    ffmpegInitAttempts = 0;
  })().catch((err) => {
    try {
      instance.terminate();
    } catch {}
    ffmpegLoadingPromise = null;
    ffmpeg = null;
    throw err;
  });

  return ffmpegLoadingPromise;
}

export async function reencodeAudio(
  inputBuffer: Uint8Array,
  options?: { inputExt?: string; forceReencode?: boolean }
): Promise<AudioReencodeResult> {
  if (!inputBuffer || inputBuffer.byteLength < 4) {
    return { status: 'passthrough' };
  }

  const detected = detectAudioFormat(inputBuffer);
  if (!detected) {
    return { status: 'passthrough' };
  }

  const vorbis = detected === 'ogg' ? inspectOggVorbisHeader(inputBuffer) : null;
  if (
    detected === 'ogg' &&
    !options?.forceReencode &&
    vorbis &&
    vorbis.sampleRate === 44100 &&
    vorbis.channels >= 1 &&
    vorbis.channels <= 2
  ) {
    return { status: 'passthrough' };
  }

  const downmixArgs = vorbis && vorbis.channels > 2 ? ['-ac', '2'] : [];
  let inputName = '';
  let outputName = '';
  let loadedBeforeExec = false;

  try {
    await initFFmpeg();
    if (!ffmpeg) return { status: 'failed' };
    loadedBeforeExec = true;

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inputName = `in_${id}.${detected}`;
    outputName = `out_${id}.ogg`;

    // Pass a copy because ffmpeg.writeFile transfers inputBuffer.buffer to its worker
    await ffmpeg.writeFile(inputName, new Uint8Array(inputBuffer));

    // Re-encode to 44100Hz OGG Vorbis, preserving mono/stereo channels and stripping video streams
    const args = ['-i', inputName, '-vn', '-c:a', 'libvorbis', '-ar', '44100', ...downmixArgs, '-q:a', '4', outputName];
    const exitCode = await withTimeout(
      ffmpeg.exec(args, FFMPEG_EXEC_TIMEOUT_MS),
      FFMPEG_EXEC_TIMEOUT_MS + 5_000,
      'FFmpeg execution timed out'
    );
    if (exitCode !== 0) {
      return { status: 'failed' };
    }

    const data = await ffmpeg.readFile(outputName);
    if (!(data instanceof Uint8Array) || data.byteLength < 4 || !hasOggCapturePattern(data)) {
      return { status: 'failed' };
    }
    return { status: 'reencoded', data: new Uint8Array(data) };
  } catch (error) {
    if (loadedBeforeExec) {
      ffmpegCrashCount++;
      resetFFmpegInstance();
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'FFmpeg initialization retry limit reached') {
      if (!loggedLimitWarning) {
        loggedLimitWarning = true;
        console.error('Audio re-encoding disabled after repeated failures:', error);
      }
    } else {
      console.error('Audio re-encoding failed:', error);
    }
    return { status: 'failed' };
  } finally {
    if (ffmpeg && ffmpeg.loaded && inputName) {
      try { await ffmpeg.deleteFile(inputName); } catch {}
    }
    if (ffmpeg && ffmpeg.loaded && outputName) {
      try { await ffmpeg.deleteFile(outputName); } catch {}
    }
  }
}
