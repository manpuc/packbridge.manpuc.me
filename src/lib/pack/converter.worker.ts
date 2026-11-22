import type { ConversionOptions } from './types';
import { convertBuffer } from './convert-core';

self.onmessage = async (e: MessageEvent<{ fileBuffer: ArrayBuffer; fileName: string; options: ConversionOptions }>) => {
  const { fileBuffer, fileName, options } = e.data;

  try {
    const { buffer: outputBuffer, report } = await convertBuffer(
      fileBuffer,
      fileName,
      options,
      (processedCount, totalFiles) => {
        postMessage({ type: 'progress', processedCount, totalFiles });
      }
    );

    const bufferToTransfer = (outputBuffer.byteOffset === 0 && outputBuffer.byteLength === outputBuffer.buffer.byteLength)
      ? outputBuffer.buffer
      : outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength);

    postMessage(
      { type: 'complete', buffer: bufferToTransfer, report },
      { transfer: [bufferToTransfer] }
    );
  } catch (err) {
    postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Unknown worker error'
    });
  }
};
