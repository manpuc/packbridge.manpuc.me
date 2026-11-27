import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { convertBuffer } from '../convert-core';
import {
  javaToBedrockGeometry,
  javaToBedrockGeometryDetailed,
  bedrockToJavaModel,
  bedrockToJavaModels,
  isBedrockModelPath,
  isJavaModelPath,
  isJavaCemPartPath,
} from './models';
import type { ConversionOptions } from '../types';

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const baseOptions: Omit<ConversionOptions, 'direction'> = {
  javaVersionId: '1.21.4',
  bedrockVersionId: '1.21.50',
  enableGuiConversion: false,
  enableAudioReencode: false,
  enableModelConversion: true,
  enablePbrConversion: false,
};

describe('3D Custom Model Converter (Geo <-> JSON/CEM)', () => {
  describe('Path Classifiers', () => {
    it('classifies Bedrock and Java model paths case-insensitively', () => {
      expect(isBedrockModelPath('models/entity/zombie.geo.json')).toBe(true);
      expect(isBedrockModelPath('Models/Blocks/Chair.GEO.JSON')).toBe(true);
      expect(isBedrockModelPath('textures/entity/zombie.png')).toBe(false);

      expect(isJavaModelPath('assets/minecraft/models/block/chair.json')).toBe(true);
      expect(isJavaModelPath('assets/minecraft/models/item/custom/sword.json')).toBe(true);
      expect(isJavaModelPath('assets/minecraft/optifine/cem/Zombie.JEM')).toBe(true);
      expect(isJavaModelPath('assets/minecraft/mcpatcher/cem/part.jpm')).toBe(true);
      expect(isJavaCemPartPath('assets/minecraft/optifine/cem/sub/hat.JPM')).toBe(true);
      expect(isJavaCemPartPath('assets/minecraft/optifine/cem/zombie.jem')).toBe(false);
    });
  });

  describe('Java Block/Item <-> Bedrock Geometry Math & UVs', () => {
    it('applies exact X-flip to asymmetric cube origin, size, and rotation pivot and round-trips', () => {
      const javaModel = {
        textures: { '0': 'minecraft:block/test' },
        elements: [
          {
            from: [12, 0, 2],
            to: [16, 10, 6],
            rotation: { origin: [14, 5, 4], axis: 'y', angle: -22.5 },
            faces: {
              north: { uv: [0, 0, 4, 10], texture: '#0' },
              up: { uv: [0, 0, 4, 4], texture: '#0' },
            },
          },
        ],
      };

      const geoStr = javaToBedrockGeometry(JSON.stringify(javaModel), 'block_test')!;
      const geo = JSON.parse(geoStr);
      const cube = geo['minecraft:geometry'][0].bones[0].cubes[0];

      // X-flip: origin.x = 8 - 16 = -8, size = [4, 10, 4], pivot.x = 8 - 14 = -6
      expect(cube.origin).toEqual([-8, 0, -6]);
      expect(cube.size).toEqual([4, 10, 4]);
      expect(cube.pivot).toEqual([-6, 5, -4]);
      expect(cube.rotation).toEqual([0, 22.5, 0]);

      // Up face UV is 180-deg inverted in Bedrock
      expect(cube.uv.up).toEqual({ uv: [4, 4], uv_size: [-4, -4] });
      expect(cube.uv.north).toEqual({ uv: [0, 0], uv_size: [4, 10] });

      // Round-trip back to Java
      const back = bedrockToJavaModel(geoStr, 'models/entity/block_test.geo.json', 46)!;
      const backJson = JSON.parse(back.content);
      const el = backJson.elements[0];
      expect(el.from).toEqual([12, 0, 2]);
      expect(el.to).toEqual([16, 10, 6]);
      expect(el.rotation).toEqual({ origin: [14, 5, 4], axis: 'y', angle: -22.5 });
      expect(el.faces.up.uv).toEqual([0, 0, 4, 4]);
      expect(el.faces.north.uv).toEqual([0, 0, 4, 10]);
      // Omitted faces in Bedrock are not fabricated
      expect(el.faces.south).toBeUndefined();
    });

    it('preserves 0-thickness flat planes, normalizes inverted from>to, and applies rescale', () => {
      const javaModel = {
        elements: [
          {
            // Inverted X and 0-thickness Z plane with 45deg Y rescale
            from: [12, 0, 8],
            to: [4, 16, 8],
            rotation: { origin: [8, 8, 8], axis: 'y', angle: 45, rescale: true },
            faces: {
              north: { texture: '#0' }, // Omitted UV -> auto-UV
            },
          },
        ],
      };

      const geoStr = javaToBedrockGeometry(JSON.stringify(javaModel), 'block_plane')!;
      const cube = JSON.parse(geoStr)['minecraft:geometry'][0].bones[0].cubes[0];

      // Size Z must be 0 (not 0.01), X scaled by sqrt(2)
      expect(cube.size[2]).toBe(0);
      expect(cube.size[0]).toBeCloseTo(8 * Math.SQRT2, 3);
      // Auto-UV computed from pre-rescale [4..12, 0..16]: north = [16-12, 16-16, 16-4, 16-0] = [4, 0, 12, 16]
      expect(cube.uv.north).toEqual({ uv: [4, 0], uv_size: [8, 16] });
    });

    it('handles face.rotation for Bedrock 1.21.0+ vs 1.16.0', () => {
      const javaModel = {
        elements: [
          {
            from: [0, 0, 0],
            to: [16, 16, 16],
            faces: {
              north: { uv: [0, 0, 16, 16], rotation: 90, texture: '#0' },
              south: { uv: [0, 0, 16, 16], rotation: 180, texture: '#0' },
            },
          },
        ],
      };

      const res121 = javaToBedrockGeometryDetailed(JSON.stringify(javaModel), 'block_rot', {
        targetBedrockMinEngine: [1, 21, 50],
      })!;
      const geo121 = JSON.parse(res121.content);
      expect(geo121.format_version).toBe('1.21.0');
      expect(geo121['minecraft:geometry'][0].bones[0].cubes[0].uv.north.uv_rotation).toBe(90);
      expect(res121.warning).toBeUndefined();

      const res116 = javaToBedrockGeometryDetailed(JSON.stringify(javaModel), 'block_rot', {
        targetBedrockMinEngine: [1, 16, 0],
      })!;
      const geo116 = JSON.parse(res116.content);
      expect(geo116.format_version).toBe('1.12.0');
      // 180 deg is baked losslessly
      expect(geo116['minecraft:geometry'][0].bones[0].cubes[0].uv.south).toEqual({
        uv: [16, 16],
        uv_size: [-16, -16],
      });
      expect(res116.warning).toContain('1.21.0+');
    });

    it('bakes Bedrock 90-degree rotations into Java from/to & faces instead of clamping to 45', () => {
      const bedrockGeo = {
        format_version: '1.12.0',
        'minecraft:geometry': [
          {
            description: { identifier: 'geometry.block_chair', texture_width: 16, texture_height: 16 },
            bones: [
              {
                name: 'seat',
                pivot: [0, 0, 0],
                rotation: [0, 90, 0],
                cubes: [
                  {
                    origin: [-8, 0, -8],
                    size: [16, 4, 8],
                    uv: {
                      north: { uv: [0, 0], uv_size: [16, 4] },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const outputs = bedrockToJavaModels(JSON.stringify(bedrockGeo), 'models/blocks/furniture/chair.geo.json', {
        targetPackFormat: 46,
      });
      expect(outputs).toHaveLength(1);
      expect(outputs[0].outputPath).toBe('assets/minecraft/models/block/furniture/chair.json');
      const javaModel = JSON.parse(outputs[0].content);
      expect(javaModel.elements[0].rotation).toBeUndefined();
      // Bedrock +90 Y -> Java -90 Y (1 step): north face rotates to east or west
      expect(Object.keys(javaModel.elements[0].faces)).toHaveLength(1);
      expect(javaModel.elements[0].from[0]).toBe(8);
      expect(javaModel.elements[0].to[0]).toBe(16);
    });

    it('bakes Bedrock Z-axis 90-degree rotation with matching face permutation (up -> west)', () => {
      const bedrockGeo = {
        format_version: '1.12.0',
        'minecraft:geometry': [
          {
            description: { identifier: 'geometry.block_ztest', texture_width: 16, texture_height: 16 },
            bones: [
              {
                name: 'root',
                pivot: [0, 8, 0],
                rotation: [0, 0, 90],
                cubes: [
                  {
                    origin: [-2, 12, -2],
                    size: [4, 4, 4],
                    uv: {
                      up: { uv: [0, 0], uv_size: [4, 4] },
                      east: { uv: [4, 0], uv_size: [4, 4] },
                      west: { uv: [8, 0], uv_size: [4, 4] },
                      down: { uv: [12, 0], uv_size: [4, 4] },
                      north: { uv: [0, 4], uv_size: [4, 4] },
                      south: { uv: [4, 4], uv_size: [4, 4] },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const outputs = bedrockToJavaModels(JSON.stringify(bedrockGeo), 'models/blocks/ztest.geo.json', {
        targetPackFormat: 46,
      });
      expect(outputs).toHaveLength(1);
      const el = JSON.parse(outputs[0].content).elements[0];
      expect(el.rotation).toBeUndefined();
      expect(el.from).toEqual([0, 6, 6]);
      expect(el.to).toEqual([4, 10, 10]);
      // Z +90deg CCW: up -> west, west -> down, down -> east, east -> up
      expect(el.faces.west.uv).toEqual([4, 4, 0, 0]);
      expect(el.faces.down.uv).toEqual([8, 0, 12, 4]);
      expect(el.faces.east.uv).toEqual([16, 4, 12, 0]);
      expect(el.faces.up.uv).toEqual([4, 0, 8, 4]);
      expect(el.faces.north.uv).toEqual([0, 4, 4, 8]);
      expect(el.faces.south.uv).toEqual([4, 4, 8, 8]);
    });

    it('unwraps Bedrock Box UV (including mirror: true) to Java per-face UVs', () => {
      const bedrockGeo = {
        format_version: '1.12.0',
        'minecraft:geometry': [
          {
            description: { identifier: 'geometry.block_box', texture_width: 64, texture_height: 64 },
            bones: [
              {
                name: 'root',
                pivot: [0, 0, 0],
                cubes: [{ origin: [-4, 0, -4], size: [8, 8, 8], uv: [0, 0], mirror: true }],
              },
            ],
          },
        ],
      };
      const out = bedrockToJavaModels(JSON.stringify(bedrockGeo), 'models/entity/block_box.geo.json')[0];
      const el = JSON.parse(out.content).elements[0];
      expect(el.faces.north.uv).toBeDefined();
      // Mirrored U: u1 > u2
      expect(el.faces.north.uv[0]).toBeGreaterThan(el.faces.north.uv[2]);
    });

    it('computes dynamic visible_bounds for tall models', () => {
      const javaModel = {
        elements: [{ from: [0, 0, 0], to: [16, 48, 16], faces: { up: { texture: '#0' } } }],
      };
      const geo = JSON.parse(javaToBedrockGeometry(JSON.stringify(javaModel), 'block_tall')!);
      expect(geo['minecraft:geometry'][0].description.visible_bounds_height).toBe(3);
    });
  });

  describe('OptiFine CEM (.jem/.jpm) <-> Bedrock Entity Geometry', () => {
    it('converts Zombie/Pig entity parts with exact pivot/translate/coordinates round-trip', () => {
      const bedrockZombie = {
        format_version: '1.12.0',
        'minecraft:geometry': [
          {
            description: { identifier: 'geometry.zombie.v1.8', texture_width: 64, texture_height: 64 },
            bones: [
              {
                name: 'head',
                pivot: [0, 24, 0],
                cubes: [{ origin: [-4, 24, -4], size: [8, 8, 8], uv: [0, 0] }],
              },
              {
                name: 'rightArm',
                pivot: [-5, 22, 0],
                cubes: [{ origin: [-8, 12, -2], size: [4, 12, 4], uv: [40, 16] }],
              },
            ],
          },
        ],
      };

      const jemOut = bedrockToJavaModels(JSON.stringify(bedrockZombie), 'models/entity/zombie.geo.json', {
        targetPackFormat: 46,
      });
      expect(jemOut).toHaveLength(1);
      expect(jemOut[0].outputPath).toBe('assets/minecraft/optifine/cem/zombie.jem');
      const jem = JSON.parse(jemOut[0].content);

      const head = jem.models.find((m: any) => m.part === 'head');
      expect(head.invertAxis).toBe('xy');
      expect(head.translate).toEqual([0, -24, 0]);
      expect(head.boxes[0].coordinates).toEqual([-4, 0, -4, 8, 8, 8]);

      const rightArm = jem.models.find((m: any) => m.part === 'right_arm');
      expect(rightArm.translate).toEqual([-5, -22, 0]);
      expect(rightArm.boxes[0].coordinates).toEqual([-1, -10, -2, 4, 12, 4]);

      // Round-trip back to Bedrock
      const geoBack = JSON.parse(javaToBedrockGeometry(jemOut[0].content, 'zombie')!);
      const backBones = geoBack['minecraft:geometry'][0].bones;
      const backHead = backBones.find((b: any) => b.name === 'head');
      const backRightArm = backBones.find((b: any) => b.name === 'rightArm');
      expect(backHead.pivot).toEqual([0, 24, 0]);
      expect(backHead.cubes[0].origin).toEqual([-4, 24, -4]);
      expect(backRightArm.pivot).toEqual([-5, 22, 0]);
      expect(backRightArm.cubes[0].origin).toEqual([-8, 12, -2]);
    });

    it('preserves nested bone hierarchies <-> CEM submodels with exact relative coordinates', () => {
      const bedrockNested = {
        format_version: '1.12.0',
        'minecraft:geometry': [
          {
            description: { identifier: 'geometry.pig', texture_width: 64, texture_height: 32 },
            bones: [
              {
                name: 'head',
                pivot: [0, 12, -6],
                cubes: [{ origin: [-4, 8, -14], size: [8, 8, 8], uv: [0, 0] }],
              },
              {
                name: 'snout',
                parent: 'head',
                pivot: [0, 10, -14],
                rotation: [15, 0, 0],
                cubes: [{ origin: [-2, 9, -15], size: [4, 3, 1], uv: [16, 16] }],
              },
            ],
          },
        ],
      };

      const jemOut = bedrockToJavaModels(JSON.stringify(bedrockNested), 'models/entity/pig.geo.json')[0];
      const jem = JSON.parse(jemOut.content);
      const head = jem.models[0];
      expect(head.translate).toEqual([0, -12, 6]);
      expect(head.submodels).toHaveLength(1);
      const snout = head.submodels[0];
      expect(snout.part).toBeUndefined();
      expect(snout.rotate).toEqual([-15, 0, 0]);

      // Round-trip back to Bedrock
      const backGeo = JSON.parse(javaToBedrockGeometry(jemOut.content, 'pig')!);
      const backSnout = backGeo['minecraft:geometry'][0].bones.find((b: any) => b.name === 'snout');
      expect(backSnout.parent).toBe('head');
      expect(backSnout.pivot).toEqual([0, 10, -14]);
      expect(backSnout.rotation).toEqual([15, 0, 0]);
      expect(backSnout.cubes[0].origin).toEqual([-2, 9, -15]);
    });

    it('handles multi-geometry mobs.json, :parent inheritance, and version deduplication', () => {
      const mobsJson = JSON.stringify({
        format_version: '1.8.0',
        'geometry.humanoid': {
          texturewidth: 64,
          textureheight: 64,
          bones: [{ name: 'head', pivot: [0, 24, 0], cubes: [{ origin: [-4, 24, -4], size: [8, 8, 8], uv: [0, 0] }] }],
        },
        'geometry.zombie:geometry.humanoid': {
          bones: [{ name: 'body', pivot: [0, 24, 0], cubes: [{ origin: [-4, 12, -2], size: [8, 12, 4], uv: [16, 16] }] }],
        },
        'geometry.zombie.v1.8:geometry.humanoid': {
          bones: [{ name: 'body', pivot: [0, 24, 0], cubes: [{ origin: [-4, 12, -2], size: [8, 12, 4], uv: [16, 16] }] }],
        },
        'geometry.irongolem': {
          texturewidth: 128,
          textureheight: 128,
          bones: [{ name: 'body', pivot: [0, 31, 0], cubes: [{ origin: [-9, 21, -6], size: [18, 12, 11], uv: [0, 40] }] }],
        },
      });

      const outputs = bedrockToJavaModels(mobsJson, 'models/mobs.json', { targetPackFormat: 46 });
      const paths = outputs.map((o) => o.outputPath);
      expect(paths).toContain('assets/minecraft/optifine/cem/zombie.jem');
      expect(paths).toContain('assets/minecraft/optifine/cem/iron_golem.jem');
      // Deduplicated zombie.jem
      expect(paths.filter((p) => p === 'assets/minecraft/optifine/cem/zombie.jem')).toHaveLength(1);
    });
  });

  describe('Security, JSONC & Robustness', () => {
    it('parses JSONC with // inside strings, BOM, and trailing commas without prototype pollution', () => {
      const jsonc = '\uFEFF{\n  "credit": "https://example.com // not a comment",\n  "format_version": "1.12.0",\n  "minecraft:geometry": [\n    {\n      "description": { "identifier": "geometry.block_safe", "texture_width": 16, "texture_height": 16, },\n      "bones": [{\n        "name": "root",\n        "pivot": [0,0,0],\n        "cubes": [{\n          "origin": [-8,0,-8], "size": [16,16,16],\n          "uv": { "__proto__": { "uv": [0,0] }, "north": { "uv": [0,0], "uv_size": [16,16] } },\n        }],\n      }],\n    },\n  ],\n}';
      const out = bedrockToJavaModels(jsonc, 'models/entity/block_safe.geo.json');
      expect(out).toHaveLength(1);
      const parsed = JSON.parse(out[0].content);
      expect(Object.prototype.hasOwnProperty.call(parsed.elements[0].faces, '__proto__')).toBe(false);
    });
  });

  describe('End-to-End convertBuffer Integration', () => {
    it('resolves Java parent models and CEM .jpm parts regardless of ZIP order', async () => {
      const childModel = {
        parent: 'minecraft:block/custom_base',
        textures: { '0': 'minecraft:block/stone' },
      };
      const baseModel = {
        elements: [{ from: [0, 0, 0], to: [16, 8, 16], faces: { up: { texture: '#0' } } }],
      };
      const jem = {
        textureSize: [64, 64],
        models: [{ part: 'head', model: 'hat.jpm', translate: [0, -24, 0] }],
      };
      const jpm = {
        invertAxis: 'xy',
        boxes: [{ coordinates: [-4, 24, -4, 8, 8, 8], textureOffset: [0, 0] }],
      };

      const inputZip = zipSync({
        'pack.mcmeta': strToU8(JSON.stringify({ pack: { pack_format: 46, description: 'Models' } })),
        // Child before parent!
        'assets/minecraft/models/block/slab_child.json': strToU8(JSON.stringify(childModel)),
        'assets/minecraft/models/block/custom_base.json': strToU8(JSON.stringify(baseModel)),
        'assets/minecraft/optifine/cem/zombie.jem': strToU8(JSON.stringify(jem)),
        'assets/minecraft/optifine/cem/hat.jpm': strToU8(JSON.stringify(jpm)),
        // Vanilla-only redirect should be skipped cleanly
        'assets/minecraft/models/block/vanilla_only.json': strToU8(JSON.stringify({ parent: 'minecraft:block/cube_all' })),
      });

      const { buffer, report } = await convertBuffer(toArrayBuffer(inputZip), 'models.zip', {
        ...baseOptions,
        direction: 'java-to-bedrock',
      });

      expect(report.errorCount).toBe(0);
      const out = unzipSync(buffer);
      expect(out['models/entity/block_slab_child.geo.json']).toBeDefined();
      expect(out['models/entity/zombie.geo.json']).toBeDefined();
      const zombieGeo = JSON.parse(strFromU8(out['models/entity/zombie.geo.json']));
      expect(zombieGeo['minecraft:geometry'][0].bones[0].cubes).toHaveLength(1);
    });
  });
});
