import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;

export async function initFFmpeg(): Promise<void> {
  if (ffmpeg && ffmpeg.loaded) return;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      // console.log('[FFmpeg]', message);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  })();

  return ffmpegLoadingPromise;
}

export async function reencodeOgg(inputBuffer: Uint8Array): Promise<Uint8Array | null> {
  try {
    await initFFmpeg();
    if (!ffmpeg) return null;

    const inputName = 'input.ogg';
    const outputName = 'output.ogg';

    await ffmpeg.writeFile(inputName, inputBuffer);
    
    // Re-encode to 44100Hz stereo OGG Vorbis
    await ffmpeg.exec(['-i', inputName, '-c:a', 'libvorbis', '-ar', '44100', '-ac', '2', '-q:a', '4', outputName]);

    const data = await ffmpeg.readFile(outputName);
    
    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return new Uint8Array(data as Uint8Array);
  } catch (error) {
    console.error('Audio re-encoding failed:', error);
    return null;
  }
}
