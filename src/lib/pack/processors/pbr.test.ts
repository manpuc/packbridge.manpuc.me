import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { convertBuffer } from '../convert-core';
import { encodeRgbaToPngSync } from './tga';
import {
  decodePngToRgbaSync,
  convertBedrockMerToLabPbrSpec,
  convertLabPbrSpecToBedrockMer,
  convertBedrockNormalToLabPbr,
  convertBedrockHeightmapToLabPbr,
  convertLabPbrNormalToBedrock,
  parseTextureSetJson,
  generateBedrockTextureSetJson,
} from './pbr';
import type { ConversionOptions } from '../types';

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

function make1x1Png(r: number, g: number, b: number, a: number): Uint8Array {
  return encodeRgbaToPngSync(1, 1, new Uint8Array([r, g, b, a]));
}

describe('PBR / Shader Map Conversion (RTX <-> LabPBR)', () => {
  it('converts MER/MERS <-> LabPBR Specular accurately and round-trips without metal/roughness/alpha corruption', async () => {
    // 1. Dielectric (M=0, E=0, R=200) -> S=55, F0=10, B=0, A=255 -> back to M=0, E=0, R=200, A=255
    const specDielectric = await convertBedrockMerToLabPbrSpec(make1x1Png(0, 0, 200, 255), false);
    const dSpec = decodePngToRgbaSync(specDielectric!)!;
    expect(Array.from(dSpec.rgba)).toEqual([55, 10, 0, 255]);

    const merDielectric = await convertLabPbrSpecToBedrockMer(specDielectric!, true);
    expect(merDielectric!.hasSubsurface).toBe(false);
    expect(Array.from(decodePngToRgbaSync(merDielectric!.png)!.rgba)).toEqual([0, 0, 200, 255]);

    // 2. Metal (M=255 and M=231) -> F0=255 (never 230..254 hardcoded metal IDs)
    const specMetal = await convertBedrockMerToLabPbrSpec(make1x1Png(255, 0, 40, 255), false);
    expect(Array.from(decodePngToRgbaSync(specMetal!)!.rgba)).toEqual([215, 255, 0, 255]);

    const specNearMetal = await convertBedrockMerToLabPbrSpec(make1x1Png(231, 0, 40, 255), false);
    expect(decodePngToRgbaSync(specNearMetal!)!.rgba[1]).toBe(255);

    const merMetal = await convertLabPbrSpecToBedrockMer(specMetal!, false);
    expect(Array.from(decodePngToRgbaSync(merMetal!.png)!.rgba)).toEqual([255, 0, 40, 255]);

    // 3. LabPBR dielectric F0=43 (diamond) -> Bedrock M=0; hardcoded metal F0=231 (gold) -> Bedrock M=255
    const merDiamond = await convertLabPbrSpecToBedrockMer(make1x1Png(200, 43, 0, 255), false);
    expect(decodePngToRgbaSync(merDiamond!.png)!.rgba[0]).toBe(0);

    const merGold = await convertLabPbrSpecToBedrockMer(make1x1Png(200, 231, 0, 255), false);
    expect(decodePngToRgbaSync(merGold!.png)!.rgba[0]).toBe(255);

    // 4. Emissive encoding & decoding
    expect(decodePngToRgbaSync((await convertBedrockMerToLabPbrSpec(make1x1Png(0, 1, 128, 255), false))!)!.rgba[3]).toBe(1);
    expect(decodePngToRgbaSync((await convertBedrockMerToLabPbrSpec(make1x1Png(0, 255, 128, 255), false))!)!.rgba[3]).toBe(254);
    expect(decodePngToRgbaSync((await convertLabPbrSpecToBedrockMer(make1x1Png(128, 10, 0, 0), false))!.png)!.rgba[1]).toBe(0);
    expect(decodePngToRgbaSync((await convertLabPbrSpecToBedrockMer(make1x1Png(128, 10, 0, 254), false))!.png)!.rgba[1]).toBe(255);

    // 5. Subsurface Scattering (MERS A=128 -> LabPBR B=160 -> Bedrock 1.21.50 MERS vs 1.20.80 MER)
    const specSss = await convertBedrockMerToLabPbrSpec(make1x1Png(0, 0, 100, 128), true);
    expect(decodePngToRgbaSync(specSss!)!.rgba[2]).toBe(160);

    const mersOut = await convertLabPbrSpecToBedrockMer(specSss!, true);
    expect(mersOut!.hasSubsurface).toBe(true);
    expect(decodePngToRgbaSync(mersOut!.png)!.rgba[3]).toBe(128);

    const merNoSssOut = await convertLabPbrSpecToBedrockMer(specSss!, false);
    expect(merNoSssOut!.hasSubsurface).toBe(false);
    expect(decodePngToRgbaSync(merNoSssOut!.png)!.rgba[3]).toBe(255);

    // Non-SSS pixel in a MERS texture gets A=0 (not 255)
    const twoPxSpec = encodeRgbaToPngSync(2, 1, new Uint8Array([
      128, 10, 160, 255, // SSS pixel
      128, 10, 0, 255,   // non-SSS pixel
    ]));
    const twoPxMers = await convertLabPbrSpecToBedrockMer(twoPxSpec, true);
    expect(twoPxMers!.hasSubsurface).toBe(true);
    const twoPxRgba = decodePngToRgbaSync(twoPxMers!.png)!.rgba;
    expect(twoPxRgba[3]).toBe(128);
    expect(twoPxRgba[7]).toBe(0);
  });

  it('converts Normal / Heightmap <-> LabPBR Normal accurately with Z reconstruction, Sobel, and AO/Height isolation', async () => {
    // 1. LabPBR _n.png with dark AO (B=40) and height (A=120) -> Bedrock _normal.png reconstructs Z and sets A=255
    const labN = make1x1Png(128, 128, 40, 120);
    const bNorm = await convertLabPbrNormalToBedrock(labN);
    expect(bNorm!.kind).toBe('normal');
    expect(Array.from(decodePngToRgbaSync(bNorm!.png)!.rgba)).toEqual([128, 128, 255, 255]);

    // 2. Height-only LabPBR _n.png (flat RG=128, varying A) -> Bedrock _heightmap.png
    const heightOnlyLabN = encodeRgbaToPngSync(2, 1, new Uint8Array([
      128, 128, 255, 80,
      128, 128, 255, 200,
    ]));
    const bHeight = await convertLabPbrNormalToBedrock(heightOnlyLabN);
    expect(bHeight!.kind).toBe('heightmap');
    expect(Array.from(decodePngToRgbaSync(bHeight!.png)!.rgba)).toEqual([
      80, 80, 80, 255,
      200, 200, 200, 255,
    ]);

    // 3. Bedrock _normal.png (Z=180, A=0) -> LabPBR _n.png sets B=255 (neutral AO) and A=255 (flush)
    const labFromBNorm = await convertBedrockNormalToLabPbr(make1x1Png(140, 110, 180, 0));
    expect(Array.from(decodePngToRgbaSync(labFromBNorm!)!.rgba)).toEqual([140, 110, 255, 255]);

    // 4. Combined Bedrock _normal.png + _heightmap.png -> merges RG from normal and A from heightmap
    const labMerged = await convertBedrockNormalToLabPbr(
      make1x1Png(140, 110, 180, 255),
      make1x1Png(100, 100, 100, 255)
    );
    expect(Array.from(decodePngToRgbaSync(labMerged!)!.rgba)).toEqual([140, 110, 255, 100]);

    // 5. Bedrock _heightmap.png (4x4 bump in center) -> Sobel DirectX Y- normals + neutral AO + height in A
    const hRgba = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) {
      const y = Math.floor(i / 4);
      const x = i % 4;
      const v = (x === 1 || x === 2) && (y === 1 || y === 2) ? 200 : 50;
      hRgba[i * 4] = v; hRgba[i * 4 + 1] = v; hRgba[i * 4 + 2] = v; hRgba[i * 4 + 3] = 255;
    }
    const labFromHeight = await convertBedrockHeightmapToLabPbr(encodeRgbaToPngSync(4, 4, hRgba));
    const dH = decodePngToRgbaSync(labFromHeight!)!;
    // Left of bump (x=0, y=1): slope rises to the right -> nx < 0 -> R < 128
    expect(dH.rgba[(1 * 4 + 0) * 4]).toBeLessThan(128);
    // Right of bump (x=3, y=1): slope falls to the right -> nx > 0 -> R > 128
    expect(dH.rgba[(1 * 4 + 3) * 4]).toBeGreaterThan(128);
    // Neutral AO and height preserved
    expect(dH.rgba[(1 * 4 + 1) * 4 + 2]).toBe(255);
    expect(dH.rgba[(1 * 4 + 1) * 4 + 3]).toBe(200);
  });

  it('parses texture_set.json (JSONC, custom filenames, uniform arrays/hex) and converts Bedrock -> Java cleanly', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'PbrB2J', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));

    const stone16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(150));
    const customMer16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(0));
    const customNorm16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(128));

    const tsJsonc = '\uFEFF{\n' +
      '  // Comment with // inside\n' +
      '  "format_version": "1.21.30",\n' +
      '  "minecraft:texture_set": {\n' +
      '    "color": "stone_albedo",\n' +
      '    "metalness_emissive_roughness_subsurface": "custom_pbr",\n' +
      '    "normal": "custom_n",\n' +
      '  }\n' +
      '}\n';

    const parsed = parseTextureSetJson(tsJsonc);
    expect(parsed).toEqual({
      color: 'stone_albedo',
      mer: 'custom_pbr',
      normal: 'custom_n',
      hasSubsurface: true,
    });

    const b2j = await convertBuffer(
      toArrayBuffer(zipSync({
        'manifest.json': manifest,
        'textures/blocks/stone.texture_set.json': strToU8(tsJsonc),
        'textures/blocks/stone_albedo.png': stone16,
        'textures/blocks/custom_pbr.png': customMer16,
        'textures/blocks/custom_n.png': customNorm16,
        'textures/blocks/gold_block.png': stone16,
        'textures/blocks/gold_block.texture_set.json': strToU8(JSON.stringify({
          format_version: '1.16.100',
          'minecraft:texture_set': {
            color: 'gold_block',
            metalness_emissive_roughness: [255, 0, 40],
          },
        })),
        'textures/blocks/iron_block.png': stone16,
        'textures/blocks/iron_block.texture_set.json': strToU8(JSON.stringify({
          format_version: '1.16.100',
          'minecraft:texture_set': {
            color: 'iron_block',
            metalness_emissive_roughness: '#FF0028',
            normal: '../../evil',
          },
        })),
      })),
      'pbr-b2j.mcpack',
      { ...baseOptions, direction: 'bedrock-to-java' }
    );

    expect(b2j.report.errorCount).toBe(0);
    const out = unzipSync(b2j.buffer);
    expect(out['assets/minecraft/textures/block/stone.png']).toBeDefined();
    expect(out['assets/minecraft/textures/block/stone_s.png']).toBeDefined();
    expect(out['assets/minecraft/textures/block/stone_n.png']).toBeDefined();
    // Custom PBR/color aliases must NOT leak as standalone diffuse textures
    expect(out['assets/minecraft/textures/block/custom_pbr.png']).toBeUndefined();
    expect(out['assets/minecraft/textures/block/custom_n.png']).toBeUndefined();
    expect(out['assets/minecraft/textures/block/stone_albedo.png']).toBeUndefined();

    // Uniform MER array & hex synthesized _s.png
    const goldSpec = decodePngToRgbaSync(out['assets/minecraft/textures/block/gold_block_s.png'])!;
    expect(goldSpec.width).toBe(16);
    expect(Array.from(goldSpec.rgba.slice(0, 4))).toEqual([215, 255, 0, 255]);

    const ironSpec = decodePngToRgbaSync(out['assets/minecraft/textures/block/iron_block_s.png'])!;
    expect(Array.from(ironSpec.rgba.slice(0, 4))).toEqual([215, 255, 0, 255]);
  });

  it('protects vanilla *_normal diffuse textures and UI textures from PBR misclassification', async () => {
    const manifest = strToU8(JSON.stringify({
      format_version: 2,
      header: { name: 'VanillaNormal', description: 'B', uuid: '11111111-1111-4111-8111-111111111111', version: [1, 0, 0], min_engine_version: [1, 21, 50] },
      modules: [{ type: 'resources', uuid: '22222222-2222-4222-8222-222222222222', version: [1, 0, 0] }],
    }));
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(120));

    for (const enablePbrConversion of [false, true]) {
      const res = await convertBuffer(
        toArrayBuffer(zipSync({
          'manifest.json': manifest,
          'textures/blocks/sandstone_normal.png': png16,
          'textures/blocks/red_sandstone_normal.png': png16,
          'textures/blocks/piston_top_normal.png': png16,
          'textures/blocks/rail_normal.png': png16,
          'textures/items/book_normal.png': png16,
          'textures/items/minecart_normal.png': png16,
          'textures/blocks/sandstone_normal_normal.png': png16,
        })),
        'vanilla-normal.mcpack',
        { ...baseOptions, direction: 'bedrock-to-java', enablePbrConversion }
      );
      const out = unzipSync(res.buffer);
      expect(out['assets/minecraft/textures/block/sandstone.png']).toBeDefined();
      expect(out['assets/minecraft/textures/block/red_sandstone.png']).toBeDefined();
      expect(out['assets/minecraft/textures/block/piston_top.png']).toBeDefined();
      expect(out['assets/minecraft/textures/block/rail.png']).toBeDefined();
      expect(out['assets/minecraft/textures/item/book.png']).toBeDefined();
      expect(out['assets/minecraft/textures/item/minecart.png']).toBeDefined();
      if (enablePbrConversion) {
        expect(out['assets/minecraft/textures/block/sandstone_n.png']).toBeDefined();
      } else {
        expect(out['assets/minecraft/textures/block/sandstone_n.png']).toBeUndefined();
      }
    }
  });

  it('emits manifest capabilities, versioned texture_set.json, and rejects corrupt/oversized PBR inputs safely', async () => {
    const png16 = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(150));
    const sssSpec = encodeRgbaToPngSync(16, 16, new Uint8Array(16 * 16 * 4).fill(180)); // B=180 -> SSS
    const heightOnlyN = encodeRgbaToPngSync(2, 1, new Uint8Array([128, 128, 255, 50, 128, 128, 255, 200]));

    // 1. Java -> Bedrock 1.21.50: emits capabilities: ['raytraced'], 1.21.30 MERS, and heightmap
    const j2bModern = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'PBR' } })),
        'assets/minecraft/textures/block/stone.png': png16,
        'assets/minecraft/textures/block/stone_s.png': sssSpec,
        'assets/minecraft/textures/block/stone_n.png': heightOnlyN,
        'assets/minecraft/textures/block/dirt_s.png': new Uint8Array([1, 2, 3, 4]), // corrupt
      })),
      'pbr-j2b.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.21.50' }
    );
    const outMod = unzipSync(j2bModern.buffer);
    const manifestMod = JSON.parse(strFromU8(outMod['manifest.json']));
    expect(manifestMod.capabilities).toEqual(['raytraced']);
    const stoneTs = JSON.parse(strFromU8(outMod['textures/blocks/stone.texture_set.json']));
    expect(stoneTs.format_version).toBe('1.21.30');
    expect(stoneTs['minecraft:texture_set'].metalness_emissive_roughness_subsurface).toBe('stone_mer');
    expect(stoneTs['minecraft:texture_set'].heightmap).toBe('stone_heightmap');
    expect(stoneTs['minecraft:texture_set'].normal).toBeUndefined();
    expect(outMod['textures/blocks/dirt_mer.png']).toBeUndefined();
    expect(outMod['textures/blocks/dirt.texture_set.json']).toBeUndefined();

    // 2. Java -> Bedrock 1.14.0: omits capabilities
    const j2bOld = await convertBuffer(
      toArrayBuffer(zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'PBR' } })),
        'assets/minecraft/textures/block/stone.png': png16,
        'assets/minecraft/textures/block/stone_s.png': sssSpec,
      })),
      'pbr-old.zip',
      { ...baseOptions, direction: 'java-to-bedrock', bedrockVersionId: '1.14.0' }
    );
    const manifestOld = JSON.parse(strFromU8(unzipSync(j2bOld.buffer)['manifest.json']));
    expect(manifestOld.capabilities).toBeUndefined();

    // 3. Oversized 8192x8192 PNG header rejected without OOM
    const hugeHeader = new Uint8Array(33);
    hugeHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const dv = new DataView(hugeHeader.buffer);
    dv.setUint32(16, 8192, false);
    dv.setUint32(20, 8192, false);
    expect(decodePngToRgbaSync(hugeHeader)).toBeNull();
    expect(generateBedrockTextureSetJson('stone', { hasMer: true, hasSubsurface: true, hasHeightmap: true })).toContain('1.21.30');
  });
});
