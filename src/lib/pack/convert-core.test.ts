import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { convertBuffer } from './convert-core';
import { convertPackWithWorker } from './worker-client';
import { encodeRgbaToPngSync, encodeRgbaToTgaSync, decodeTgaToRgba, convertTgaToPng, getPngDimensions } from './processors/tga';
import { decodePngToRgbaSync, convertBedrockMerToLabPbrSpec } from './processors/pbr';
import { processGuiSpriteSheet, BUTTON_WIDGET_METADATA } from './processors/gui';
import { zlibSync } from 'fflate';
import { extractPackFormat, extractMinPackFormat, detectEditionAutoSwitch, getBedrockVersionByEngineVersion } from './versions';
import { analyzeReportSafety, categorizeError } from '../analytics';
import { createZipSafetyFilter } from './security';
import type { ConversionOptions } from './types';

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const baseOptions: Omit<ConversionOptions, 'direction'> = {
  javaVersionId: '1.21.4',
  bedrockVersionId: '1.21.50',
  enableGuiConversion: true,
  enableAudioReencode: false,
  enableModelConversion: true,
  enablePbrConversion: true,
};

describe('convertBuffer', () => {
  it('converts a minimal Java pack to Bedrock with manifest, terrain_texture, texture, and lang', async () => {
    const stonePng = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4));
    const inputZip = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Test Java Pack' } })),
      'assets/minecraft/textures/block/stone.png': stonePng,
      'assets/minecraft/lang/en_us.json': strToU8(JSON.stringify({ 'block.minecraft.stone': 'Stone' })),
    });

    const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'test-java.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
    });

    expect(report.errorCount).toBe(0);
    const out = unzipSync(buffer);
    expect(out['manifest.json']).toBeDefined();
    expect(out['textures/terrain_texture.json']).toBeDefined();
    expect(out['textures/blocks/stone.png']).toBeDefined();
    expect(out['texts/en_US.lang']).toBeDefined();
    expect(strFromU8(out['texts/en_US.lang'])).toContain('Stone');
    expect(JSON.parse(strFromU8(out['texts/languages.json']))).toContain('en_US');
  });

  it('converts a minimal Bedrock pack to Java with pack.mcmeta and block texture', async () => {
    const stonePng = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4));
    const inputZip = zipSync({
      'manifest.json': strToU8(
        JSON.stringify({
          format_version: 2,
          header: {
            name: 'Test Bedrock Pack',
            description: 'Test',
            uuid: '11111111-1111-4111-8111-111111111111',
            version: [1, 0, 0],
            min_engine_version: [1, 21, 50],
          },
          modules: [
            {
              type: 'resources',
              uuid: '22222222-2222-4222-8222-222222222222',
              version: [1, 0, 0],
            },
          ],
        })
      ),
      'textures/blocks/stone.png': stonePng,
    });

    const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'test-bedrock.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
    });

    expect(report.errorCount).toBe(0);
    const out = unzipSync(buffer);
    expect(out['pack.mcmeta']).toBeDefined();
    expect(out['assets/minecraft/textures/block/stone.png']).toBeDefined();
  });

  it('extracts max/supported pack formats and strips stale supported_formats on java-to-java', async () => {
    expect(extractPackFormat({ pack_format: 15 })).toBe(15);
    expect(extractPackFormat({ pack_format: 15, supported_formats: [15, 46] })).toBe(46);
    expect(extractPackFormat({ pack_format: 15, min_format: 69, max_format: [97, 1] })).toBe(97);

    const inputZip = zipSync({
      'pack.mcmeta': strToU8(
        JSON.stringify({ pack: { pack_format: 18, supported_formats: [18, 34], description: 'Multi' } })
      ),
      'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
    });

    const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'upgrade.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '26.3.0',
    });

    expect(report.errorCount).toBe(0);
    const out = unzipSync(buffer);
    const mcmeta = JSON.parse(strFromU8(out['pack.mcmeta']));
    expect(mcmeta.pack.pack_format).toBe(97);
    expect(mcmeta.pack.supported_formats).toBeUndefined();
    expect(mcmeta.pack.min_format).toBe(97);
    expect(mcmeta.pack.max_format).toEqual([97, 1]);
  });

  it('maps redstone, piglin, bed, and bedrock flipbook atlas_tile names accurately without collisions', async () => {
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4));
    const bedrockInput = zipSync({
      'manifest.json': strToU8(JSON.stringify({
        format_version: 2,
        header: { name: 'B', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 26, 60] },
        modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
      })),
      'textures/items/redstone_dust.png': png16,
    });
    const b2j = await convertBuffer(toArrayBuffer(bedrockInput), 'b2j.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '26.3.0',
      bedrockVersionId: '1.26.60',
    });
    expect(b2j.report.errorCount).toBe(0);
    const jOut = unzipSync(b2j.buffer);
    expect(jOut['assets/minecraft/textures/item/redstone.png']).toBeDefined();
    expect(jOut['assets/minecraft/textures/item/empty_slot_redstone_dust.png']).toBeUndefined();

    const javaInput = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 97, description: 'J' } })),
      'assets/minecraft/textures/entity/piglin/piglin.png': png16,
      'assets/minecraft/textures/entity/bed/red.png': png16,
      'assets/minecraft/textures/block/lava_still.png': png16,
      'assets/minecraft/textures/block/lava_still.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 2 } })),
      'assets/minecraft/textures/block/crimson_stem.png': png16,
      'assets/minecraft/textures/block/crimson_stem.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 4 } })),
    });
    const j2b = await convertBuffer(toArrayBuffer(javaInput), 'j2b.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      javaVersionId: '26.3.0',
      bedrockVersionId: '1.26.60',
    });
    expect(j2b.report.errorCount).toBe(0);
    const bOut = unzipSync(j2b.buffer);
    expect(bOut['textures/entity/piglin/piglin.png']).toBeDefined();
    expect(bOut['textures/entity/bed/red.png']).toBeDefined();
    const flipbooks = JSON.parse(strFromU8(bOut['textures/flipbook_textures.json']));
    expect(flipbooks.find((f: any) => f.flipbook_texture === 'textures/blocks/lava_still')?.atlas_tile).toBe('still_lava');
    expect(flipbooks.find((f: any) => f.flipbook_texture === 'textures/blocks/huge_fungus/crimson_log_side')?.atlas_tile).toBe('crimson_log_side');
    const terrain = JSON.parse(strFromU8(bOut['textures/terrain_texture.json']));
    expect(terrain.texture_data['still_lava']).toBeDefined();
    expect(terrain.texture_data['crimson_log_side']).toBeDefined();
  });

  it('detects edition auto-switch, classifies analytics safely, and separates safety errors from corrupt zips', async () => {
    // 1. Edition auto-switch
    expect(detectEditionAutoSwitch('java-to-bedrock', false, true, 'pack.zip')).toBe('bedrock-to-java');
    expect(detectEditionAutoSwitch('java-to-bedrock', false, false, 'pack.mcpack')).toBe('bedrock-to-java');
    expect(detectEditionAutoSwitch('bedrock-to-java', true, false, 'pack.zip')).toBe('java-to-bedrock');
    expect(detectEditionAutoSwitch('java-to-bedrock', true, true, 'mixed.zip')).toBeNull();
    expect(detectEditionAutoSwitch('java-to-java', false, true, 'pack.mcpack')).toBeNull();

    // 2. Analytics classification
    const safety = analyzeReportSafety({
      totalFiles: 1,
      convertedCount: 0,
      skippedCount: 1,
      errorCount: 0,
      details: [{ filename: 'assets/minecraft/textures/block/custom.png', status: 'skipped', reason: 'Unsupported or unmapped file' }],
    });
    expect(safety.skipReasonTop).toBe('NO_MAPPING');

    expect(categorizeError(new RangeError('offset is out of bounds'))).toBe('INVALID_ARCHIVE');
    expect(categorizeError(new DOMException('A requested file or directory could not be found', 'NotFoundError'))).toBe('UNKNOWN');

    // 3. Zip safety filter threshold (15MB @ 150x passes; 60MB @ 150x throws ZipSafetyError)
    const filterPass = createZipSafetyFilter({ totalUncompressedBytes: 0, fileCount: 0 });
    expect(filterPass({ name: 'tex.tga', originalSize: 15 * 1024 * 1024, size: 100 * 1024 })).toBe(true);

    const filterBlock = createZipSafetyFilter({ totalUncompressedBytes: 0, fileCount: 0 });
    let caught: unknown;
    try {
      filterBlock({ name: 'bomb.tga', originalSize: 60 * 1024 * 1024, size: 400 * 1024 });
    } catch (e) {
      caught = e;
    }
    expect((caught as { isZipSafetyError?: boolean })?.isZipSafetyError).toBe(true);

    // 4. Truncated ZIP throws Invalid or corrupted ZIP archive
    const brokenZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
    await expect(
      convertBuffer(toArrayBuffer(brokenZip), 'broken.zip', { ...baseOptions, direction: 'java-to-bedrock' })
    ).rejects.toThrow(/Invalid or corrupted ZIP archive/);

    // 5. Safety filter error passes through convertBuffer without being wrapped as corrupted ZIP
    const bombZip = zipSync({ 'bomb.tga': [new Uint8Array(52 * 1024 * 1024), { level: 1 }] });
    let bombErr: unknown;
    try {
      await convertBuffer(toArrayBuffer(bombZip), 'bomb.zip', { ...baseOptions, direction: 'java-to-bedrock' });
    } catch (e) {
      bombErr = e;
    }
    expect(bombErr).toBeInstanceOf(Error);
    expect((bombErr as Error).message).toMatch(/Suspicious compression ratio/);
    expect((bombErr as Error).message).not.toMatch(/Invalid or corrupted ZIP archive/);
  });

  it('uses preloadedBuffer when available and terminates worker on NotFoundError fallback', async () => {
    const origWorker = globalThis.Worker;
    let lastWorker: { terminated: boolean } | null = null;
    class FakeWorker {
      terminated = false;
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: ErrorEvent) => void) | null = null;
      constructor() {
        lastWorker = this;
      }
      postMessage() {
        const out = new ArrayBuffer(8);
        this.onmessage?.({
          data: {
            type: 'complete',
            buffer: out,
            report: { totalFiles: 1, convertedCount: 1, skippedCount: 0, errorCount: 0, details: [] },
          },
        } as MessageEvent);
      }
      terminate() {
        this.terminated = true;
      }
    }
    (globalThis as any).Worker = FakeWorker;

    try {
      let arrayBufferCalled = false;
      const expiredFile = {
        name: 'pack.zip',
        arrayBuffer: async () => {
          arrayBufferCalled = true;
          throw new DOMException('A requested file or directory could not be found', 'NotFoundError');
        },
      } as unknown as File;

      // Case A: preloadedBuffer provided (<=100MB path) -> skips file.arrayBuffer()
      const res = await convertPackWithWorker(
        expiredFile,
        { ...baseOptions, direction: 'java-to-bedrock' },
        undefined,
        new ArrayBuffer(16)
      );
      expect(arrayBufferCalled).toBe(false);
      expect(res.report.convertedCount).toBe(1);

      // Case B: no preloadedBuffer (>100MB fallback) -> rejects with NotFoundError and terminates worker
      await expect(
        convertPackWithWorker(expiredFile, { ...baseOptions, direction: 'java-to-bedrock' }, undefined, null)
      ).rejects.toThrow(/could not be found/);
      expect(arrayBufferCalled).toBe(true);
      expect((lastWorker as { terminated: boolean } | null)?.terminated).toBe(true);
    } finally {
      globalThis.Worker = origWorker;
    }
  });

  it('crops icons.png and widgets.png with exact Bedrock names and dimensions', async () => {
    const setPixel = (rgba: Uint8Array, width: number, x: number, y: number, r: number, g: number, b: number) => {
      const idx = (y * width + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    };
    const getPixel = (png: Uint8Array, x: number, y: number) => {
      const decoded = decodePngToRgbaSync(png)!;
      const idx = (y * decoded.width + x) * 4;
      return [decoded.rgba[idx], decoded.rgba[idx + 1], decoded.rgba[idx + 2], decoded.rgba[idx + 3]];
    };

    const iconsRgba = new Uint8Array(256 * 256 * 4);
    setPixel(iconsRgba, 256, 52, 0, 200, 10, 20);    // heart
    setPixel(iconsRgba, 256, 180, 85, 30, 140, 210); // horse_jump_empty far right (> 18px)
    setPixel(iconsRgba, 256, 180, 90, 40, 220, 90);  // horse_jump_full far right (> 18px)

    const widgetsRgba = new Uint8Array(256 * 256 * 4);
    setPixel(widgetsRgba, 256, 0, 1, 11, 22, 33);     // hotbar_start_cap
    setPixel(widgetsRgba, 256, 1, 1, 44, 55, 66);     // hotbar_0
    setPixel(widgetsRgba, 256, 161, 1, 77, 88, 99);   // hotbar_8
    setPixel(widgetsRgba, 256, 181, 1, 111, 122, 133); // hotbar_end_cap
    setPixel(widgetsRgba, 256, 2, 24, 250, 200, 50);  // selected_hotbar_slot

    const inputZip = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 15, description: 'GUI' } })),
      'assets/minecraft/textures/gui/icons.png': encodeRgbaToPngSync(256, 256, iconsRgba),
      'assets/minecraft/textures/gui/widgets.png': encodeRgbaToPngSync(256, 256, widgetsRgba),
    });

    const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'gui.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      enableGuiConversion: true,
    });

    expect(report.errorCount).toBe(0);
    const out = unzipSync(buffer);

    expect(getPngDimensions(out['textures/ui/horse_jump_empty.png'])).toEqual({ width: 182, height: 5 });
    expect(getPngDimensions(out['textures/ui/horse_jump_full.png'])).toEqual({ width: 182, height: 5 });
    expect(getPixel(out['textures/ui/horse_jump_empty.png'], 180, 1)).toEqual([30, 140, 210, 255]);
    expect(getPixel(out['textures/ui/horse_jump_full.png'], 180, 1)).toEqual([40, 220, 90, 255]);
    expect(getPixel(out['textures/ui/heart.png'], 0, 0)).toEqual([200, 10, 20, 255]);

    expect(getPngDimensions(out['textures/ui/hotbar_start_cap.png'])).toEqual({ width: 1, height: 22 });
    expect(getPngDimensions(out['textures/ui/hotbar_end_cap.png'])).toEqual({ width: 1, height: 22 });
    expect(getPixel(out['textures/ui/hotbar_start_cap.png'], 0, 1)).toEqual([11, 22, 33, 255]);
    expect(getPixel(out['textures/ui/hotbar_end_cap.png'], 0, 1)).toEqual([111, 122, 133, 255]);
    for (let i = 0; i < 9; i++) {
      expect(getPngDimensions(out[`textures/ui/hotbar_${i}.png`])).toEqual({ width: 20, height: 22 });
    }
    expect(getPixel(out['textures/ui/hotbar_0.png'], 0, 1)).toEqual([44, 55, 66, 255]);
    expect(getPixel(out['textures/ui/hotbar_8.png'], 0, 1)).toEqual([77, 88, 99, 255]);
    expect(getPngDimensions(out['textures/ui/selected_hotbar_slot.png'])).toEqual({ width: 24, height: 24 });
    expect(getPixel(out['textures/ui/selected_hotbar_slot.png'], 2, 2)).toEqual([250, 200, 50, 255]);

    expect(out['textures/ui/cross_hair.png']).toBeUndefined();
    expect(out['textures/ui/hotbar_start.png']).toBeUndefined();
    expect(out['textures/ui/hotbar_end.png']).toBeUndefined();
    expect(out['textures/ui/icons.png']).toBeUndefined();
    expect(out['textures/ui/widgets.png']).toBeUndefined();
    expect(out['textures/gui/icons.png']).toBeDefined();
    expect(out['textures/ui/freeze_heart.png']).toBeDefined();
    expect(out['textures/ui/hardcore/heart.png']).toBeDefined();
    expect(out['textures/ui/horse_heart.png']).toBeDefined();

    // Java 1.16.5 -> Bedrock 1.14.0 emits legacy textures/gui/gui.png and omits 1.17+ freeze_heart / 1.21.50+ hardcore
    const b114 = await convertBuffer(toArrayBuffer(inputZip), 'gui-114.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      bedrockVersionId: '1.14.0',
      enableGuiConversion: true,
    });
    const b114Out = unzipSync(b114.buffer);
    expect(b114Out['textures/gui/gui.png']).toBeDefined();
    expect(b114Out['textures/ui/freeze_heart.png']).toBeUndefined();
    expect(b114Out['textures/ui/hardcore/heart.png']).toBeUndefined();
  });

  it('does not leak corrupt or oversized GUI spritesheets into output archive or textures_list', async () => {
    const oversizedHeader = new Uint8Array(33);
    oversizedHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const dv = new DataView(oversizedHeader.buffer);
    dv.setUint32(16, 16384, false);
    dv.setUint32(20, 16384, false);

    const inputZip = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 15, description: 'BadGUI' } })),
      'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
      'assets/minecraft/textures/gui/icons.png': new Uint8Array([1, 2, 3, 4]),
      'assets/minecraft/textures/gui/widgets.png': oversizedHeader,
    });

    const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'bad-gui.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      enableGuiConversion: true,
    });

    expect(report.errorCount).toBe(2);
    const out = unzipSync(buffer);
    expect(out['textures/ui/icons.png']).toBeUndefined();
    expect(out['textures/ui/widgets.png']).toBeUndefined();
    const texturesList = JSON.parse(strFromU8(out['textures/textures_list.json'])) as string[];
    expect(texturesList).not.toContain('textures/ui/icons.png');
    expect(texturesList).not.toContain('textures/ui/widgets.png');
  });

  it('handles 1.20.2+ split GUI sprites bidirectionally including .tga and skips unmapped/disabled sprites', async () => {
    const png8 = encodeRgbaToPngSync(8, 8, new Uint8Array(8 * 8 * 4));
    const j2bEnabled = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'ModernGUI' } })),
        'assets/minecraft/textures/gui/sprites/hud/heart/full.png': png8,
        'assets/minecraft/textures/gui/sprites/hud/crosshair.png': png8,
        'assets/minecraft/textures/gui/sprites/hud/experience_bar_background.png': png8,
        'assets/minecraft/textures/gui/sprites/widget/button.png': png8,
      })),
      'modern-gui.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: false }
    );
    const j2bOut = unzipSync(j2bEnabled.buffer);
    expect(j2bOut['textures/ui/heart.png']).toBeDefined();
    expect(j2bOut['textures/ui/cross_hair.png']).toBeUndefined();
    expect(j2bOut['textures/ui/experiencenub.png']).toBeUndefined();
    expect(j2bOut['textures/ui/sprites/widget/button.png']).toBeUndefined();

    // Minimal valid uncompressed 2x2 32-bit top-origin TGA
    const tga = new Uint8Array(18 + 2 * 2 * 4);
    tga[2] = 2;
    tga[12] = 2;
    tga[14] = 2;
    tga[16] = 32;
    tga[17] = 0x20;
    tga.set([0, 0, 255, 255], 18);

    const b2j = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'B', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/heart.tga': tga,
        'textures/ui/experiencenub.png': png8,
      })),
      'b2j-gui.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', enableGuiConversion: false }
    );
    const b2jOut = unzipSync(b2j.buffer);
    expect(getPngDimensions(b2jOut['assets/minecraft/textures/gui/sprites/hud/heart/full.png'])).toEqual({ width: 2, height: 2 });
    expect(b2jOut['assets/minecraft/textures/gui/sprites/hud/experience_bar_background.png']).toBeUndefined();
  });

  it('splits and stitches 1.20.2+ hotbar and gates air_empty by Java 1.21.2+', async () => {
    const hotbarRgba = new Uint8Array(182 * 22 * 4);
    hotbarRgba[0] = 10; hotbarRgba[1] = 20; hotbarRgba[2] = 30; hotbarRgba[3] = 255;
    hotbarRgba[(1 * 182 + 181) * 4] = 90; hotbarRgba[(1 * 182 + 181) * 4 + 3] = 255;

    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Hotbar' } })),
        'assets/minecraft/textures/gui/sprites/hud/hotbar.png': encodeRgbaToPngSync(182, 22, hotbarRgba),
      })),
      'hotbar.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: false }
    );
    const j2bOut = unzipSync(j2b.buffer);
    expect(getPngDimensions(j2bOut['textures/ui/hotbar_start_cap.png'])).toEqual({ width: 1, height: 22 });
    expect(getPngDimensions(j2bOut['textures/ui/hotbar_end_cap.png'])).toEqual({ width: 1, height: 22 });
    expect(getPngDimensions(j2bOut['textures/ui/hotbar_0.png'])).toEqual({ width: 20, height: 22 });

    const b2j = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'B', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/hotbar_start_cap.png': j2bOut['textures/ui/hotbar_start_cap.png'],
        'textures/ui/hotbar_0.png': j2bOut['textures/ui/hotbar_0.png'],
        'textures/ui/hotbar_end_cap.png': j2bOut['textures/ui/hotbar_end_cap.png'],
        'textures/ui/bubble_empty.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4)),
      })),
      'b-hotbar.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: false }
    );
    const b2jOut = unzipSync(b2j.buffer);
    expect(getPngDimensions(b2jOut['assets/minecraft/textures/gui/sprites/hud/hotbar.png'])).toEqual({ width: 182, height: 22 });
    expect(b2jOut['assets/minecraft/textures/gui/sprites/hud/air_empty.png']).toBeDefined();

    // Java 1.20.4 (pack_format 22 < 42) should not receive air_empty.png
    const b2jOld = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'B', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/bubble.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4)),
        'textures/ui/bubble_empty.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4)),
      })),
      'b-air-old.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.20.3', enableGuiConversion: false }
    );
    const b2jOldOut = unzipSync(b2jOld.buffer);
    expect(b2jOldOut['assets/minecraft/textures/gui/sprites/hud/air.png']).toBeDefined();
    expect(b2jOldOut['assets/minecraft/textures/gui/sprites/hud/air_empty.png']).toBeUndefined();
  });

  it('synthesizes legacy Java < 1.20.2 icons.png from Bedrock UI and skips widgets.png when buttons are absent', async () => {
    const heartRgba = new Uint8Array(9 * 9 * 4);
    heartRgba[0] = 220; heartRgba[3] = 255;

    const b2jLegacy = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'B', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/heart.png': encodeRgbaToPngSync(9, 9, heartRgba),
        'textures/ui/hotbar_0.png': encodeRgbaToPngSync(20, 22, new Uint8Array(20 * 22 * 4)),
      })),
      'b-legacy.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.16.2', enableGuiConversion: true }
    );
    const out = unzipSync(b2jLegacy.buffer);
    expect(getPngDimensions(out['assets/minecraft/textures/gui/icons.png'])).toEqual({ width: 256, height: 256 });
    expect(out['assets/minecraft/textures/gui/widgets.png']).toBeUndefined();
  });

  it('migrates GUI sheets and villager container paths in java-to-java upgrades and downgrades', async () => {
    const png256 = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4));
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4));

    // Upgrade 1.16.5 (pack_format 6) -> 1.21.4 (pack_format 46)
    const upgrade = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 6, description: 'J116' } })),
        'assets/minecraft/textures/gui/icons.png': png256,
        'assets/minecraft/textures/gui/widgets.png': png256,
        'assets/minecraft/textures/gui/bars.png': png256,
        'assets/minecraft/textures/gui/container/villager2.png': png16,
      })),
      'j-up.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    );
    const upOut = unzipSync(upgrade.buffer);
    expect(upOut['assets/minecraft/textures/gui/sprites/hud/heart/full.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/hud/heart/frozen_full.png']).toBeUndefined(); // not in 1.16
    expect(upOut['assets/minecraft/textures/gui/sprites/widget/button.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/widget/button.png.mcmeta']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/boss_bar/pink_background.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/container/villager.png']).toBeDefined();

    // Downgrade 1.21.4 (pack_format 46) -> 1.16.5 (pack_format 6)
    const downgrade = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'J121' } })),
        'assets/minecraft/textures/gui/sprites/hud/heart/full.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4)),
        'assets/minecraft/textures/gui/sprites/widget/button.png': encodeRgbaToPngSync(200, 20, new Uint8Array(200 * 20 * 4)),
        'assets/minecraft/textures/gui/sprites/boss_bar/pink_background.png': encodeRgbaToPngSync(182, 5, new Uint8Array(182 * 5 * 4)),
        'assets/minecraft/textures/gui/container/villager.png': png16,
      })),
      'j-down.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.16.2' }
    );
    const downOut = unzipSync(downgrade.buffer);
    expect(getPngDimensions(downOut['assets/minecraft/textures/gui/icons.png'])).toEqual({ width: 256, height: 256 });
    expect(getPngDimensions(downOut['assets/minecraft/textures/gui/widgets.png'])).toEqual({ width: 256, height: 256 });
    expect(getPngDimensions(downOut['assets/minecraft/textures/gui/bars.png'])).toEqual({ width: 256, height: 256 });
    expect(downOut['assets/minecraft/textures/gui/container/villager2.png']).toBeDefined();
  });

  it('upgrades legacy Bedrock < 1.16 GUI sheets to textures/ui without overwriting explicit files', async () => {
    const explicitHeart = encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4).fill(77));
    const png256 = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4));

    const b2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'B114', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 14, 0] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/heart.png': explicitHeart,
        'textures/gui/icons.png': png256,
        'textures/gui/gui.png': png256,
      })),
      'b2b.mcpack',
      { ...baseOptions, direction: 'bedrock-to-bedrock', bedrockVersionId: '1.21.50', enableGuiConversion: true }
    );
    const b2bOut = unzipSync(b2b.buffer);
    expect(b2bOut['textures/ui/heart.png']).toEqual(explicitHeart);
    expect(b2bOut['textures/ui/armor_full.png']).toBeDefined();
    expect(b2bOut['textures/ui/hotbar_0.png']).toBeDefined();
  });

  it('maps Java 1.8 bow_standby and legacy-renamed items/blocks to Bedrock bow_standby and legacy names', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const buf = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8 Pack' } })),
      'assets/minecraft/textures/items/bow_standby.png': pngBytes,
      'assets/minecraft/textures/items/bow_pulling_0.png': pngBytes,
      'assets/minecraft/textures/items/beef_raw.png': pngBytes,
      'assets/minecraft/textures/blocks/torch_on.png': pngBytes,
    });

    const result = await convertBuffer(toArrayBuffer(buf), 'test-1.8.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      bedrockVersionId: '1.26.60',
    });

    const out = unzipSync(new Uint8Array(result.buffer));
    expect(out['textures/items/bow_standby.png']).toBeDefined();
    expect(out['textures/items/bow_pulling_0.png']).toBeDefined();
    expect(out['textures/items/bow.png']).toBeUndefined();
    expect(out['textures/items/beef_raw.png']).toBeDefined();
    expect(out['textures/blocks/torch_on.png']).toBeDefined();

    const itemTextureJson = JSON.parse(strFromU8(out['textures/item_texture.json']));
    expect(itemTextureJson.texture_data.bow_standby).toBeDefined();
    expect(itemTextureJson.texture_data.bow).toBeUndefined();
  });

  it('maps Java 1.13+ item/bow.png to Bedrock textures/items/bow_standby.png', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const buf = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 4, description: '1.13 Pack' } })),
      'assets/minecraft/textures/item/bow.png': pngBytes,
      'assets/minecraft/textures/item/bow_pulling_0.png': pngBytes,
    });

    const result = await convertBuffer(toArrayBuffer(buf), 'test-1.13.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      bedrockVersionId: '1.12.0',
    });

    const out = unzipSync(new Uint8Array(result.buffer));
    expect(out['textures/items/bow_standby.png']).toBeDefined();
    expect(out['textures/items/bow_pulling_0.png']).toBeDefined();
    expect(out['textures/items/bow.png']).toBeUndefined();
  });

  it('converts title screen panoramas bidirectionally even when enableGuiConversion is false', async () => {
    const pngBytes = encodeRgbaToPngSync(2, 2, new Uint8Array(2 * 2 * 4).fill(200));
    const javaFiles: Record<string, Uint8Array> = {
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 34, description: 'Panorama Pack' } })),
      'assets/minecraft/textures/gui/title/background/panorama_overlay.png': pngBytes,
    };
    for (let i = 0; i < 6; i++) {
      javaFiles[`assets/minecraft/textures/gui/title/background/panorama_${i}.png`] = pngBytes;
    }

    const j2b = await convertBuffer(toArrayBuffer(zipSync(javaFiles)), 'pano-java.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      enableGuiConversion: false,
    });
    const j2bOut = unzipSync(j2b.buffer);
    for (let i = 0; i < 6; i++) {
      expect(j2bOut[`textures/ui/panorama_${i}.png`]).toBeDefined();
    }
    expect(j2bOut['textures/ui/panorama_overlay.png']).toBeDefined();
    const texList = JSON.parse(strFromU8(j2bOut['textures/textures_list.json'])) as string[];
    expect(texList).toContain('textures/ui/panorama_0.png');
    expect(texList).toContain('textures/ui/panorama_overlay.png');

    const b2j = await convertBuffer(toArrayBuffer(j2b.buffer), 'pano-bedrock.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.21.4',
      enableGuiConversion: false,
    });
    const b2jOut = unzipSync(b2j.buffer);
    for (let i = 0; i < 6; i++) {
      expect(b2jOut[`assets/minecraft/textures/gui/title/background/panorama_${i}.png`]).toBeDefined();
    }
    expect(b2jOut['assets/minecraft/textures/gui/title/background/panorama_overlay.png']).toBeDefined();
  });

  it('converts OptiFine 3x2 custom sky to Bedrock overworld_cubemap and round-trips losslessly back to Java', async () => {
    const dayRgba = new Uint8Array(6 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        const idx = (y * 6 + x) * 4;
        dayRgba[idx] = x * 40 + 10;
        dayRgba[idx + 1] = y * 50 + 20;
        dayRgba[idx + 2] = (x + y) * 20 + 30;
        dayRgba[idx + 3] = 255;
      }
    }
    const dayPng = encodeRgbaToPngSync(6, 4, dayRgba);
    const nightPng = encodeRgbaToPngSync(6, 4, new Uint8Array(6 * 4 * 4).fill(10));

    const javaZip = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 34, description: 'Sky Pack' } })),
      'assets/minecraft/optifine/sky/world0/sky1.properties': strToU8('source=./night.png\nstartFadeIn=20:00\nendFadeOut=04:00\n'),
      'assets/minecraft/optifine/sky/world0/night.png': nightPng,
      'assets/minecraft/optifine/sky/world0/sky2.properties': strToU8('source=./day.png\nstartFadeIn=06:00\nendFadeOut=18:00\n'),
      'assets/minecraft/optifine/sky/world0/day.png': dayPng,
    });

    const j2b = await convertBuffer(toArrayBuffer(javaZip), 'sky-java.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
    });
    const j2bOut = unzipSync(j2b.buffer);
    for (let i = 0; i < 6; i++) {
      expect(j2bOut[`textures/environment/overworld_cubemap/cubemap_${i}.png`]).toBeDefined();
    }
    const texList = JSON.parse(strFromU8(j2bOut['textures/textures_list.json'])) as string[];
    expect(texList).toContain('textures/environment/overworld_cubemap/cubemap_0.png');
    expect(texList).toContain('textures/environment/overworld_cubemap/cubemap_4.png');

    // Verify cubemap_4 (top tile col=1,row=0 -> x=[2,3], y=[0,1]) is rotated 180 degrees
    const topFace = decodePngToRgbaSync(j2bOut['textures/environment/overworld_cubemap/cubemap_4.png']);
    expect(topFace?.width).toBe(2);
    expect(topFace?.height).toBe(2);
    // Top-left pixel of cubemap_4 should come from (x=3, y=1) of dayRgba
    const expectedTopLeftIdx = (1 * 6 + 3) * 4;
    expect(Array.from(topFace!.rgba.slice(0, 4))).toEqual(Array.from(dayRgba.slice(expectedTopLeftIdx, expectedTopLeftIdx + 4)));

    // Round-trip Bedrock -> Java 1.21.4 (optifine/)
    const b2jModern = await convertBuffer(toArrayBuffer(j2b.buffer), 'sky-bedrock.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.21.4',
    });
    const b2jModernOut = unzipSync(b2jModern.buffer);
    expect(b2jModernOut['assets/minecraft/optifine/sky/world0/sky1.png']).toBeDefined();
    expect(b2jModernOut['assets/minecraft/optifine/sky/world0/sky1.properties']).toBeDefined();
    const roundTripped = decodePngToRgbaSync(b2jModernOut['assets/minecraft/optifine/sky/world0/sky1.png']);
    expect(roundTripped?.rgba).toEqual(dayRgba);

    // Round-trip Bedrock -> Java 1.8.0 (mcpatcher/)
    const b2jLegacy = await convertBuffer(toArrayBuffer(j2b.buffer), 'sky-bedrock.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.8.0',
    });
    const b2jLegacyOut = unzipSync(b2jLegacy.buffer);
    expect(b2jLegacyOut['assets/minecraft/mcpatcher/sky/world0/sky1.png']).toBeDefined();
    expect(b2jLegacyOut['assets/minecraft/mcpatcher/sky/world0/sky1.properties']).toBeDefined();
  });

  it('migrates Java <-> Java custom sky paths and properties between mcpatcher and optifine', async () => {
    const skyPng = encodeRgbaToPngSync(6, 4, new Uint8Array(6 * 4 * 4).fill(150));
    const legacyZip = zipSync({
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8 Sky' } })),
      'assets/minecraft/mcpatcher/sky/world0/sky1.properties': strToU8('source=./Cloud1.png\nblend=add\n'),
      'assets/minecraft/mcpatcher/sky/world0/Cloud1.png': skyPng,
    });

    const j2jUp = await convertBuffer(toArrayBuffer(legacyZip), 'sky-1.8.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '1.21.4',
    });
    const upOut = unzipSync(j2jUp.buffer);
    expect(upOut['assets/minecraft/optifine/sky/world0/cloud1.png']).toBeDefined();
    expect(strFromU8(upOut['assets/minecraft/optifine/sky/world0/sky1.properties'])).toContain('source=./cloud1.png');

    const j2jDown = await convertBuffer(toArrayBuffer(j2jUp.buffer), 'sky-1.21.4.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '1.8.0',
    });
    const downOut = unzipSync(j2jDown.buffer);
    expect(downOut['assets/minecraft/mcpatcher/sky/world0/cloud1.png']).toBeDefined();
    expect(downOut['assets/minecraft/mcpatcher/sky/world0/sky1.properties']).toBeDefined();
  });

  it('converts Java container sheets and 1.20.2+ container sprites to Bedrock 9-slice theme and UI parts', async () => {
    const fillRect = (rgba: Uint8Array, w: number, x0: number, y0: number, rw: number, rh: number, r: number, g: number, b: number) => {
      for (let y = y0; y < y0 + rh; y++) {
        for (let x = x0; x < x0 + rw; x++) {
          const idx = (y * w + x) * 4;
          rgba[idx] = r;
          rgba[idx + 1] = g;
          rgba[idx + 2] = b;
          rgba[idx + 3] = 255;
        }
      }
    };

    const invRgba = new Uint8Array(256 * 256 * 4);
    fillRect(invRgba, 256, 0, 0, 176, 166, 40, 44, 52);
    fillRect(invRgba, 256, 7, 7, 18, 18, 255, 0, 0);
    fillRect(invRgba, 256, 7, 83, 18, 18, 25, 28, 34);
    fillRect(invRgba, 256, 0, 166, 120, 32, 60, 70, 80);

    const furRgba = new Uint8Array(256 * 256 * 4);
    fillRect(furRgba, 256, 0, 0, 176, 166, 40, 44, 52);
    fillRect(furRgba, 256, 56, 36, 14, 14, 90, 90, 90);
    fillRect(furRgba, 256, 80, 35, 22, 15, 95, 95, 95);
    fillRect(furRgba, 256, 176, 0, 14, 14, 255, 140, 0);
    fillRect(furRgba, 256, 176, 14, 24, 16, 240, 240, 240);

    const brewRgba = new Uint8Array(256 * 256 * 4);
    fillRect(brewRgba, 256, 0, 0, 176, 166, 40, 44, 52);
    fillRect(brewRgba, 256, 176, 0, 9, 28, 200, 180, 50);
    fillRect(brewRgba, 256, 185, 0, 12, 29, 220, 220, 255);

    const legacyJ2B = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 13, description: '1.19.4 Containers' } })),
        'assets/minecraft/textures/gui/container/inventory.png': encodeRgbaToPngSync(256, 256, invRgba),
        'assets/minecraft/textures/gui/container/furnace.png': encodeRgbaToPngSync(256, 256, furRgba),
        'assets/minecraft/textures/gui/container/brewing_stand.png': encodeRgbaToPngSync(256, 256, brewRgba),
        'assets/minecraft/textures/gui/container/dispenser.png': encodeRgbaToPngSync(256, 256, furRgba),
      })),
      'legacy-containers.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: true }
    );
    const legOut = unzipSync(legacyJ2B.buffer);
    expect(getPngDimensions(legOut['textures/ui/dialog_background_opaque.png'])).toEqual({ width: 16, height: 16 });
    const bgDecoded = decodePngToRgbaSync(legOut['textures/ui/dialog_background_opaque.png']);
    expect(Array.from(bgDecoded!.rgba.slice((8 * 16 + 8) * 4, (8 * 16 + 8) * 4 + 3))).toEqual([40, 44, 52]);
    const dispDetail = legacyJ2B.report.details.find((d) => d.filename === 'assets/minecraft/textures/gui/container/dispenser.png');
    expect(dispDetail?.reason).toBe('Covered by shared Bedrock container theme (dialog_background_opaque / cell_image)');
    expect(getPngDimensions(legOut['textures/ui/cell_image.png'])).toEqual({ width: 10, height: 10 });
    expect(getPngDimensions(legOut['textures/ui/cell_image_normal.png'])).toEqual({ width: 5, height: 5 });
    expect(getPngDimensions(legOut['textures/ui/flame_full_image.png'])).toEqual({ width: 14, height: 14 });
    expect(getPngDimensions(legOut['textures/ui/flame_empty_image.png'])).toEqual({ width: 14, height: 14 });
    expect(getPngDimensions(legOut['textures/ui/arrow_active.png'])).toEqual({ width: 24, height: 16 });
    expect(getPngDimensions(legOut['textures/ui/arrow_inactive.png'])).toEqual({ width: 22, height: 15 });
    expect(legOut['textures/ui/brewing_arrow_full.png']).toBeDefined();
    expect(legOut['textures/ui/bubbles_full.png']).toBeDefined();
    expect(legOut['textures/ui/effect_background.png']).toBeDefined();
    expect(legOut['textures/ui/container/furnace.png']).toBeUndefined();

    // Modern 1.21.4 clipped furnace.png + explicit sprites + slot + crafter
    const clippedFur = new Uint8Array(256 * 256 * 4);
    fillRect(clippedFur, 256, 0, 0, 176, 166, 50, 50, 50);
    const explicitFlame = encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(222));
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(180));
    const png18 = encodeRgbaToPngSync(18, 18, new Uint8Array(18 * 18 * 4).fill(190));

    const modJ2B = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: '1.21.4 Containers' } })),
        'assets/minecraft/textures/gui/container/furnace.png': encodeRgbaToPngSync(256, 256, clippedFur),
        'assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png': explicitFlame,
        'assets/minecraft/textures/gui/sprites/container/slot/helmet.png': png16,
        'assets/minecraft/textures/gui/sprites/container/crafter/disabled_slot.png': png18,
      })),
      'modern-containers.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.21.50', enableGuiConversion: true }
    );
    const modOut = unzipSync(modJ2B.buffer);
    expect(modOut['textures/ui/flame_full_image.png']).toEqual(explicitFlame);
    expect(modOut['textures/ui/arrow_active.png']).toBeUndefined();
    expect(modOut['textures/ui/empty_armor_slot_helmet.png']).toBeDefined();
    expect(modOut['textures/ui/slot_disabled.png']).toBeDefined();
  });

  it('synthesizes Java containers from Bedrock 9-slice theme and splits/bakes sprites by Java version', async () => {
    const dialogBg = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(70));
    const cellImg = encodeRgbaToPngSync(10, 10, new Uint8Array(10 * 10 * 4).fill(35));
    const flame = encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(210));
    const arrow = encodeRgbaToPngSync(22, 15, new Uint8Array(22 * 15 * 4).fill(230));
    const helmet = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(120));

    const bedrockZip = zipSync({
      'manifest.json': strToU8(JSON.stringify({
        format_version: 2,
        header: { name: 'BContainer', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
        modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
      })),
      'textures/ui/dialog_background_opaque.png': dialogBg,
      'textures/ui/cell_image.png': cellImg,
      'textures/ui/flame_full_image.png': flame,
      'textures/ui/arrow_active.png': arrow,
      'textures/ui/empty_armor_slot_helmet.png': helmet,
    });

    const b2jModern = await convertBuffer(toArrayBuffer(bedrockZip), 'b-container.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.21.4',
      enableGuiConversion: true,
    });
    const modOut = unzipSync(b2jModern.buffer);
    expect(getPngDimensions(modOut['assets/minecraft/textures/gui/container/inventory.png'])).toEqual({ width: 256, height: 256 });
    expect(getPngDimensions(modOut['assets/minecraft/textures/gui/container/generic_54.png'])).toEqual({ width: 256, height: 256 });
    expect(modOut['assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png']).toEqual(flame);
    expect(modOut['assets/minecraft/textures/gui/sprites/container/furnace/burn_progress.png']).toEqual(arrow);
    expect(modOut['assets/minecraft/textures/gui/sprites/container/slot/helmet.png']).toEqual(helmet);

    const b2jLegacy = await convertBuffer(toArrayBuffer(bedrockZip), 'b-container.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.19.4',
      enableGuiConversion: true,
    });
    const legOut = unzipSync(b2jLegacy.buffer);
    const furDecoded = decodePngToRgbaSync(legOut['assets/minecraft/textures/gui/container/furnace.png']);
    expect(furDecoded?.rgba[(0 * 256 + 176) * 4]).toBe(210);
    expect(furDecoded?.rgba[(14 * 256 + 176) * 4]).toBe(230);
    expect(legOut['assets/minecraft/textures/item/empty_armor_slot_helmet.png']).toEqual(helmet);

    // Without dialog_background_opaque or cell_image, do NOT synthesize blank container PNGs
    const noTheme = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'NoTheme', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/flame_full_image.png': flame,
      })),
      'no-theme.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.19.4', enableGuiConversion: true }
    );
    expect(unzipSync(noTheme.buffer)['assets/minecraft/textures/gui/container/furnace.png']).toBeUndefined();
  });

  it('migrates Java <-> Java container sheets, sprites, and empty slot icons across 1.19.4 and 1.21.4', async () => {
    const furRgba = new Uint8Array(256 * 256 * 4);
    for (let y = 0; y < 14; y++) {
      for (let x = 176; x < 190; x++) {
        const idx = (y * 256 + x) * 4;
        furRgba[idx] = 250;
        furRgba[idx + 3] = 255;
      }
    }
    const loomRgba = new Uint8Array(256 * 256 * 4);
    for (let y = 0; y < 16; y++) {
      for (let x = 176; x < 224; x++) {
        const idx = (y * 256 + x) * 4;
        loomRgba[idx + 1] = 200;
        loomRgba[idx + 3] = 255;
      }
    }
    const helmet = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(111));

    const up = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 13, description: '1.19.4' } })),
        'assets/minecraft/textures/gui/container/furnace.png': encodeRgbaToPngSync(256, 256, furRgba),
        'assets/minecraft/textures/gui/container/loom.png': encodeRgbaToPngSync(256, 256, loomRgba),
        'assets/minecraft/textures/item/empty_armor_slot_helmet.png': helmet,
      })),
      'j-1.19.4.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    );
    const upOut = unzipSync(up.buffer);
    expect(upOut['assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/container/slot/banner.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/container/slot/dye.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/container/slot/banner_pattern.png']).toBeDefined();
    expect(upOut['assets/minecraft/textures/gui/sprites/container/slot/helmet.png']).toEqual(helmet);

    const down = await convertBuffer(toArrayBuffer(up.buffer), 'j-1.21.4.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '1.19.4',
    });
    const downOut = unzipSync(down.buffer);
    const downFur = decodePngToRgbaSync(downOut['assets/minecraft/textures/gui/container/furnace.png']);
    expect(downFur?.rgba[(0 * 256 + 176) * 4]).toBe(250);
    expect(downOut['assets/minecraft/textures/item/empty_armor_slot_helmet.png']).toEqual(helmet);
  });

  it('converts tree leaves Java -> Bedrock with Fancy TGA, Opaque PNG, Carried TGA, terrain_texture, and LabPBR', async () => {
    const leafRgba = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < 16 * 16; i++) {
      const idx = i * 4;
      if (i % 2 === 0) {
        leafRgba[idx] = 200; leafRgba[idx + 1] = 200; leafRgba[idx + 2] = 200; leafRgba[idx + 3] = 255;
      }
    }
    const leafPng = encodeRgbaToPngSync(16, 16, leafRgba);
    const specPng = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(128));

    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Leaves' } })),
        'assets/minecraft/textures/block/oak_leaves.png': leafPng,
        'assets/minecraft/textures/block/oak_leaves_s.png': specPng,
        'assets/minecraft/textures/block/dark_oak_leaves.png': leafPng,
        'assets/minecraft/textures/block/mangrove_leaves.png': leafPng,
        'assets/minecraft/textures/block/flowering_azalea_leaves.png': leafPng,
        'assets/minecraft/textures/block/cherry_leaves.png': leafPng,
        'assets/minecraft/textures/block/pale_oak_leaves.png': leafPng,
      })),
      'leaves-java.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.26.60' }
    );
    expect(j2b.report.errorCount).toBe(0);
    const out = unzipSync(j2b.buffer);

    const fancyOak = decodeTgaToRgba(out['textures/blocks/leaves_oak.tga']);
    expect(fancyOak?.width).toBe(16);
    expect(fancyOak?.rgba[3]).toBe(255);
    expect(fancyOak?.rgba[7]).toBe(0);

    const opaqueOak = decodePngToRgbaSync(out['textures/blocks/leaves_oak_opaque.png'])!;
    for (let i = 3; i < opaqueOak.rgba.length; i += 4) {
      expect(opaqueOak.rgba[i]).toBe(255);
    }
    expect(opaqueOak.rgba[4]).toBe(50);

    const carriedOak = decodeTgaToRgba(out['textures/blocks/leaves_oak_carried.tga'])!;
    expect(carriedOak.rgba[1]).toBeGreaterThan(carriedOak.rgba[0]);
    expect(carriedOak.rgba[7]).toBe(0);

    expect(out['textures/blocks/leaves_big_oak.tga']).toBeDefined();
    expect(out['textures/blocks/leaves_big_oak_opaque.png']).toBeDefined();
    expect(out['textures/blocks/leaves_big_oak_carried.tga']).toBeDefined();
    expect(out['textures/blocks/mangrove_leaves.tga']).toBeDefined();
    expect(out['textures/blocks/mangrove_leaves_carried.tga']).toBeDefined();
    expect(out['textures/blocks/azalea_leaves_flowers.tga']).toBeDefined();
    expect(out['textures/blocks/cherry_leaves.tga']).toBeDefined();
    expect(out['textures/blocks/pale_oak_leaves.tga']).toBeDefined();
    expect(out['textures/blocks/leaves_oak_mer.png']).toBeDefined();
    expect(out['textures/blocks/leaves_oak.texture_set.json']).toBeDefined();

    const terrain = JSON.parse(strFromU8(out['textures/terrain_texture.json']));
    expect(terrain.texture_data.oak_leaves.textures).toEqual(['textures/blocks/leaves_oak', 'textures/blocks/leaves_oak_opaque']);
    expect(terrain.texture_data.oak_leaves_carried.textures).toEqual(['textures/blocks/leaves_oak_carried', 'textures/blocks/leaves_oak_carried']);
    expect(terrain.texture_data.big_oak_leaves.textures).toEqual(['textures/blocks/leaves_big_oak', 'textures/blocks/leaves_big_oak_opaque']);
    expect(terrain.texture_data.azalea_leaves_flowered.textures).toEqual(['textures/blocks/azalea_leaves_flowers', 'textures/blocks/azalea_leaves_flowers_opaque']);
    expect(terrain.texture_data.leaves_oak_opaque).toBeUndefined();

    // Legacy Java 1.8 -> Bedrock
    const legOut = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/textures/blocks/leaves_oak.png': leafPng,
      })),
      'leaves-1.8.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    )).buffer);
    expect(legOut['textures/blocks/leaves_oak.tga']).toBeDefined();
    expect(legOut['textures/blocks/leaves_oak_opaque.png']).toBeDefined();
    expect(legOut['textures/blocks/leaves_oak_carried.tga']).toBeDefined();
  });

  it('prefers Fancy leaves over _opaque in Bedrock -> Java regardless of ZIP order and skips _carried', async () => {
    const fancyRgba = new Uint8Array(16 * 16 * 4);
    fancyRgba[0] = 180; fancyRgba[1] = 180; fancyRgba[2] = 180; fancyRgba[3] = 255;
    const fancyTga = encodeRgbaToTgaSync(16, 16, fancyRgba);
    const fancyPng = encodeRgbaToPngSync(16, 16, fancyRgba);
    const opaquePng = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(255));
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'BLeaves', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    // Order A: Fancy before Opaque; Order B: Opaque before Fancy
    for (const files of [
      {
        'manifest.json': manifest,
        'textures/blocks/leaves_oak.tga': fancyTga,
        'textures/blocks/leaves_oak_opaque.png': opaquePng,
        'textures/blocks/leaves_oak_carried.tga': fancyTga,
        'textures/blocks/azalea_leaves.png': fancyPng,
        'textures/blocks/azalea_leaves_opaque.png': opaquePng,
      },
      {
        'manifest.json': manifest,
        'textures/blocks/leaves_oak_opaque.png': opaquePng,
        'textures/blocks/leaves_oak.tga': fancyTga,
        'textures/blocks/leaves_oak_carried.tga': fancyTga,
        'textures/blocks/azalea_leaves_opaque.png': opaquePng,
        'textures/blocks/azalea_leaves.png': fancyPng,
      },
    ]) {
      const res = await convertBuffer(toArrayBuffer(zipSync(files)), 'b-leaves.mcpack', {
        ...baseOptions,
        direction: 'bedrock-to-java',
        javaVersionId: '1.21.4',
      });
      const jOut = unzipSync(res.buffer);
      expect(decodePngToRgbaSync(jOut['assets/minecraft/textures/block/oak_leaves.png'])!.rgba[7]).toBe(0);
      expect(decodePngToRgbaSync(jOut['assets/minecraft/textures/block/azalea_leaves.png'])!.rgba[7]).toBe(0);
      expect(jOut['assets/minecraft/textures/block/leaves_oak_carried.png']).toBeUndefined();
    }

    // Opaque-only fallback + 1.19.4 mangrove_leaves_opaque.png
    const fallbackOut = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/leaves_oak_opaque.png': opaquePng,
        'textures/blocks/mangrove_leaves_opaque.png': opaquePng,
      })),
      'b-opaque.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.19.4', bedrockVersionId: '1.19.0' }
    )).buffer);
    expect(fallbackOut['assets/minecraft/textures/block/oak_leaves.png']).toBeDefined();
    expect(fallbackOut['assets/minecraft/textures/block/mangrove_leaves.png']).toBeDefined();
  });

  it('converts grass_block_side bidirectionally with alpha mask compositing and splitting', async () => {
    const sideRgba = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < 16 * 16; i++) {
      sideRgba[i * 4] = 120; sideRgba[i * 4 + 1] = 85; sideRgba[i * 4 + 2] = 55; sideRgba[i * 4 + 3] = 255;
    }
    const overlayRgba = new Uint8Array(16 * 16 * 4);
    for (let x = 0; x < 16; x++) {
      overlayRgba[x * 4] = 200; overlayRgba[x * 4 + 1] = 200; overlayRgba[x * 4 + 2] = 200; overlayRgba[x * 4 + 3] = 255;
    }

    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Grass' } })),
        'assets/minecraft/textures/block/grass_block_side.png': encodeRgbaToPngSync(16, 16, sideRgba),
        'assets/minecraft/textures/block/grass_block_side_overlay.png': encodeRgbaToPngSync(16, 16, overlayRgba),
      })),
      'grass-j.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const bOut = unzipSync(j2b.buffer);
    const grassTga = decodeTgaToRgba(bOut['textures/blocks/grass_side.tga'])!;
    expect(grassTga.rgba[3]).toBe(255); // top overlay pixel
    expect(grassTga.rgba[(15 * 16) * 4 + 3]).toBe(0); // dirt pixel
    expect(bOut['textures/blocks/grass_side_carried.png']).toBeDefined();
    expect(bOut['textures/blocks/grass_block_side_overlay.png']).toBeUndefined();

    const b2j = await convertBuffer(toArrayBuffer(j2b.buffer), 'grass-b.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
    });
    const jOut = unzipSync(b2j.buffer);
    const jSide = decodePngToRgbaSync(jOut['assets/minecraft/textures/block/grass_block_side.png'])!;
    const jOverlay = decodePngToRgbaSync(jOut['assets/minecraft/textures/block/grass_block_side_overlay.png'])!;
    expect(jSide.rgba[3]).toBe(255);
    expect(jSide.rgba[(15 * 16) * 4 + 3]).toBe(255);
    expect(jOverlay.rgba[3]).toBe(255);
    expect(jOverlay.rgba[(15 * 16) * 4 + 3]).toBe(0);
  });

  it('preserves GUI transparency for RGB tRNS PNGs, semi-transparent Bedrock slots, and clear Java container panels', async () => {
    // 1. RGB PNG (colorType 2) with tRNS key [255, 0, 255]
    const makeRgbTrnsPng = () => {
      const crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
      const chunk = (type: string, data: Uint8Array) => {
        const out = new Uint8Array(12 + data.length);
        const v = new DataView(out.buffer);
        v.setUint32(0, data.length, false);
        for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        let c = 0xffffffff;
        for (let i = 4; i < 8 + data.length; i++) c = crcTable[(c ^ out[i]) & 0xff] ^ (c >>> 8);
        v.setUint32(8 + data.length, (c ^ 0xffffffff) >>> 0, false);
        return out;
      };
      const ihdr = new Uint8Array([0, 0, 0, 2, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
      const trns = new Uint8Array([0, 255, 0, 0, 0, 255]);
      const idat = zlibSync(new Uint8Array([0, 255, 0, 255, 10, 20, 30]));
      const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const c1 = chunk('IHDR', ihdr), c2 = chunk('tRNS', trns), c3 = chunk('IDAT', idat), c4 = chunk('IEND', new Uint8Array(0));
      const png = new Uint8Array(sig.length + c1.length + c2.length + c3.length + c4.length);
      let p = 0;
      for (const part of [sig, c1, c2, c3, c4]) { png.set(part, p); p += part.length; }
      return png;
    };
    const sliced = await processGuiSpriteSheet(makeRgbTrnsPng(), { 'a.png': { x: 0, y: 0, w: 2, h: 1 } }, { baseWidth: 2 });
    const decodedSliced = decodePngToRgbaSync(sliced['a.png'])!;
    expect(Array.from(decodedSliced.rgba)).toEqual([255, 0, 255, 0, 10, 20, 30, 255]);

    // 2. Semi-transparent cell_image alpha-blended over opaque dialog_background_opaque
    const bg = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(200));
    const cellRgba = new Uint8Array(10 * 10 * 4);
    for (let i = 0; i < 100; i++) {
      cellRgba[i * 4] = 0; cellRgba[i * 4 + 1] = 0; cellRgba[i * 4 + 2] = 0; cellRgba[i * 4 + 3] = 128;
    }
    const b2jGui = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'AlphaGui', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/ui/dialog_background_opaque.png': bg,
        'textures/ui/cell_image.png': encodeRgbaToPngSync(10, 10, cellRgba),
      })),
      'alpha-gui.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.19.4', enableGuiConversion: true }
    );
    const inv = decodePngToRgbaSync(unzipSync(b2jGui.buffer)['assets/minecraft/textures/gui/container/inventory.png'])!;
    const slotPx = (85 * 256 + 9) * 4;
    expect(inv.rgba[slotPx + 3]).toBeGreaterThan(200);
    expect(inv.rgba[slotPx]).toBeLessThan(120);

    // 3. Clear Java furnace.png still exports transparent in-panel flame_empty_image.png
    const clearFurnace = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4));
    const j2bClear = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Clear' } })),
        'assets/minecraft/textures/gui/container/furnace.png': clearFurnace,
      })),
      'clear-furnace.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: true }
    );
    const clearOut = unzipSync(j2bClear.buffer);
    expect(clearOut['textures/ui/flame_empty_image.png']).toBeDefined();
    expect(clearOut['textures/ui/arrow_active.png']).toBeUndefined();
  });

  it('fixes split GUI sprite priority, fallback guards, versioned slots, and sheet scaling', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'GuiFixes', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    // 1. Bedrock gui.png + hotbar_*.png: modern hotbar_*.png wins, Java-only sprites excluded, and legacy gui.png gated by enableGuiConversion
    const legacyGui = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4).fill(50));
    const modernHotbar0 = encodeRgbaToPngSync(20, 22, new Uint8Array(20 * 22 * 4).fill(210));
    const cap1 = encodeRgbaToPngSync(1, 22, new Uint8Array(1 * 22 * 4).fill(210));
    const b2jGui = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/gui/gui.png': legacyGui,
        'textures/ui/hotbar_start_cap.png': cap1,
        'textures/ui/hotbar_0.png': modernHotbar0,
        'textures/ui/hotbar_end_cap.png': cap1,
      })),
      'gui-prio.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: true }
    );
    const b2jGuiOut = unzipSync(b2jGui.buffer);
    expect(decodePngToRgbaSync(b2jGuiOut['assets/minecraft/textures/gui/sprites/hud/hotbar.png'])!.rgba[4]).toBe(210);
    expect(b2jGuiOut['assets/minecraft/textures/gui/sprites/hud/hotbar_offhand_left.png']).toBeUndefined();
    expect(b2jGuiOut['assets/minecraft/textures/gui/sprites/widget/locked_button.png']).toBeUndefined();
    expect(b2jGuiOut['assets/minecraft/textures/gui/sprites/icon/draft_report.png']).toBeUndefined();

    const b2jGuiOff = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/gui/gui.png': legacyGui,
        'textures/ui/heart.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4).fill(200)),
      })),
      'gui-off.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: false }
    );
    const b2jGuiOffOut = unzipSync(b2jGuiOff.buffer);
    expect(b2jGuiOffOut['assets/minecraft/textures/gui/sprites/hud/hotbar.png']).toBeUndefined();
    expect(b2jGuiOffOut['assets/minecraft/textures/gui/sprites/hud/heart/full.png']).toBeDefined();

    // 2. Bedrock -> Java unmapped/unsupported textures/ui/* do not leak to textures/gui/*, and disguised TGA .png is decoded
    const disguisedTga = encodeRgbaToTgaSync(14, 14, new Uint8Array(14 * 14 * 4).fill(180));
    const b2jGuard = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/ui/bubble_empty.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4)),
        'textures/ui/experiencenub.png': encodeRgbaToPngSync(8, 8, new Uint8Array(8 * 8 * 4)),
        'textures/ui/flame_full_image.png': disguisedTga,
      })),
      'ui-guard.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.20.3', enableGuiConversion: true }
    );
    const guardOut = unzipSync(b2jGuard.buffer);
    expect(guardOut['assets/minecraft/textures/gui/bubble_empty.png']).toBeUndefined();
    expect(guardOut['assets/minecraft/textures/gui/experiencenub.png']).toBeUndefined();
    expect(getPngDimensions(guardOut['assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png'])).toEqual({ width: 14, height: 14 });

    // 3. Java -> Bedrock primary furnace/anvil win over smoker/blast_furnace/smithing fallbacks
    const flamePrimary = encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(240));
    const flameFallback = encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(30));
    const crossPrimary = encodeRgbaToPngSync(28, 21, new Uint8Array(28 * 21 * 4).fill(230));
    const crossFallback = encodeRgbaToPngSync(28, 21, new Uint8Array(28 * 21 * 4).fill(20));
    const j2bFallback = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'F' } })),
        'assets/minecraft/textures/gui/sprites/container/blast_furnace/lit_progress.png': flameFallback,
        'assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png': flamePrimary,
        'assets/minecraft/textures/gui/sprites/container/smoker/lit_progress.png': flameFallback,
        'assets/minecraft/textures/gui/sprites/container/anvil/error.png': crossPrimary,
        'assets/minecraft/textures/gui/sprites/container/smithing/error.png': crossFallback,
      })),
      'j2b-fallback.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const j2bFbOut = unzipSync(j2bFallback.buffer);
    expect(j2bFbOut['textures/ui/flame_full_image.png']).toEqual(flamePrimary);
    expect(j2bFbOut['textures/ui/crossout.png']).toEqual(crossPrimary);

    // 4. Java -> Java downgrade without base container PNG or button.png skips accurately
    const j2jDown = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'D' } })),
        'assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png': flamePrimary,
        'assets/minecraft/textures/gui/sprites/widget/locked_button.png': encodeRgbaToPngSync(20, 20, new Uint8Array(20 * 20 * 4).fill(100)),
        'assets/minecraft/textures/gui/sprites/hud/hotbar.png': encodeRgbaToPngSync(182, 22, new Uint8Array(182 * 22 * 4).fill(100)),
      })),
      'j2j-down.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.19.4' }
    );
    expect(unzipSync(j2jDown.buffer)['assets/minecraft/textures/gui/widgets.png']).toBeUndefined();
    expect(j2jDown.report.details.some((d) => d.status === 'skipped' && d.filename === 'assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png')).toBe(true);
    expect(j2jDown.report.details.some((d) => d.status === 'skipped' && d.filename === 'assets/minecraft/textures/gui/sprites/hud/hotbar.png')).toBe(true);

    // 5. 1.21.4+ loom/horse slots & 26.3.0 (packFormat >= 75) inventory/effect_background
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(150));
    const png120 = encodeRgbaToPngSync(120, 32, new Uint8Array(120 * 32 * 4).fill(150));
    const b2j263 = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/ui/loom_banner_empty.png': png16,
        'textures/ui/effect_background.png': png120,
      })),
      'b2j-263.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '26.3.0' }
    );
    const out263 = unzipSync(b2j263.buffer);
    expect(out263['assets/minecraft/textures/gui/sprites/container/slot/banner.png']).toBeDefined();
    expect(out263['assets/minecraft/textures/gui/sprites/container/loom/banner_slot.png']).toBeUndefined();
    expect(out263['assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png']).toBeDefined();
    expect(out263['assets/minecraft/textures/gui/sprites/container/inventory/effect_background_large.png']).toBeUndefined();

    const j2b263 = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 97, description: '26.3' } })),
        'assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png': png120,
      })),
      'j2b-263.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    expect(unzipSync(j2b263.buffer)['textures/ui/effect_background.png']).toEqual(png120);

    const horseRgba = new Uint8Array(256 * 256 * 4);
    horseRgba[(221 * 256 + 1) * 4] = 99; horseRgba[(221 * 256 + 1) * 4 + 3] = 255;
    const j2jHorse = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 13, description: 'H' } })),
        'assets/minecraft/textures/gui/container/horse.png': encodeRgbaToPngSync(256, 256, horseRgba),
      })),
      'j2j-horse.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    );
    const horseOut = unzipSync(j2jHorse.buffer);
    expect(getPngDimensions(horseOut['assets/minecraft/textures/gui/sprites/container/slot/horse_armor.png'])).toEqual({ width: 16, height: 16 });
    expect(horseOut['assets/minecraft/textures/gui/sprites/container/horse/armor_slot.png']).toBeUndefined();

    // 6. 1.12.2 jump_bar_cooldown & 256x256 villager guard, plus multi-version supported_formats split
    expect(extractMinPackFormat({ pack_format: 15, supported_formats: [15, 34] })).toBe(15);
    const j2j112 = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 3, description: '1.12' } })),
        'assets/minecraft/textures/gui/icons.png': encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4)),
        'assets/minecraft/textures/gui/container/villager.png': encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4)),
      })),
      'j2j-112.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    );
    const out112 = unzipSync(j2j112.buffer);
    expect(out112['assets/minecraft/textures/gui/sprites/hud/jump_bar_cooldown.png']).toBeUndefined();
    expect(out112['assets/minecraft/textures/gui/sprites/container/villager/out_of_stock.png']).toBeUndefined();

    const j2jMulti = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 15, supported_formats: [15, 34], description: 'Multi' } })),
        'assets/minecraft/textures/gui/icons.png': encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4)),
      })),
      'j2j-multi.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '26.3.0' }
    );
    expect(unzipSync(j2jMulti.buffer)['assets/minecraft/textures/gui/sprites/hud/heart/full.png']).toBeDefined();

    // 7. Wide hotbar_start_cap (64x64) does not blow up scale; non-182-multiple hotbar (256x32) slices cleanly
    const wideCap = encodeRgbaToPngSync(64, 64, new Uint8Array(64 * 64 * 4).fill(100));
    const b2jWideCap = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/ui/hotbar_start_cap.png': wideCap,
        'textures/ui/hotbar_0.png': modernHotbar0,
      })),
      'wide-cap.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    );
    expect(getPngDimensions(unzipSync(b2jWideCap.buffer)['assets/minecraft/textures/gui/sprites/hud/hotbar.png'])).toEqual({ width: 182, height: 22 });

    const hdHotbar = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'HD' } })),
        'assets/minecraft/textures/gui/sprites/hud/hotbar.png': encodeRgbaToPngSync(256, 32, new Uint8Array(256 * 32 * 4).fill(120)),
      })),
      'hd-hotbar.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const hdOut = unzipSync(hdHotbar.buffer);
    let totalW = getPngDimensions(hdOut['textures/ui/hotbar_start_cap.png'])!.width + getPngDimensions(hdOut['textures/ui/hotbar_end_cap.png'])!.width;
    for (let i = 0; i < 9; i++) {
      const d = getPngDimensions(hdOut[`textures/ui/hotbar_${i}.png`])!;
      expect(d.height).toBe(32);
      totalW += d.width;
    }
    expect(totalW).toBe(256);
  });

  it('decodes RLE, 15/16-bit, grayscale+alpha, color-mapped, and right-origin TGAs and rejects invalid headers', () => {
    const makeTgaHeader = (
      opts: {
        idLength?: number;
        colorMapType?: number;
        imageType: number;
        colorMapOrigin?: number;
        colorMapLength?: number;
        colorMapDepth?: number;
        width: number;
        height: number;
        pixelDepth: number;
        descriptor?: number;
      },
      payload: number[]
    ) => {
      const idLen = opts.idLength ?? 0;
      const out = new Uint8Array(18 + idLen + payload.length);
      out[0] = idLen;
      out[1] = opts.colorMapType ?? 0;
      out[2] = opts.imageType;
      const cmOrigin = opts.colorMapOrigin ?? 0;
      const cmLen = opts.colorMapLength ?? 0;
      out[3] = cmOrigin & 0xff; out[4] = (cmOrigin >> 8) & 0xff;
      out[5] = cmLen & 0xff; out[6] = (cmLen >> 8) & 0xff;
      out[7] = opts.colorMapDepth ?? 0;
      out[12] = opts.width & 0xff; out[13] = (opts.width >> 8) & 0xff;
      out[14] = opts.height & 0xff; out[15] = (opts.height >> 8) & 0xff;
      out[16] = opts.pixelDepth;
      out[17] = opts.descriptor ?? 0;
      out.set(payload, 18 + idLen);
      return out;
    };

    // 1. RLE 32-bit bottom-left origin + idLength=4 (RLE packet + raw packet)
    const rle32 = makeTgaHeader(
      { idLength: 4, imageType: 10, width: 2, height: 2, pixelDepth: 32, descriptor: 0x08 },
      [
        0x81, 10, 20, 30, 255, // bottom row: 2x RGBA(30,20,10,255)
        0x01, 40, 50, 60, 128, 70, 80, 90, 255, // top row: RGBA(60,50,40,128), RGBA(90,80,70,255)
      ]
    );
    const pngFromRle = convertTgaToPng(rle32);
    expect(pngFromRle).not.toBeNull();
    const decodedRle = decodePngToRgbaSync(pngFromRle!)!;
    expect(Array.from(decodedRle.rgba)).toEqual([
      60, 50, 40, 128, 90, 80, 70, 255,
      30, 20, 10, 255, 30, 20, 10, 255,
    ]);

    // 2. 24-bit top-right origin (descriptor=0x30)
    const tga24Right = makeTgaHeader(
      { imageType: 2, width: 2, height: 1, pixelDepth: 24, descriptor: 0x30 },
      [1, 2, 3, 4, 5, 6]
    );
    expect(Array.from(decodeTgaToRgba(tga24Right)!.rgba)).toEqual([6, 5, 4, 255, 3, 2, 1, 255]);

    // 3. 15-bit true-color (pixelDepth=15) & 16-bit ARGB1555 (alphaBits=1) vs XRGB1555 (alphaBits=0)
    const pxRedTransparent = 0x7c00; // A=0, R=31, G=0, B=0
    const pxGreenOpaque = 0x83e0; // A=1, R=0, G=31, B=0
    const tga15 = makeTgaHeader(
      { imageType: 2, width: 2, height: 1, pixelDepth: 15, descriptor: 0x20 },
      [pxRedTransparent & 0xff, pxRedTransparent >> 8, pxGreenOpaque & 0xff, pxGreenOpaque >> 8]
    );
    expect(Array.from(decodeTgaToRgba(tga15)!.rgba)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);

    const tga16Argb = makeTgaHeader(
      { imageType: 2, width: 2, height: 1, pixelDepth: 16, descriptor: 0x21 },
      [pxRedTransparent & 0xff, pxRedTransparent >> 8, pxGreenOpaque & 0xff, pxGreenOpaque >> 8]
    );
    expect(Array.from(decodeTgaToRgba(tga16Argb)!.rgba)).toEqual([255, 0, 0, 0, 0, 255, 0, 255]);

    const tga16Xrgb = makeTgaHeader(
      { imageType: 2, width: 1, height: 1, pixelDepth: 16, descriptor: 0x20 },
      [pxRedTransparent & 0xff, pxRedTransparent >> 8]
    );
    expect(Array.from(decodeTgaToRgba(tga16Xrgb)!.rgba)).toEqual([255, 0, 0, 255]);

    // 4. 8-bit grayscale & 16-bit grayscale+alpha (uncompressed Type 3 & RLE Type 11)
    const gray8 = makeTgaHeader(
      { imageType: 3, width: 2, height: 1, pixelDepth: 8, descriptor: 0x20 },
      [10, 200]
    );
    expect(Array.from(decodeTgaToRgba(gray8)!.rgba)).toEqual([10, 10, 10, 255, 200, 200, 200, 255]);

    const gray16Rle = makeTgaHeader(
      { imageType: 11, width: 2, height: 1, pixelDepth: 16, descriptor: 0x20 },
      [0x01, 255, 0, 128, 255]
    );
    expect(Array.from(decodeTgaToRgba(gray16Rle)!.rgba)).toEqual([255, 255, 255, 0, 128, 128, 128, 255]);

    // 5. Color-mapped Type 1 & RLE Type 9 with colorMapOrigin > 0 and 16-bit ARGB1555 palette
    const cmapRle = makeTgaHeader(
      {
        colorMapType: 1,
        imageType: 9,
        colorMapOrigin: 1,
        colorMapLength: 2,
        colorMapDepth: 16,
        width: 2,
        height: 1,
        pixelDepth: 8,
        descriptor: 0x21,
      },
      [
        pxRedTransparent & 0xff, pxRedTransparent >> 8,
        pxGreenOpaque & 0xff, pxGreenOpaque >> 8,
        0x01, 1, 2,
      ]
    );
    expect(Array.from(decodeTgaToRgba(cmapRle)!.rgba)).toEqual([255, 0, 0, 0, 0, 255, 0, 255]);

    // 6. Invalid / truncated TGAs return null
    expect(decodeTgaToRgba(rle32.subarray(0, rle32.length - 1))).toBeNull();
    expect(decodeTgaToRgba(makeTgaHeader({ colorMapType: 2, imageType: 2, width: 1, height: 1, pixelDepth: 32 }, [0, 0, 0, 255]))).toBeNull();
    expect(decodeTgaToRgba(makeTgaHeader({ imageType: 2, width: 1, height: 1, pixelDepth: 12 }, [0, 0]))).toBeNull();
    expect(decodeTgaToRgba(makeTgaHeader({ imageType: 3, width: 1, height: 1, pixelDepth: 24 }, [0, 0, 0]))).toBeNull();
    expect(decodeTgaToRgba(makeTgaHeader({ colorMapType: 1, imageType: 1, colorMapLength: 1, colorMapDepth: 8, width: 1, height: 1, pixelDepth: 8 }, [0, 0]))).toBeNull();
  });

  it('keeps TGAs in bedrock-to-bedrock, converts PBR .tga automatically, supports .TGA, and deduplicates PNG/TGA pairs', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'TgaTest', description: 'T', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));
    const tga16 = encodeRgbaToTgaSync(16, 16, new Uint8Array(16 * 16 * 4).fill(90));
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(210));

    // 1. bedrock-to-bedrock preserves .tga without converting to .png
    const b2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/grass_side.tga': tga16,
        'textures/blocks/leaves_oak.tga': tga16,
      })),
      'b2b-tga.mcpack',
      { ...baseOptions, direction: 'bedrock-to-bedrock' }
    );
    const b2bOut = unzipSync(b2b.buffer);
    expect(b2bOut['textures/blocks/grass_side.tga']).toBeDefined();
    expect(b2bOut['textures/blocks/grass_side.png']).toBeUndefined();
    expect(b2bOut['textures/blocks/leaves_oak.tga']).toBeDefined();
    expect(b2bOut['textures/blocks/leaves_oak.png']).toBeUndefined();

    // 2. bedrock-to-java converts PBR .tga automatically when enablePbrConversion: true, and interlaced MER PNG returns null
    const b2jPbrTga = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/stone.png': png16,
        'textures/blocks/stone_mer.tga': tga16,
        'textures/blocks/stone_normal.tga': tga16,
      })),
      'b2j-pbr-tga.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', enablePbrConversion: true }
    );
    const pbrTgaOut = unzipSync(b2jPbrTga.buffer);
    expect(pbrTgaOut['assets/minecraft/textures/block/stone_s.png']).toBeDefined();
    expect(pbrTgaOut['assets/minecraft/textures/block/stone_n.png']).toBeDefined();

    const interlacedPng = new Uint8Array(png16);
    interlacedPng[28] = 1; // IHDR interlace = Adam7
    expect(await convertBedrockMerToLabPbrSpec(interlacedPng)).toBeNull();

    // 3. Uppercase .TGA in block, pack_icon, and panorama
    const b2jUpper = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/custom_ore.TGA': tga16,
        'pack_icon.TGA': tga16,
        'textures/ui/panorama_0.TGA': tga16,
      })),
      'b2j-upper.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java' }
    );
    const upperOut = unzipSync(b2jUpper.buffer);
    expect(getPngDimensions(upperOut['assets/minecraft/textures/block/custom_ore.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(upperOut['pack.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(upperOut['assets/minecraft/textures/gui/title/background/panorama_0.png'])).toEqual({ width: 16, height: 16 });

    // 4. PNG wins over TGA regardless of ZIP order, without double-counting convertedCount
    const flameTga = encodeRgbaToTgaSync(14, 14, new Uint8Array(14 * 14 * 4).fill(50));
    const flamePng = encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(220));
    for (const pair of [
      {
        'manifest.json': manifest,
        'textures/blocks/custom_pair.tga': tga16,
        'textures/blocks/custom_pair.png': png16,
        'textures/ui/flame_full_image.tga': flameTga,
        'textures/ui/flame_full_image.png': flamePng,
      },
      {
        'manifest.json': manifest,
        'textures/blocks/custom_pair.png': png16,
        'textures/blocks/custom_pair.tga': tga16,
        'textures/ui/flame_full_image.png': flamePng,
        'textures/ui/flame_full_image.tga': flameTga,
      },
    ]) {
      const res = await convertBuffer(toArrayBuffer(zipSync(pair)), 'pair.mcpack', {
        ...baseOptions,
        direction: 'bedrock-to-java',
        javaVersionId: '1.21.4',
        });
      const out = unzipSync(res.buffer);
      expect(decodePngToRgbaSync(out['assets/minecraft/textures/block/custom_pair.png'])!.rgba[0]).toBe(210);
      expect(decodePngToRgbaSync(out['assets/minecraft/textures/gui/sprites/container/furnace/lit_progress.png'])!.rgba[0]).toBe(220);
      // manifest -> pack.mcmeta (1) + custom_pair (1) + furnace/blast_furnace/smoker lit_progress (3) = 5
      expect(res.report.convertedCount).toBe(5);
    }
  });

  it('handles Java <-> Bedrock animation edge cases (blend_frames, GCD, arrays, replicate, conduit, 8x256, non-block exclusion, 1.8 fire)', async () => {
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(100));
    const png16x32 = encodeRgbaToPngSync(16, 32, new Uint8Array(16 * 32 * 4).fill(100));
    const png16x64 = encodeRgbaToPngSync(16, 64, new Uint8Array(16 * 64 * 4).fill(100));

    // 1. Java -> Bedrock: blend_frames, empty frames, GCD, array tiles, replicate/quad, non-block exclusion, 1.8 fire_layer_0
    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'AnimJ2B' } })),
        'assets/minecraft/textures/block/stone.png': png16x32,
        'assets/minecraft/textures/block/stone.png.mcmeta': strToU8('\uFEFF' + JSON.stringify({ animation: { frametime: 2, frames: [] } })),
        'assets/minecraft/textures/block/prismarine.png': png16x64,
        'assets/minecraft/textures/block/prismarine.png.mcmeta': strToU8(JSON.stringify({
          animation: {
            frametime: 200,
            interpolate: true,
            frames: [{ index: 0, time: 400 }, ...Array.from({ length: 21 }, (_, i) => i % 4)],
          },
        })),
        'assets/minecraft/textures/block/water_flow.png': png16x64,
        'assets/minecraft/textures/block/water_flow.png.mcmeta': strToU8(JSON.stringify({ animation: {} })),
        'assets/minecraft/textures/block/respawn_anchor_top.png': png16x64,
        'assets/minecraft/textures/block/respawn_anchor_top.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 4 } })),
        'assets/minecraft/textures/block/sculk_shrieker_can_summon_inner_top.png': png16x32,
        'assets/minecraft/textures/block/sculk_shrieker_can_summon_inner_top.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 3, interpolate: true } })),
        'assets/minecraft/textures/block/lava_still.png': png16x32,
        'assets/minecraft/textures/block/lava_still_s.png': png16x32,
        'assets/minecraft/textures/block/lava_still_s.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 2 } })),
        'assets/minecraft/textures/block/lantern.png': png16x32,
        'assets/minecraft/textures/item/lantern.png': png16x32,
        'assets/minecraft/textures/item/lantern.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 9 } })),
        'assets/minecraft/textures/entity/conduit/wind.png': encodeRgbaToPngSync(64, 704, new Uint8Array(64 * 704 * 4)),
        'assets/minecraft/textures/entity/conduit/wind.png.mcmeta': strToU8(JSON.stringify({ animation: { frametime: 3, height: 32 } })),
      })),
      'anim-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const j2bOut = unzipSync(j2b.buffer);
    const flipbooks = JSON.parse(strFromU8(j2bOut['textures/flipbook_textures.json'])) as any[];
    const stoneFb = flipbooks.find(f => f.atlas_tile === 'stone');
    expect(stoneFb.blend_frames).toBe(false);
    expect(stoneFb.frames).toBeUndefined();

    const prismFb = flipbooks.find(f => f.atlas_tile === 'prismarine');
    expect(prismFb.blend_frames).toBe(true);
    expect(prismFb.ticks_per_frame).toBe(200);
    expect(prismFb.frames).toHaveLength(23);

    const waterFlowFb = flipbooks.find(f => f.atlas_tile === 'flowing_water_grey');
    expect(waterFlowFb.replicate).toBe(2);

    const anchorFbs = flipbooks.filter(f => f.atlas_tile === 'respawn_anchor_top');
    expect(anchorFbs.map(f => f.atlas_index)).toEqual([1, 2, 3, 4]);

    const shriekerFb = flipbooks.find(f => f.atlas_tile === 'sculk_shrieker_inner_top');
    expect(shriekerFb.atlas_index).toBe(1);

    expect(flipbooks.some(f => f.flipbook_texture.includes('items/lantern'))).toBe(false);
    expect(flipbooks.some(f => f.flipbook_texture.includes('lava_still_mer'))).toBe(false);
    expect(flipbooks.some(f => f.flipbook_texture.includes('conduit'))).toBe(false);

    const terrain = JSON.parse(strFromU8(j2bOut['textures/terrain_texture.json']));
    expect(Array.isArray(terrain.texture_data.prismarine.textures)).toBe(true);
    expect(terrain.texture_data.respawn_anchor_top.textures).toHaveLength(5);
    expect(terrain.texture_data.flowing_water_grey.quad).toBe(1);

    // 1.8 fire_layer_0
    const j18Out = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/textures/blocks/fire_layer_0.png': png16x32,
        'assets/minecraft/textures/blocks/fire_layer_0.png.mcmeta': strToU8(JSON.stringify({ animation: { frames: [1, 0] } })),
      })),
      'fire-1.8.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    )).buffer);
    expect(j18Out['textures/blocks/fire_0.png']).toBeDefined();
    expect(JSON.parse(strFromU8(j18Out['textures/flipbook_textures.json']))[0].atlas_tile).toBe('fire_0');

    // 2. Bedrock -> Java: BOM, .tga, blend_frames default, invalid ticks/frames, duplicate atlas_tile, conduit wind, 8x256 strip, PBR clamp
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'AnimB2J', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));
    const tga16x64 = encodeRgbaToTgaSync(16, 64, new Uint8Array(16 * 64 * 4).fill(150));
    const png8x256 = encodeRgbaToPngSync(8, 256, new Uint8Array(8 * 256 * 4).fill(120));
    const b2j = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/prismarine_rough.tga': tga16x64,
        'textures/blocks/respawn_anchor_top.png': png16x64,
        'textures/blocks/lava_still.png': png16x64,
        'textures/blocks/lava_still_mer.png': png16x32,
        'textures/blocks/stone.png': png8x256,
        'textures/blocks/conduit_wind_horizontal.png': encodeRgbaToPngSync(64, 704, new Uint8Array(64 * 704 * 4)),
        'textures/flipbook_textures.json': strToU8('\uFEFF' + JSON.stringify([
          { flipbook_texture: 'textures/blocks/prismarine_rough.tga', atlas_tile: 'prismarine', ticks_per_frame: 5 },
          { flipbook_texture: 'textures/blocks/respawn_anchor_top', atlas_tile: 'respawn_anchor_top', atlas_index: 1, ticks_per_frame: -3, frames: [0, 1.5, 2, 99], blend_frames: false },
          { flipbook_texture: 'textures/blocks/respawn_anchor_top', atlas_tile: 'respawn_anchor_top', atlas_index: 2, ticks_per_frame: 4 },
          { flipbook_texture: 'textures/blocks/lava_still', atlas_tile: 'still_lava', ticks_per_frame: 2, frames: [0, 1, 2, 3], blend_frames: false },
        ])),
      })),
      'anim-b2j.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enablePbrConversion: true }
    );
    const b2jOut = unzipSync(b2j.buffer);
    const prismMcmeta = JSON.parse(strFromU8(b2jOut['assets/minecraft/textures/block/prismarine.png.mcmeta']));
    expect(prismMcmeta.animation.frametime).toBe(5);
    expect(prismMcmeta.animation.interpolate).toBe(true);

    const anchorMcmeta = JSON.parse(strFromU8(b2jOut['assets/minecraft/textures/block/respawn_anchor_top.png.mcmeta']));
    expect(anchorMcmeta.animation.frametime).toBeUndefined();
    expect(anchorMcmeta.animation.interpolate).toBeUndefined();
    expect(anchorMcmeta.animation.frames).toEqual([0, 2]);

    const windMcmeta = JSON.parse(strFromU8(b2jOut['assets/minecraft/textures/entity/conduit/wind.png.mcmeta']));
    expect(windMcmeta.animation).toEqual({ frametime: 3, height: 32 });

    expect(getPngDimensions(b2jOut['assets/minecraft/textures/block/stone.png'])).toEqual({ width: 16, height: 512 });
    const lavaSpecMcmeta = JSON.parse(strFromU8(b2jOut['assets/minecraft/textures/block/lava_still_s.png.mcmeta']));
    expect(lavaSpecMcmeta.animation.frames).toEqual([0, 1]);

    // Malformed flipbook_textures.json reports invalid format
    const badFlipbook = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/stone.png': png16,
        'textures/flipbook_textures.json': strToU8('{not-valid-json'),
      })),
      'bad-fb.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java' }
    );
    expect(badFlipbook.report.details.some(d => d.reason === 'Invalid flipbook_textures.json format')).toBe(true);
  });

  it('converts compass, lodestone compass, recovery compass, and clock textures across Java and Bedrock', async () => {
    const makeFrame = (r: number, g: number, b: number) => {
      const rgba = new Uint8Array(16 * 16 * 4);
      for (let i = 0; i < 16 * 16; i++) {
        rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
      }
      return encodeRgbaToPngSync(16, 16, rgba);
    };

    const javaFiles: Record<string, Uint8Array> = {
      'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Dials' } })),
    };
    for (let i = 0; i < 32; i++) {
      javaFiles[`assets/minecraft/textures/item/compass_${String(i).padStart(2, '0')}.png`] = makeFrame(i * 7, 10, 20);
      if (i !== 5) {
        javaFiles[`assets/minecraft/textures/item/recovery_compass_${String(i).padStart(2, '0')}.png`] = makeFrame(20, i * 7, 200);
      }
    }
    for (let i = 0; i < 64; i++) {
      javaFiles[`assets/minecraft/textures/item/clock_${String(i).padStart(2, '0')}.png`] = makeFrame(10, 20, i * 3);
    }

    // 1. Java 1.21 -> Bedrock
    const j2b = await convertBuffer(toArrayBuffer(zipSync(javaFiles)), 'dials-j2b.zip', {
      ...baseOptions,
      direction: 'java-to-bedrock',
      bedrockVersionId: '1.21.50',
    });
    expect(j2b.report.errorCount).toBe(0);
    const bOut = unzipSync(j2b.buffer);
    expect(getPngDimensions(bOut['textures/items/compass_atlas.png'])).toEqual({ width: 16, height: 512 });
    expect(getPngDimensions(bOut['textures/items/compass_item.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(bOut['textures/items/lodestonecompass_atlas.png'])).toEqual({ width: 16, height: 512 });
    expect(getPngDimensions(bOut['textures/items/lodestonecompass_item.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(bOut['textures/items/recovery_compass_atlas.png'])).toEqual({ width: 16, height: 512 });
    expect(getPngDimensions(bOut['textures/items/recovery_compass_item.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(bOut['textures/items/watch_atlas.png'])).toEqual({ width: 16, height: 1024 });
    expect(getPngDimensions(bOut['textures/items/clock_item.png'])).toEqual({ width: 16, height: 16 });

    const itemTex = JSON.parse(strFromU8(bOut['textures/item_texture.json']));
    expect(itemTex.texture_data.compass_item.textures).toBe('textures/items/compass_item');
    expect(itemTex.texture_data.lodestonecompass_item.textures).toBe('textures/items/lodestonecompass_item');
    expect(itemTex.texture_data.recovery_compass.textures).toBe('textures/items/recovery_compass_item');
    expect(itemTex.texture_data.clock_item.textures).toBe('textures/items/clock_item');

    const compassAtlas = decodePngToRgbaSync(bOut['textures/items/compass_atlas.png'])!;
    expect(compassAtlas.rgba[(16 * 16 * 16) * 4]).toBe(16 * 7);

    // 2. Bedrock -> Java 1.21 (including .tga compass_atlas) and Java 1.8
    const compassAtlasDecoded = decodePngToRgbaSync(bOut['textures/items/compass_atlas.png'])!;
    const compassAtlasTga = encodeRgbaToTgaSync(16, 512, compassAtlasDecoded.rgba);
    const b2jModern = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': bOut['manifest.json'],
        'textures/items/compass_atlas.tga': compassAtlasTga,
        'textures/items/compass_item.png': bOut['textures/items/compass_item.png'],
        'textures/items/recovery_compass_atlas.png': bOut['textures/items/recovery_compass_atlas.png'],
        'textures/items/watch_atlas.png': bOut['textures/items/watch_atlas.png'],
      })),
      'dials-b2j.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    );
    const jModOut = unzipSync(b2jModern.buffer);
    expect(getPngDimensions(jModOut['assets/minecraft/textures/item/compass_00.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(jModOut['assets/minecraft/textures/item/compass_31.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(jModOut['assets/minecraft/textures/item/recovery_compass_16.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(jModOut['assets/minecraft/textures/item/clock_63.png'])).toEqual({ width: 16, height: 16 });
    expect(jModOut['assets/minecraft/textures/item/compass_item.png']).toBeUndefined();
    expect(jModOut['assets/minecraft/textures/item/compass_00.png.mcmeta']).toBeUndefined();

    const b2jLegacy = await convertBuffer(toArrayBuffer(j2b.buffer), 'dials-b2j-1.8.mcpack', {
      ...baseOptions,
      direction: 'bedrock-to-java',
      javaVersionId: '1.8.0',
    });
    const jLegOut = unzipSync(b2jLegacy.buffer);
    expect(getPngDimensions(jLegOut['assets/minecraft/textures/items/compass.png'])).toEqual({ width: 16, height: 512 });
    expect(getPngDimensions(jLegOut['assets/minecraft/textures/items/clock.png'])).toEqual({ width: 16, height: 1024 });
    expect(jLegOut['assets/minecraft/textures/items/compass.png.mcmeta']).toBeUndefined();
    expect(jLegOut['assets/minecraft/textures/items/recovery_compass_00.png']).toBeUndefined();

    // 3. Java 1.8 -> Java 1.21 and back
    const j2jUp = await convertBuffer(toArrayBuffer(b2jLegacy.buffer), 'dials-1.8-to-1.21.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '1.21.4',
    });
    const jUpOut = unzipSync(j2jUp.buffer);
    expect(getPngDimensions(jUpOut['assets/minecraft/textures/item/compass_31.png'])).toEqual({ width: 16, height: 16 });
    expect(getPngDimensions(jUpOut['assets/minecraft/textures/item/clock_63.png'])).toEqual({ width: 16, height: 16 });

    const j2jDown = await convertBuffer(toArrayBuffer(j2jUp.buffer), 'dials-1.21-to-1.8.zip', {
      ...baseOptions,
      direction: 'java-to-java',
      javaVersionId: '1.8.0',
    });
    const jDownOut = unzipSync(j2jDown.buffer);
    expect(getPngDimensions(jDownOut['assets/minecraft/textures/items/compass.png'])).toEqual({ width: 16, height: 512 });
    expect(getPngDimensions(jDownOut['assets/minecraft/textures/items/clock.png'])).toEqual({ width: 16, height: 1024 });
  });

  it('converts language files accurately across Java, Bedrock, and legacy versions', async () => {
    // 1. Java 1.21 -> Bedrock: ll_CC casing, accurate key mapping, realms dedupe, BOM, invalid JSON, deprecated.json, newlines, spaces
    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'LangJ2B' } })),
        'assets/minecraft/lang/en_us.json': strToU8('\uFEFF' + JSON.stringify({
          'item.minecraft.apple': 'Red Apple',
          'block.minecraft.sculk': 'Sculk Block',
          'gui.done': 'Done!',
          'gui.cancel': 'Cancel!',
          'custom.multiline': 'Line 1\nLine 2',
          'menu.modded': ' (Modded)',
          'shared.key': 'From Minecraft',
        })),
        'assets/realms/lang/en_us.json': strToU8(JSON.stringify({
          'shared.key': 'From Realms',
        })),
        'assets/minecraft/lang/ja_jp.json': strToU8(JSON.stringify({
          'item.minecraft.apple': 'リンゴ',
        })),
        'assets/minecraft/lang/deprecated.json': strToU8(JSON.stringify({
          removed: ['old.key'],
          renamed: { a: 'b' },
        })),
        'assets/minecraft/lang/fr_fr.json': strToU8('{invalid json'),
      })),
      'lang-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const bOut = unzipSync(j2b.buffer);
    expect(bOut['texts/en_US.lang']).toBeDefined();
    expect(bOut['texts/ja_JP.lang']).toBeDefined();
    expect(bOut['texts/deprecated.lang']).toBeUndefined();
    expect(bOut['texts/fr_FR.lang']).toBeUndefined();
    expect(JSON.parse(strFromU8(bOut['texts/languages.json']))).toEqual(['en_US', 'ja_JP']);

    const enLang = strFromU8(bOut['texts/en_US.lang']);
    expect(enLang).toContain('item.apple.name=Red Apple\n');
    expect(enLang).toContain('tile.sculk.name=Sculk Block\n');
    expect(enLang).toContain('gui.done=Done!\n');
    expect(enLang).toContain('gui.cancel=Cancel!\n');
    expect(enLang).toContain('custom.multiline=Line 1\\nLine 2\n');
    expect(enLang).toContain('menu.modded= (Modded)\n');
    expect(enLang.match(/^shared\.key=/gm)).toHaveLength(1);
    expect(j2b.report.details.some(d => d.reason === 'Java-only deprecated translation metadata')).toBe(true);
    expect(j2b.report.details.some(d => d.reason === 'Invalid language JSON format')).toBe(true);

    // 2. Java 1.8 (.lang) -> Bedrock
    const j18ToB = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/lang/en_US.lang': strToU8('tile.stone.stone.name=Legacy Stone\n'),
      })),
      'lang-1.8.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    )).buffer);
    expect(strFromU8(j18ToB['texts/en_US.lang'])).toContain('tile.stone.stone.name=Legacy Stone');

    // 3. Bedrock -> Java 1.21 (.json), Java 1.12 (en_us.lang), Java 1.8 (en_US.lang)
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'LangB2J', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));
    const bedrockLangBytes = strToU8(
      '\uFEFF## Comment\n' +
      'item.apple.name=Crisp Apple\t## translator note\n' +
      'filled_map.id=Id #%s\n' +
      'custom.lines=First\\nSecond~LINEBREAK~Third\n' +
      'menu.modded= (Modded)\n' +
      'item.minecraft.smithing_template.upgrade=Upgrade: \n' +
      '=empty_key_ignored\n'
    );
    const b2jModern = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'texts/en_US.lang': bedrockLangBytes })),
      'lang-b2j-modern.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    const j21Lang = JSON.parse(strFromU8(b2jModern['assets/minecraft/lang/en_us.json']));
    expect(j21Lang['item.minecraft.apple']).toBe('Crisp Apple');
    expect(j21Lang['filled_map.id']).toBe('Id #%s');
    expect(j21Lang['custom.lines']).toBe('First\nSecond\nThird');
    expect(j21Lang['menu.modded']).toBe(' (Modded)');
    expect(j21Lang['item.minecraft.smithing_template.upgrade']).toBe('Upgrade: ');
    expect(j21Lang['']).toBeUndefined();

    const b2j112 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'texts/en_US.lang': bedrockLangBytes })),
      'lang-b2j-112.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.12.2' }
    )).buffer);
    expect(b2j112['assets/minecraft/lang/en_us.lang']).toBeDefined();

    const b2j18 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'texts/en_US.lang': bedrockLangBytes })),
      'lang-b2j-18.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    expect(b2j18['assets/minecraft/lang/en_US.lang']).toBeDefined();

    // 4. Java -> Java round-trip: 1.8 -> 1.12 -> 1.21 -> 1.8
    const j18To12 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/lang/en_US.lang': strToU8('item.apple.name=Java Apple\n'),
      })),
      'j-1.8.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.12.2' }
    )).buffer);
    expect(j18To12['assets/minecraft/lang/en_us.lang']).toBeDefined();

    const j12To21 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 3, description: '1.12' } })),
        'assets/minecraft/lang/en_us.lang': j18To12['assets/minecraft/lang/en_us.lang'],
      })),
      'j-1.12.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    expect(JSON.parse(strFromU8(j12To21['assets/minecraft/lang/en_us.json']))['item.minecraft.apple']).toBe('Java Apple');

    const j21To18 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: '1.21' } })),
        'assets/minecraft/lang/en_us.json': j12To21['assets/minecraft/lang/en_us.json'],
      })),
      'j-1.21.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    expect(strFromU8(j21To18['assets/minecraft/lang/en_US.lang'])).toContain('item.apple.name=Java Apple');
  });

  it('converts sound definitions accurately across Java, Bedrock, and legacy versions', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'SoundTest', description: 'S', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));
    const ogg = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);

    // 1. Java -> Bedrock: routes sounds.json, strips minecraft:/./ext/Java-only fields, expands type:event, infers categories, handles collisions & Bedrock <1.14
    const j2b = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'SoundsJ2B' } })),
        'assets/minecraft/sounds/extra_sounds.json': strToU8('{"keep":true}'),
        'assets/minecraft/sounds.json': strToU8('\uFEFF' + JSON.stringify({
          'block.anvil.destroy': { sounds: ['dig/anvil_fake'] },
          'block.stone.break': {
            category: 'master',
            sounds: [
              'minecraft:./dig\\stone1.ogg',
              'othermod:custom/ignore',
              '../escape',
              { name: 'minecraft:dig/stone2', volume: 0.8, pitch: 1.1, weight: 2, stream: false, preload: true, attenuation_distance: 48 },
            ],
          },
          'ui.button.click': {
            sounds: [{ name: 'minecraft:random/click', type: 'sound' }],
          },
          'music.game': {
            sounds: [{ name: 'music/game/calm1', stream: true }],
          },
          'music_disc.cat': {
            sounds: ['records/cat'],
          },
          'weather.rain': {
            sounds: ['ambient/weather/rain1'],
          },
          'ambient.cave': {
            sounds: ['ambient/cave/cave1'],
          },
          'entity.zombie.ambient': {
            sounds: ['mob/zombie/say1'],
          },
          'entity.player.hurt': {
            sounds: ['damage/hit1'],
          },
          'item.bucket.fill': {
            sounds: ['liquid/fill1'],
          },
          'item.honey_bottle.drink': {
            sounds: ['item/honey/drink1'],
          },
          'custom.event_ref': {
            sounds: [{ name: 'minecraft:entity.player.hurt', type: 'event', volume: 0.5, pitch: 1.5 }],
          },
          'custom.cycle_a': {
            sounds: [{ name: 'custom.cycle_b', type: 'event' }],
          },
          'custom.cycle_b': {
            sounds: [{ name: 'custom.cycle_a', type: 'event' }],
          },
          'custom.external_ref': {
            sounds: [{ name: 'missing.event', type: 'event' }],
          },
          'custom.empty': {
            sounds: [],
          },
        })),
      })),
      'sounds-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.21.50' }
    );
    const bOut = unzipSync(j2b.buffer);
    expect(bOut['sounds/extra_sounds.json']).toBeDefined();
    expect(strFromU8(bOut['sounds/extra_sounds.json'])).toBe('{"keep":true}');
    const bDefs = JSON.parse(strFromU8(bOut['sounds/sound_definitions.json']));
    expect(bDefs.format_version).toBe('1.14.0');
    const sd = bDefs.sound_definitions;

    // Primary block.stone.break wins dig.stone over block.anvil.destroy
    expect(sd['dig.stone'].category).toBe('block');
    expect(sd['dig.stone'].max_distance).toBe(48);
    expect(sd['dig.stone'].sounds).toEqual([
      'sounds/dig/stone1',
      { name: 'sounds/dig/stone2', volume: 0.8, pitch: 1.1, weight: 2, stream: false },
    ]);
    expect(sd['random.click'].category).toBe('ui');
    expect(sd['music.game'].category).toBe('music');
    expect(sd['record.cat'].category).toBe('record');
    expect(sd['ambient.weather.rain'].category).toBe('weather');
    expect(sd['ambient.cave'].category).toBe('ambient');
    expect(sd['mob.zombie.say'].category).toBe('hostile');
    expect(sd['game.player.hurt'].category).toBe('player');
    expect(sd['bucket.fill_water'].category).toBe('bucket');
    expect(sd['random.drink_honey'].category).toBe('bottle');
    expect(sd['custom.event_ref'].sounds).toEqual([{ name: 'sounds/damage/hit1', volume: 0.5, pitch: 1.5 }]);
    expect(sd['custom.cycle_a']).toBeUndefined();
    expect(sd['custom.external_ref']).toBeUndefined();
    expect(sd['custom.empty']).toBeUndefined();

    // Bedrock < 1.14.0 emits flat root format; Java 1.8 & 1.12 event names upgrade
    const j18ToB112 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/sounds.json': strToU8(JSON.stringify({
          'records.cat': { category: 'record', sounds: ['records/cat'] },
          'gui.button.press': { category: 'master', sounds: ['random/click'] },
        })),
      })),
      'sounds-1.8-b112.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.12.0' }
    )).buffer);
    const flatSd = JSON.parse(strFromU8(j18ToB112['sounds/sound_definitions.json']));
    expect(flatSd.format_version).toBeUndefined();
    expect(flatSd['record.cat'].category).toBe('record');
    expect(flatSd['random.click'].category).toBe('ui');

    // Invalid sounds.json & disabled sound conversion
    const badJ2B = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Bad' } })),
        'assets/minecraft/sounds.json': strToU8('{invalid json'),
      })),
      'bad-sounds.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    expect(unzipSync(badJ2B.buffer)['sounds/sound_definitions.json']).toBeUndefined();
    expect(badJ2B.report.details.some(d => d.reason === 'Invalid sounds.json format')).toBe(true);

    // 2. Bedrock -> Java: BOM, JSONC comments/trailing commas, replace:true, no load_on_low_memory->stream bug, canonical reverse mappings, Java 1.8/1.12
    const bedrockSoundDefs = '\uFEFF{\n' +
      '  "format_version": "1.14.0",\n' +
      '  "sound_definitions": {\n' +
      '    // Comment with // inside\n' +
      '    "dig.stone": { "category": "block", "max_distance": 64, "sounds": ["sounds/dig/stone1.ogg", "../evil"] },\n' +
      '    "dig.grass": { "category": "block", "sounds": ["sounds/dig/grass1"] },\n' +
      '    "random.click": { "category": "ui", "sounds": ["sounds/random/click"] },\n' +
      '    "random.orb": { "category": "player", "sounds": ["sounds/random/orb"] },\n' +
      '    "random.explode": { "category": "block", "sounds": ["sounds/random/explode1"] },\n' +
      '    "game.player.hurt": { "category": "player", "sounds": ["sounds/damage/hit1"] },\n' +
      '    "mob.zombie.say": { "category": "hostile", "sounds": ["sounds/mob/zombie/say1"] },\n' +
      '    "note.harp": { "category": "block", "sounds": ["sounds/note/harp"] },\n' +
      '    "record.cat": { "category": "record", "sounds": [{ "name": "sounds/music/game/records/cat", "stream": true, "load_on_low_memory": false, "volume": [0.8, 1.2], "weight": 2 }] },\n' +
      '    "custom.lowmem": { "category": "neutral", "sounds": [{ "name": "sounds/custom/a", "load_on_low_memory": true }], },\n' +
      '  }\n' +
      '}\n';

    const b2jModern = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/Sound_Definitions.json': strToU8(bedrockSoundDefs),
        'sounds/Mob/Custom.OGG': ogg,
      })),
      'sounds-b2j.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    expect(b2jModern['assets/minecraft/sounds/mob/custom.ogg']).toBeDefined();
    const jSounds = JSON.parse(strFromU8(b2jModern['assets/minecraft/sounds.json']));
    expect(jSounds['block.stone.break']).toEqual({
      replace: true,
      sounds: [{ name: 'dig/stone1', attenuation_distance: 64 }],
    });
    expect(jSounds['block.grass.break'].replace).toBe(true);
    expect(jSounds['ui.button.click'].replace).toBe(true);
    expect(jSounds['entity.experience_orb.pickup'].replace).toBe(true);
    expect(jSounds['entity.generic.explode'].replace).toBe(true);
    expect(jSounds['entity.player.hurt'].replace).toBe(true);
    expect(jSounds['entity.zombie.ambient'].replace).toBe(true);
    expect(jSounds['entity.parrot.imitate.drowned']).toBeUndefined();
    expect(jSounds['block.note_block.harp'].replace).toBe(true);
    expect(jSounds['music_disc.cat'].sounds[0]).toEqual({
      name: 'music/game/records/cat',
      volume: 1,
      weight: 2,
      stream: true,
    });
    expect(jSounds['custom.lowmem'].sounds[0].stream).toBeUndefined();

    // Bedrock -> Java 1.8 & Java 1.12
    const b2j18 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'sounds/sound_definitions.json': strToU8(bedrockSoundDefs) })),
      'sounds-b2j-1.8.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    const j18Sounds = JSON.parse(strFromU8(b2j18['assets/minecraft/sounds.json']));
    expect(j18Sounds['dig.stone'].category).toBe('block');
    expect(j18Sounds['records.cat'].category).toBe('record');
    expect(j18Sounds['random.click'].category).toBe('master');

    const b2j112 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'sounds/sound_definitions.json': strToU8(bedrockSoundDefs) })),
      'sounds-b2j-1.12.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.12.2' }
    )).buffer);
    const j112Sounds = JSON.parse(strFromU8(b2j112['assets/minecraft/sounds.json']));
    expect(j112Sounds['record.cat']).toBeDefined();
    expect(j112Sounds['block.note.harp']).toBeDefined();

    // 3. Java -> Java round-trip: 1.8 -> 1.12 -> 1.21 -> 1.8
    const j18To112 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 1, description: '1.8' } })),
        'assets/minecraft/sounds.json': strToU8(JSON.stringify({
          'records.cat': { category: 'record', sounds: ['records/cat'] },
          'dig.stone': { category: 'block', sounds: ['dig/stone1'] },
          'custom.ref': { category: 'neutral', sounds: [{ name: 'records.cat', type: 'event' }] },
        })),
      })),
      'j-1.8.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.12.2' }
    )).buffer);
    const s112 = JSON.parse(strFromU8(j18To112['assets/minecraft/sounds.json']));
    expect(s112['record.cat']).toBeDefined();
    expect(s112['record.cat'].category).toBeUndefined();
    expect(s112['block.stone.break']).toBeDefined();
    expect(s112['custom.ref'].sounds[0].name).toBe('record.cat');

    const j112To121 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 3, description: '1.12' } })),
        'assets/minecraft/sounds.json': j18To112['assets/minecraft/sounds.json'],
      })),
      'j-1.12.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    const s121 = JSON.parse(strFromU8(j112To121['assets/minecraft/sounds.json']));
    expect(s121['music_disc.cat']).toBeDefined();
    expect(s121['custom.ref'].sounds[0].name).toBe('music_disc.cat');

    const j121To18 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: '1.21' } })),
        'assets/minecraft/sounds.json': j112To121['assets/minecraft/sounds.json'],
      })),
      'j-1.21.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    const sBack18 = JSON.parse(strFromU8(j121To18['assets/minecraft/sounds.json']));
    expect(sBack18['records.cat'].category).toBe('record');
    expect(sBack18['dig.stone'].category).toBe('block');
    expect(sBack18['custom.ref'].sounds[0].name).toBe('records.cat');

    // 4. Audit follow-up: uppercase keys/refs, hostile/bottle/block categories, audio lowercasing, unclosed /*, pre-1.14 flat B2J, Infinity weight, disabled flag, 1.21->1.8 collision/minecraft:/ui.button.click
    const j2bExtra = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Extra' } })),
        'assets/minecraft/sounds/Mob/Say1.OGG': ogg,
        'assets/minecraft/sounds.json': strToU8(JSON.stringify({
          'Block.Stone.Break': { sounds: ['dig/stone_win'] },
          'block.anvil.destroy': { sounds: ['dig/anvil_lose'] },
          'MINECRAFT:Custom.Base': { sounds: ['custom/base1'] },
          'custom.ref_upper': { sounds: [{ name: 'custom.base', type: 'event' }] },
          'entity.enderman.ambient': { sounds: ['mob/enderman/idle1'] },
          'entity.spider.ambient': { sounds: ['mob/spider/say1'] },
          'entity.piglin.ambient': { sounds: ['mob/piglin/idle1'] },
          'entity.experience_bottle.throw': { sounds: ['random/bow'] },
          'entity.generic.explode': { sounds: ['random/explode1'] },
        })),
      })),
      'extra-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const extraOut = unzipSync(j2bExtra.buffer);
    expect(extraOut['sounds/mob/say1.ogg']).toBeDefined();
    const extraSd = JSON.parse(strFromU8(extraOut['sounds/sound_definitions.json'])).sound_definitions;
    expect(extraSd['dig.stone'].sounds).toEqual(['sounds/dig/stone_win']);
    expect(extraSd['custom.ref_upper'].sounds).toEqual(['sounds/custom/base1']);
    expect(extraSd['mob.endermen.idle'].category).toBe('hostile');
    expect(extraSd['mob.spider.say'].category).toBe('hostile');
    expect(extraSd['mob.piglin.ambient'].category).toBe('hostile');
    expect(extraSd['random.bow'].category).toBe('player');
    expect(extraSd['random.explode'].category).toBe('block');

    const unclosedComment = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Unclosed' } })),
        'assets/minecraft/sounds.json': strToU8('{"a":{"sounds":["a"]}} /* unclosed'),
      })),
      'unclosed.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    expect(unclosedComment.report.details.some(d => d.reason === 'Invalid sounds.json format')).toBe(true);

    const flatB2J = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/Mob/Custom.OGG': ogg,
        'sounds/sound_definitions.json': strToU8(JSON.stringify({
          'mob.horse.donkey.idle': { category: 'neutral', sounds: ['sounds/mob/horse/donkey/idle1'] },
          'mob.zombie.wood': { category: 'hostile', sounds: ['sounds/mob/zombie/wood1'] },
          'mob.blaze.breathe': { category: 'hostile', sounds: [{ name: 'sounds/mob/blaze/breathe1', weight: Infinity }] },
        })),
      })),
      'flat-b2j-1.8.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    expect(flatB2J['assets/minecraft/sounds/mob/custom.ogg']).toBeDefined();
    const flatB2JModern = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/sound_definitions.json': strToU8(JSON.stringify({
          'mob.horse.donkey.idle': { category: 'neutral', sounds: ['sounds/mob/horse/donkey/idle1'] },
          'mob.zombie.wood': { category: 'hostile', sounds: ['sounds/mob/zombie/wood1'] },
          'mob.blaze.breathe': { category: 'hostile', sounds: [{ name: 'sounds/mob/blaze/breathe1', weight: Infinity }] },
        })),
      })),
      'flat-b2j-modern.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    const flatModernJson = JSON.parse(strFromU8(flatB2JModern['assets/minecraft/sounds.json']));
    expect(flatModernJson['entity.donkey.ambient']).toBeDefined();
    expect(flatModernJson['entity.zombie.attack_wooden_door']).toBeDefined();
    expect(flatModernJson['entity.blaze.ambient'].sounds[0]).toEqual({ name: 'mob/blaze/breathe1' });

    const badB2J = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'sounds/sound_definitions.json': strToU8('{"format_version":"1.14.0","sound_definitions":[]}'),
      })),
      'bad-b2j.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java' }
    );
    expect(badB2J.report.details.some(d => d.reason === 'Invalid sound_definitions.json format')).toBe(true);

    const j2jDown18 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: '1.21' } })),
        'assets/minecraft/sounds.json': strToU8(JSON.stringify({
          'block.stone.break': { sounds: ['minecraft:dig/stone_win'] },
          'block.metal.break': { sounds: ['minecraft:dig/metal_lose'] },
          'ui.button.click': { sounds: ['minecraft:random/click'] },
          'entity.zombified_piglin.ambient': { sounds: ['minecraft:mob/zpiglin/say1'] },
        })),
      })),
      'down-1.8.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.8.0' }
    )).buffer);
    const sDown18 = JSON.parse(strFromU8(j2jDown18['assets/minecraft/sounds.json']));
    expect(sDown18['dig.stone'].sounds).toEqual(['dig/stone_win']);
    expect(sDown18['gui.button.press'].category).toBe('master');
    expect(sDown18['gui.button.press'].sounds).toEqual(['random/click']);

    const j2jDown112 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: '1.21' } })),
        'assets/minecraft/sounds.json': strToU8(JSON.stringify({
          'entity.zombified_piglin.ambient': { sounds: ['minecraft:mob/zpiglin/say1'] },
        })),
      })),
      'down-1.12.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.12.2' }
    )).buffer);
    const sDown112 = JSON.parse(strFromU8(j2jDown112['assets/minecraft/sounds.json']));
    expect(sDown112['entity.zombie_pig.ambient'].sounds).toEqual(['mob/zpiglin/say1']);
  });

  it('covers audit regression fixes (#1-#7, #10, #12): 8x8 upscale, TGA OOM guard, lang priority, JSONC flipbook, conduit wind, .LANG, DAG cap, analytics', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'Audit', description: 'A', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    // #1: 8x8 static block upscales nearest-neighbor to 16x16; 16x17 crops to 16x16
    const rgba8 = new Uint8Array(8 * 8 * 4);
    rgba8[(0 * 8 + 1) * 4] = 123; rgba8[(0 * 8 + 1) * 4 + 3] = 255;
    rgba8[(7 * 8 + 7) * 4] = 200; rgba8[(7 * 8 + 7) * 4 + 3] = 255;
    const b8Res = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/stone.png': encodeRgbaToPngSync(8, 8, rgba8),
        'textures/blocks/dirt.png': encodeRgbaToPngSync(16, 17, new Uint8Array(16 * 17 * 4).fill(50)),
      })),
      '8x8.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java' }
    )).buffer);
    const stone16 = decodePngToRgbaSync(b8Res['assets/minecraft/textures/block/stone.png'])!;
    expect(stone16.width).toBe(16);
    expect(stone16.height).toBe(16);
    expect(stone16.rgba[(0 * 16 + 2) * 4]).toBe(123);
    expect(stone16.rgba[(15 * 16 + 15) * 4]).toBe(200);
    expect(getPngDimensions(b8Res['assets/minecraft/textures/block/dirt.png'])).toEqual({ width: 16, height: 16 });

    // #2: Corrupt/oversized TGA returns null immediately without allocating 256MB+
    const badUncompTga = new Uint8Array(20);
    badUncompTga[2] = 2;
    badUncompTga[12] = 0; badUncompTga[13] = 32; // 8192
    badUncompTga[14] = 0; badUncompTga[15] = 32; // 8192
    badUncompTga[16] = 32;
    expect(decodeTgaToRgba(badUncompTga)).toBeNull();
    const badRleTga = new Uint8Array(badUncompTga);
    badRleTga[2] = 10;
    expect(decodeTgaToRgba(badRleTga)).toBeNull();

    // #3: java-to-java multi-version pack keeps native en_us.json over converted en_us.lang in both ZIP orders
    const nativeJson = strToU8(JSON.stringify({ 'block.minecraft.stone': 'Native Stone' }));
    const legacyLang = strToU8('tile.stone.stone.name=Legacy Stone\n');
    for (const files of [
      { 'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })), 'assets/minecraft/lang/en_us.json': nativeJson, 'assets/minecraft/lang/en_us.lang': legacyLang },
      { 'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })), 'assets/minecraft/lang/en_us.lang': legacyLang, 'assets/minecraft/lang/en_us.json': nativeJson },
    ]) {
      const res = unzipSync((await convertBuffer(toArrayBuffer(zipSync(files)), 'multi-lang.zip', { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' })).buffer);
      expect(JSON.parse(strFromU8(res['assets/minecraft/lang/en_us.json']))['block.minecraft.stone']).toBe('Native Stone');
    }

    // #4, #5, #10c, #12: Case-insensitive Flipbook_Textures.json with // in string, conduit_wind height:32, and skippedCount === 0
    const fbRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/stone.png': encodeRgbaToPngSync(16, 32, new Uint8Array(16 * 32 * 4).fill(100)),
        'textures/blocks/conduit_wind_horizontal.png': encodeRgbaToPngSync(64, 704, new Uint8Array(64 * 704 * 4)),
        'textures/Flipbook_Textures.json': strToU8(JSON.stringify([
          { flipbook_texture: 'textures/blocks/stone', atlas_tile: 'stone', ticks_per_frame: 3, note: 'https://example.com//keep' },
          { flipbook_texture: 'textures/blocks/conduit_wind_horizontal', atlas_tile: 'conduit_wind', ticks_per_frame: 2, frames: [0, 21, 99] },
        ])),
      })),
      'fb-audit.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    );
    expect(fbRes.report.skippedCount).toBe(0);
    const fbOut = unzipSync(fbRes.buffer);
    expect(JSON.parse(strFromU8(fbOut['assets/minecraft/textures/block/stone.png.mcmeta'])).animation.frametime).toBe(3);
    const windMeta = JSON.parse(strFromU8(fbOut['assets/minecraft/textures/entity/conduit/wind.png.mcmeta'])).animation;
    expect(windMeta.height).toBe(32);
    expect(windMeta.frames).toEqual([0, 21]);

    // #6: texts/en_US.LANG converts; texts/sub/foo.lang is skipped (not written as raw .lang inside .json)
    const langCase = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'texts/en_US.LANG': strToU8('item.apple.name=Upper Lang\n'),
        'texts/sub/foo.lang': strToU8('item.apple.name=Nested\n'),
      })),
      'lang-case.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    expect(JSON.parse(strFromU8(langCase['assets/minecraft/lang/en_us.json']))['item.minecraft.apple']).toBe('Upper Lang');
    expect(langCase['assets/minecraft/lang/sub/foo.json']).toBeUndefined();

    // #7: Diamond DAG in sounds.json does not hang and caps resolved sounds
    const dag: Record<string, any> = {};
    for (let i = 0; i < 30; i++) {
      dag[`e${i}`] = { sounds: [{ name: `e${i + 1}`, type: 'event' }, { name: `e${i + 1}`, type: 'event' }] };
    }
    dag['e30'] = { sounds: ['dig/stone1'] };
    const dagRes = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/sounds.json': strToU8(JSON.stringify(dag)),
      })),
      'dag.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    )).buffer);
    const dagSd = JSON.parse(strFromU8(dagRes['sounds/sound_definitions.json'])).sound_definitions;
    expect(dagSd['e0'].sounds.length).toBeLessThanOrEqual(256);

    // #10: analyzeReportSafety detects .mcmeta and flipbook_textures.json
    expect(analyzeReportSafety({
      totalFiles: 1, convertedCount: 1, skippedCount: 0, errorCount: 0,
      details: [{ filename: 'assets/minecraft/textures/block/lava_still.png.mcmeta', status: 'converted' }],
    }).hasAnimations).toBe(true);
    expect(analyzeReportSafety({
      totalFiles: 1, convertedCount: 1, skippedCount: 0, errorCount: 0,
      details: [{ filename: 'textures/flipbook_textures.json', status: 'converted' }],
    }).hasAnimations).toBe(true);
  });

  it('hardens 1.20.2+ split GUI sprites for beta graduation (OOM pixel cap, ZIP order, 26.x mcmeta, case, TGA, inset, downgrade)', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'GuiGrad', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    // 1. Pixel cap OOM guard: 8192x8192 PNG header is rejected cleanly without OOM
    const hugeHeader = new Uint8Array(33);
    hugeHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const dv = new DataView(hugeHeader.buffer);
    dv.setUint32(16, 8192, false);
    dv.setUint32(20, 8192, false);
    const oomRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
        'assets/minecraft/textures/gui/sprites/hud/hotbar.png': hugeHeader,
      })),
      'huge-gui.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: false }
    );
    expect(oomRes.report.errorCount).toBeGreaterThan(0);

    // 2. ZIP-order priority: widgets.png listed BEFORE sprites/hud/hotbar.png -> modern hotbar.png wins without double-counting
    const legacyWidgets = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4).fill(40));
    const modernHotbar = encodeRgbaToPngSync(182, 22, new Uint8Array(182 * 22 * 4).fill(220));
    const orderRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/gui/widgets.png': legacyWidgets,
        'assets/minecraft/textures/gui/sprites/hud/hotbar.png': modernHotbar,
      })),
      'zip-order.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: true }
    );
    const orderOut = unzipSync(orderRes.buffer);
    expect(decodePngToRgbaSync(orderOut['textures/ui/hotbar_0.png'])!.rgba[0]).toBe(220);

    // 3. Java 26.x effect_background.png.mcmeta emitted in bedrock-to-java and java-to-java, preserving custom .mcmeta
    const png120 = encodeRgbaToPngSync(120, 32, new Uint8Array(120 * 32 * 4).fill(150));
    const b2j263 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'textures/ui/effect_background.png': png120 })),
      'b2j-263-mcmeta.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '26.3.0' }
    )).buffer);
    expect(JSON.parse(strFromU8(b2j263['assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png.mcmeta'])).gui.scaling.type).toBe('nine_slice');

    const customMcmeta = JSON.stringify({ gui: { scaling: { type: 'stretch' } } });
    const j2j263 = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png': png120,
        'assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png.mcmeta': strToU8(customMcmeta),
      })),
      'j2j-263-mcmeta.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '26.3.0' }
    )).buffer);
    expect(strFromU8(j2j263['assets/minecraft/textures/gui/sprites/container/inventory/effect_background.png.mcmeta'])).toBe(customMcmeta);

    // 4. Bedrock->Java container sprite duplicate .tga & corrupt PNG
    const dupRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/ui/flame_full_image.png': encodeRgbaToPngSync(14, 14, new Uint8Array(14 * 14 * 4).fill(200)),
        'textures/ui/flame_full_image.tga': encodeRgbaToTgaSync(14, 14, new Uint8Array(14 * 14 * 4).fill(50)),
        'textures/ui/arrow_active.png': new Uint8Array([1, 2, 3, 4]),
      })),
      'dup-container.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: false }
    );
    expect(dupRes.report.details.some((d) => d.filename === 'textures/ui/flame_full_image.tga' && d.status === 'skipped')).toBe(true);
    expect(dupRes.report.details.some((d) => d.filename === 'textures/ui/arrow_active.png' && d.status === 'skipped')).toBe(true);

    // 5. Case-insensitive Bedrock UI
    const caseOut = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/ui/Heart.PNG': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4).fill(180)),
        'textures/ui/HOTBAR_0.PNG': encodeRgbaToPngSync(20, 22, new Uint8Array(20 * 22 * 4).fill(180)),
      })),
      'case-ui.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    expect(caseOut['assets/minecraft/textures/gui/sprites/hud/heart/full.png']).toBeDefined();
    expect(caseOut['assets/minecraft/textures/gui/sprites/hud/hotbar.png']).toBeDefined();

    // 6. Disguised TGA in textures/gui/icons.png
    const tgaIcons = encodeRgbaToTgaSync(256, 256, new Uint8Array(256 * 256 * 4).fill(200));
    const disguisedIconsOut = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({ 'manifest.json': manifest, 'textures/gui/icons.png': tgaIcons })),
      'tga-icons.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: true }
    )).buffer);
    expect(disguisedIconsOut['assets/minecraft/textures/gui/sprites/hud/heart/full.png']).toBeDefined();

    // 7. Downgrade without pack.mcmeta + untouched container passthrough + 16x16 horse slot inset
    const noMcmetaDown = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'assets/minecraft/textures/gui/sprites/hud/heart/full.png': encodeRgbaToPngSync(9, 9, new Uint8Array(9 * 9 * 4).fill(200)),
      })),
      'no-mcmeta-down.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.19.4' }
    )).buffer);
    expect(getPngDimensions(noMcmetaDown['assets/minecraft/textures/gui/icons.png'])).toEqual({ width: 256, height: 256 });

    const rawCrafting = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4).fill(77));
    const passthroughOut = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/gui/container/crafting_table.png': rawCrafting,
      })),
      'passthrough-container.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.19.4' }
    )).buffer);
    expect(passthroughOut['assets/minecraft/textures/gui/container/crafting_table.png']).toEqual(rawCrafting);

    const horseSlot18 = encodeRgbaToPngSync(18, 18, new Uint8Array(18 * 18 * 4).fill(140));
    const horseUp = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 22 } })),
        'assets/minecraft/textures/gui/sprites/container/horse/armor_slot.png': horseSlot18,
      })),
      'horse-up.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    )).buffer);
    expect(getPngDimensions(horseUp['assets/minecraft/textures/gui/sprites/container/slot/horse_armor.png'])).toEqual({ width: 16, height: 16 });

    const horseBase = encodeRgbaToPngSync(256, 256, new Uint8Array(256 * 256 * 4).fill(10));
    const horseSlot16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(230));
    const horseDown = unzipSync((await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/gui/container/horse.png': horseBase,
        'assets/minecraft/textures/gui/sprites/container/slot/horse_armor.png': horseSlot16,
      })),
      'horse-down.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.19.4' }
    )).buffer);
    const horseDecoded = decodePngToRgbaSync(horseDown['assets/minecraft/textures/gui/container/horse.png'])!;
    expect(horseDecoded.rgba[(220 * 256 + 0) * 4]).toBe(10);
    expect(horseDecoded.rgba[(221 * 256 + 1) * 4]).toBe(230);

    // 8. BUTTON_WIDGET_METADATA uses border: 3
    expect(JSON.parse(BUTTON_WIDGET_METADATA).gui.scaling.border).toBe(3);
  });

  it('hardens Adam7 PNGs, JSONC metadata/lang/animation, corrupt-asset isolation, and analytics/worker edge cases', async () => {
    // 1. Real Adam7 interlaced 2x2 RGBA PNG decodes cleanly
    const ihdr7 = new Uint8Array([0, 0, 0, 2, 0, 0, 0, 2, 8, 6, 0, 0, 1]);
    // 2x2 Adam7 passes: pass 1 (0,0)=1x1, pass 6 (1,0)=1x1, pass 7 (0,1)&(1,1)=2x1
    const rawAdam7 = new Uint8Array([
      0, 10, 20, 30, 255,       // pass 1: (0,0)
      0, 40, 50, 60, 255,       // pass 6: (1,0)
      0, 70, 80, 90, 255, 100, 110, 120, 255, // pass 7: y=1, x=0..1
    ]);
    const idat7 = zlibSync(rawAdam7);
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
    const mkChunk = (type: string, data: Uint8Array) => {
      const out = new Uint8Array(12 + data.length);
      const dv = new DataView(out.buffer);
      dv.setUint32(0, data.length, false);
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
      out.set(data, 8);
      let c = 0xffffffff;
      for (let i = 4; i < 8 + data.length; i++) c = crcTable[(c ^ out[i]) & 0xff] ^ (c >>> 8);
      dv.setUint32(8 + data.length, (c ^ 0xffffffff) >>> 0, false);
      return out;
    };
    const adam7Png = new Uint8Array(sig.length + 25 + 12 + idat7.length + 12);
    let p = 0;
    for (const part of [sig, mkChunk('IHDR', ihdr7), mkChunk('IDAT', idat7), mkChunk('IEND', new Uint8Array(0))]) {
      adam7Png.set(part, p);
      p += part.length;
    }
    const decodedAdam7 = decodePngToRgbaSync(adam7Png);
    expect(decodedAdam7).not.toBeNull();
    expect(Array.from(decodedAdam7!.rgba)).toEqual([
      10, 20, 30, 255,
      40, 50, 60, 255,
      70, 80, 90, 255,
      100, 110, 120, 255,
    ]);

    // 2. JSONC + BOM in pack.mcmeta, lang .json, .png.mcmeta, and corrupt metadata warning in java-to-java
    const jsoncRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8('\uFEFF{\n  // comment\n  "pack": { "pack_format": 46, "description": "JSONC", },\n}'),
        'assets/minecraft/lang/en_us.json': strToU8('\uFEFF{\n  // lang\n  "block.minecraft.stone": "Stone",\n}'),
        'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 32, new Uint8Array(16 * 32 * 4).fill(100)),
        'assets/minecraft/textures/block/stone.png.mcmeta': strToU8('\uFEFF{\n  // anim\n  "animation": { "frametime": 4, },\n}'),
      })),
      'jsonc.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    const jsoncOut = unzipSync(jsoncRes.buffer);
    expect(strFromU8(jsoncOut['texts/en_US.lang'])).toContain('tile.stone.stone.name=Stone');
    expect(JSON.parse(strFromU8(jsoncOut['textures/flipbook_textures.json']))[0].ticks_per_frame).toBe(4);

    const corruptMetaRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8('{ invalid json'),
        'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
      })),
      'corrupt-meta.zip',
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4' }
    );
    expect(corruptMetaRes.report.details.some(d => d.filename === 'pack.mcmeta' && d.warning === true)).toBe(true);

    // 3. Corrupt leaf, corrupt grass_block_side, corrupt non-block 0x0 PNG, and Bedrock->Java .wav warning
    const zeroDimPng = new Uint8Array(33);
    zeroDimPng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const corruptAssetsRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46 } })),
        'assets/minecraft/textures/block/oak_leaves.png': new Uint8Array([1, 2, 3, 4]),
        'assets/minecraft/textures/block/grass_block_side.png': new Uint8Array([1, 2, 3, 4]),
        'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
      })),
      'corrupt-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock' }
    );
    expect(corruptAssetsRes.report.details.some(d => d.reason === 'Invalid or corrupt leaf texture')).toBe(true);
    expect(corruptAssetsRes.report.details.some(d => d.reason === 'Invalid or corrupt grass_block_side texture')).toBe(true);

    const b2jWarnRes = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format_version: 2,
          header: { name: 'W', description: 'W', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
          modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
        })),
        'textures/items/bad_item.png': zeroDimPng,
        'sounds/custom/hit.wav': new Uint8Array([0x52, 0x49, 0x46, 0x46]),
      })),
      'b2j-warn.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java', enableAudioReencode: false }
    );
    expect(b2jWarnRes.report.details.some(d => d.filename === 'textures/items/bad_item.png' && d.status === 'skipped')).toBe(true);
    expect(b2jWarnRes.report.details.some(d => d.filename === 'sounds/custom/hit.wav' && d.warning === true)).toBe(true);

    // 4. versions.ts NaN guard & analytics ZipSafetyError categorization
    expect(getBedrockVersionByEngineVersion([NaN, NaN, NaN])).toBeNull();
    expect(categorizeError(new Error('Archive contains too many files'))).toBe('INVALID_ARCHIVE');
  });
});
