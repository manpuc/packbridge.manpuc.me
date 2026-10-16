/**
 * Security, sanitization, and DoS protection utilities for resource pack processing
 */

export const MAX_SAFE_FILE_COUNT = 25000;
export const MAX_SAFE_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB safe limit
export const MAX_SAFE_COMPRESSION_RATIO = 100; // e.g. 10MB compressing to <100KB is suspicious
export const LARGE_FILE_WARN_THRESHOLD_BYTES = 350 * 1024 * 1024; // 350 MB threshold to alert user
export const MAX_INPUT_FILE_SIZE_BYTES = LARGE_FILE_WARN_THRESHOLD_BYTES;

/**
 * Validates that a relative path within a zip archive is safe and does not attempt
 * directory traversal (Zip Slip vulnerability).
 */
export function isSafePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (path.includes('\0')) return false;

  // Normalize backslashes to forward slashes
  const normalized = path.replace(/\\/g, '/');

  // Disallow absolute paths (leading slash) and Windows drive letters (e.g. C:)
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return false;
  }

  // Check each path segment for directory traversal attempts
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a path represents a macOS/system metadata file or hidden dotfile
 */
export function isSystemHiddenFile(path: string): boolean {
  return path.includes('__MACOSX') || (path.split('/').pop()?.startsWith('.') ?? false);
}

export interface ZipSafetyTracker {
  totalUncompressedBytes: number;
  fileCount: number;
}

/**
 * Creates an extraction filter for fflate.unzipSync that skips unwanted files
 * without decompressing them and enforces limits against Zip Bombs / memory exhaustion.
 */
export function createZipSafetyFilter(tracker: ZipSafetyTracker) {
  return (file: { name: string; size?: number; originalSize?: number }) => {
    // Skip directories and system hidden files before decompression
    if (file.name.endsWith('/') || isSystemHiddenFile(file.name)) {
      return false;
    }

    // Skip unsafe paths
    if (!isSafePath(file.name)) {
      return false;
    }

    tracker.fileCount++;
    if (tracker.fileCount > MAX_SAFE_FILE_COUNT) {
      throw new Error(`Archive contains too many files (exceeds limit of ${MAX_SAFE_FILE_COUNT.toLocaleString()} files)`);
    }

    const uncompressed = file.originalSize ?? file.size ?? 0;
    tracker.totalUncompressedBytes += uncompressed;

    if (tracker.totalUncompressedBytes > MAX_SAFE_UNCOMPRESSED_BYTES) {
      throw new Error(`Archive exceeds maximum uncompressed size limit (${(MAX_SAFE_UNCOMPRESSED_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB)`);
    }

    // Protect against classic zip bombs with astronomical compression ratios
    const compressed = file.size ?? 0;
    if (compressed > 0 && uncompressed > 10 * 1024 * 1024 && uncompressed / compressed > MAX_SAFE_COMPRESSION_RATIO) {
      throw new Error(`Suspicious compression ratio detected in ${file.name} (possible Zip Bomb)`);
    }

    return true;
  };
}
