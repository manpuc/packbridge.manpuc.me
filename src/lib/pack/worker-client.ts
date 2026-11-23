import type { PackReport, ConversionOptions } from './types';

/**
 * Executes pack conversion inside a Web Worker.
 */
export async function convertPackWithWorker(
  file: File,
  options: ConversionOptions,
  onProgress?: (processed: number, total: number) => void,
  preloadedBuffer?: ArrayBuffer | null
): Promise<{ blob: Blob; report: PackReport }> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./converter.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const bufferPromise = preloadedBuffer ? Promise.resolve(preloadedBuffer) : file.arrayBuffer();
    bufferPromise.then(fileBuffer => {
      worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'progress') {
          if (onProgress) onProgress(data.processedCount, data.totalFiles);
        } else if (data.type === 'complete') {
          const blob = new Blob([data.buffer], { type: 'application/zip' });
          worker.terminate();
          resolve({ blob, report: data.report });
        } else if (data.type === 'error') {
          worker.terminate();
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        err.preventDefault?.();
        worker.terminate();
        reject(new Error(err.message || 'Worker failed to load'));
      };

      worker.postMessage({ fileBuffer, fileName: file.name, options }, [fileBuffer]);
    }).catch(err => {
      worker.terminate();
      reject(err);
    });
  });
}
