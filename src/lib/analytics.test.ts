import { describe, expect, it } from 'vitest';
import { sanitizeErrorMessage } from './analytics';

describe('sanitizeErrorMessage', () => {
  it('masks exact sensitiveFileName, quoted filenames with spaces, Unicode paths, and Unicode filenames', () => {
    expect(
      sanitizeErrorMessage(
        new Error('Failed to parse My Custom Pack (v2).zip: corrupt header'),
        'My Custom Pack (v2).zip'
      )
    ).toBe('Failed to parse [file]: corrupt header');

    expect(
      sanitizeErrorMessage(new Error('Could not read "My Secret Pack.mcpack" in worker'))
    ).toBe('Could not read "[file]" in worker');

    expect(
      sanitizeErrorMessage(new Error('Failed at 日本語フォルダ/石.png and 秘密パック.zip'))
    ).toBe('Failed at [path] and [file]');
  });

  it('masks URLs, emails, POSIX paths, and Windows paths with or without quotes', () => {
    expect(
      sanitizeErrorMessage(
        new Error(
          'Error from https://example.com/a.wasm by user@example.com at "C:\\Users\\Alice Smith\\pack.zip" and C:\\Temp\\foo.png and /Users/alice/pack.mcpack'
        )
      )
    ).toBe('Error from [url] by [email] at "[path]" and [path] and [path]');
  });

  it('strips multiline stack traces, limits length to 200 chars, and preserves technical identifiers', () => {
    const err = new RangeError('offset is out of bounds in 1.21.4 via URL.createObjectURL\n    at Worker.onmessage (/Users/dev/worker.js:10:5)');
    const out = sanitizeErrorMessage(err);
    expect(out).toBe('RangeError: offset is out of bounds in 1.21.4 via URL.createObjectURL');
    expect(out).not.toContain('onmessage');

    const longMsg = `Error: ${'x'.repeat(260)}`;
    expect(sanitizeErrorMessage(longMsg).length).toBe(200);
  });
});
