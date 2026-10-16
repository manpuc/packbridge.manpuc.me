import type { PackReport, ConversionOptions } from './types';

/**
 * Executes pack conversion inside a Web Worker.
 * If Web Worker is not supported or fails to initialize, dynamically imports
 * the main thread converter as a fallback so that heavy mappings and processors
 * are not bundled into the main thread entrypoint.
 */
export async function convertPackWithWorker(
  file: File,
  options: ConversionOptions,
  onProgress?: (processed: number, total: number) => void
): Promise<{ blob: Blob; report: PackReport }> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('./converter.worker.ts', import.meta.url), { type: 'module' });

      file.arrayBuffer().then(fileBuffer => {
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
          worker.terminate();
          reject(err);
        };

        worker.postMessage({ fileBuffer, fileName: file.name, options }, [fileBuffer]);
      }).catch(reject);
    } catch {
      // Fallback: dynamically load main-thread converter on demand
      import('./converter')
        .then(({ convertPack }) => convertPack(file, options, file.name))
        .then(resolve)
        .catch(reject);
    }
  });
}
