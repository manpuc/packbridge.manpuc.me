import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { convertBuffer } from './convert-core';
import { encodeRgbaToPngSync } from './processors/tga';
import { extractPackFormat } from './versions';
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
});
