import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;
const MAX_FFMPEG_INIT_ATTEMPTS = 2;
let ffmpegInitAttempts = 0;

export async function initFFmpeg(): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) return;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;
  if (ffmpegInitAttempts >= MAX_FFMPEG_INIT_ATTEMPTS) {
    throw new Error('FFmpeg initialization retry limit reached');
  }

  ffmpegInitAttempts++;
  const instance = new FFmpeg();

  ffmpegLoadingPromise = (async () => {
    instance.on('log', ({ message }) => {
      // console.log('[FFmpeg]', message);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
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

function hasOggCapturePattern(buf: Uint8Array): boolean {
  return (
    buf.byteLength >= 4 &&
    buf[0] === 0x4f && // 'O'
    buf[1] === 0x67 && // 'g'
    buf[2] === 0x67 && // 'g'
    buf[3] === 0x53    // 'S'
  );
}

export async function reencodeOgg(inputBuffer: Uint8Array): Promise<Uint8Array | null> {
  if (!inputBuffer || !hasOggCapturePattern(inputBuffer)) {
    return null;
  }

  let inputName = '';
  let outputName = '';
  try {
    await initFFmpeg();
    if (!ffmpeg) return null;

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inputName = `in_${id}.ogg`;
    outputName = `out_${id}.ogg`;

    // Pass a copy because ffmpeg.writeFile transfers inputBuffer.buffer to its worker
    await ffmpeg.writeFile(inputName, new Uint8Array(inputBuffer));

    // Re-encode to 44100Hz stereo OGG Vorbis
    const exitCode = await ffmpeg.exec(['-i', inputName, '-c:a', 'libvorbis', '-ar', '44100', '-ac', '2', '-q:a', '4', outputName]);
    if (exitCode !== 0) {
      return null;
    }

    const data = await ffmpeg.readFile(outputName);
    return new Uint8Array(data as Uint8Array);
  } catch (error) {
    console.error('Audio re-encoding failed:', error);
    return null;
  } finally {
    if (ffmpeg && inputName) {
      try { await ffmpeg.deleteFile(inputName); } catch {}
    }
    if (ffmpeg && outputName) {
      try { await ffmpeg.deleteFile(outputName); } catch {}
    }
  }
}
