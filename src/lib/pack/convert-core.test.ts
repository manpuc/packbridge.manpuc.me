import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { convertBuffer } from './convert-core';
import { convertPackWithWorker } from './worker-client';
import { encodeRgbaToPngSync, encodeRgbaToTgaSync, decodeTgaToRgba, getPngDimensions } from './processors/tga';
import { decodePngToRgbaSync } from './processors/pbr';
import { processGuiSpriteSheet } from './processors/gui';
import { zlibSync } from 'fflate';
import { extractPackFormat, detectEditionAutoSwitch } from './versions';
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
  enableModernGuiSprites: true,
  enableTgaConversion: true,
  enableAnimationConversion: true,
  enableLanguageConversion: true,
  enableSoundConversion: true,
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
    expect(out['texts/en_us.lang']).toBeDefined();
    expect(strFromU8(out['texts/en_us.lang'])).toContain('Stone');
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
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: false, enableModernGuiSprites: true }
    );
    const j2bOut = unzipSync(j2bEnabled.buffer);
    expect(j2bOut['textures/ui/heart.png']).toBeDefined();
    expect(j2bOut['textures/ui/cross_hair.png']).toBeUndefined();
    expect(j2bOut['textures/ui/experiencenub.png']).toBeUndefined();
    expect(j2bOut['textures/ui/sprites/widget/button.png']).toBeUndefined();

    const j2bDisabled = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'ModernGUIDisabled' } })),
        'assets/minecraft/textures/block/stone.png': encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4)),
        'assets/minecraft/textures/gui/sprites/hud/heart/full.png': png8,
      })),
      'modern-gui-off.zip',
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: true, enableModernGuiSprites: false }
    );
    const j2bDisabledOut = unzipSync(j2bDisabled.buffer);
    expect(j2bDisabledOut['textures/ui/heart.png']).toBeUndefined();
    expect(j2bDisabledOut['textures/ui/sprites/hud/heart/full.png']).toBeUndefined();

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
      { ...baseOptions, direction: 'bedrock-to-java', enableGuiConversion: false, enableModernGuiSprites: true, enableTgaConversion: true }
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
      { ...baseOptions, direction: 'java-to-bedrock', enableGuiConversion: false, enableModernGuiSprites: true }
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
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.21.4', enableGuiConversion: false, enableModernGuiSprites: true }
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
      { ...baseOptions, direction: 'bedrock-to-java', javaVersionId: '1.20.3', enableGuiConversion: false, enableModernGuiSprites: true }
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
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4', enableModernGuiSprites: true }
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
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.16.2', enableModernGuiSprites: true }
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
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.21.50', enableGuiConversion: true, enableModernGuiSprites: true }
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
      enableModernGuiSprites: true,
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
      enableModernGuiSprites: true,
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
      { ...baseOptions, direction: 'java-to-java', javaVersionId: '1.21.4', enableModernGuiSprites: true }
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
      enableModernGuiSprites: true,
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
      const ihdr = new Uint8Array([0,0,0,2, 0,0,0,1, 8, 2, 0, 0, 0]);
      const trns = new Uint8Array([0,255, 0,0, 0,255]);
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
});
