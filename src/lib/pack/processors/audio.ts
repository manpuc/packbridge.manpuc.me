import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;

export async function initFFmpeg(): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) return;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    const instance = new FFmpeg();
    instance.on('log', ({ message }) => {
      // console.log('[FFmpeg]', message);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpeg = instance;
  })().catch((err) => {
    ffmpegLoadingPromise = null;
    ffmpeg = null;
    throw err;
  });

  return ffmpegLoadingPromise;
}

export async function reencodeOgg(inputBuffer: Uint8Array): Promise<Uint8Array | null> {
  let inputName = '';
  let outputName = '';
  try {
    await initFFmpeg();
    if (!ffmpeg) return null;

    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    inputName = `in_${id}.ogg`;
    outputName = `out_${id}.ogg`;

    await ffmpeg.writeFile(inputName, inputBuffer);

    // Re-encode to 44100Hz stereo OGG Vorbis
    await ffmpeg.exec(['-i', inputName, '-c:a', 'libvorbis', '-ar', '44100', '-ac', '2', '-q:a', '4', outputName]);

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
