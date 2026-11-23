import { getTargetContext } from '../rules';
import { isUnsafeObjectKey } from '../security';
import { getBedrockAtlasTile } from './animation';
import { decodePngToRgbaSync } from './pbr';
import { encodeRgbaToPngSync, encodeRgbaToTgaSync } from './tga';

export interface BedrockLeafSpec {
  bedrockBase: string;
  fancyExt: 'tga' | 'png';
  terrainKey: string;
  carriedKey?: string;
  carriedTint?: [number, number, number];
}

export const BEDROCK_LEAF_SPECS: Record<string, BedrockLeafSpec> = {
  'assets/minecraft/textures/block/oak_leaves.png': {
    bedrockBase: 'leaves_oak',
    fancyExt: 'tga',
    terrainKey: 'oak_leaves',
    carriedKey: 'oak_leaves_carried',
    carriedTint: [68, 178, 17],
  },
  'assets/minecraft/textures/block/spruce_leaves.png': {
    bedrockBase: 'leaves_spruce',
    fancyExt: 'tga',
    terrainKey: 'spruce_leaves',
    carriedKey: 'spruce_leaves_carried',
    carriedTint: [96, 154, 96],
  },
  'assets/minecraft/textures/block/birch_leaves.png': {
    bedrockBase: 'leaves_birch',
    fancyExt: 'tga',
    terrainKey: 'birch_leaves',
    carriedKey: 'birch_leaves_carried',
    carriedTint: [127, 169, 82],
  },
  'assets/minecraft/textures/block/jungle_leaves.png': {
    bedrockBase: 'leaves_jungle',
    fancyExt: 'tga',
    terrainKey: 'jungle_leaves',
    carriedKey: 'jungle_leaves_carried',
    carriedTint: [99, 189, 26],
  },
  'assets/minecraft/textures/block/acacia_leaves.png': {
    bedrockBase: 'leaves_acacia',
    fancyExt: 'tga',
    terrainKey: 'acacia_leaves',
    carriedKey: 'acacia_leaves_carried',
    carriedTint: [77, 198, 20],
  },
  'assets/minecraft/textures/block/dark_oak_leaves.png': {
    bedrockBase: 'leaves_big_oak',
    fancyExt: 'tga',
    terrainKey: 'big_oak_leaves',
    carriedKey: 'big_oak_leaves_carried',
    carriedTint: [75, 194, 20],
  },
  'assets/minecraft/textures/block/mangrove_leaves.png': {
    bedrockBase: 'mangrove_leaves',
    fancyExt: 'tga',
    terrainKey: 'mangrove_leaves',
    carriedKey: 'mangrove_leaves_carried',
    carriedTint: [149, 197, 75],
  },
  'assets/minecraft/textures/block/azalea_leaves.png': {
    bedrockBase: 'azalea_leaves',
    fancyExt: 'tga',
    terrainKey: 'azalea_leaves',
  },
  'assets/minecraft/textures/block/flowering_azalea_leaves.png': {
    bedrockBase: 'azalea_leaves_flowers',
    fancyExt: 'tga',
    terrainKey: 'azalea_leaves_flowered',
  },
  'assets/minecraft/textures/block/cherry_leaves.png': {
    bedrockBase: 'cherry_leaves',
    fancyExt: 'tga',
    terrainKey: 'cherry_leaves',
  },
  'assets/minecraft/textures/block/pale_oak_leaves.png': {
    bedrockBase: 'pale_oak_leaves',
    fancyExt: 'tga',
    terrainKey: 'pale_oak_leaves',
  },
  'assets/minecraft/textures/block/orange_poplar_leaves.png': {
    bedrockBase: 'orange_poplar_leaves',
    fancyExt: 'png',
    terrainKey: 'orange_poplar_leaves',
  },
  'assets/minecraft/textures/block/red_poplar_leaves.png': {
    bedrockBase: 'red_poplar_leaves',
    fancyExt: 'png',
    terrainKey: 'red_poplar_leaves',
  },
  'assets/minecraft/textures/block/yellow_poplar_leaves.png': {
    bedrockBase: 'yellow_poplar_leaves',
    fancyExt: 'png',
    terrainKey: 'yellow_poplar_leaves',
  },
};

const BEDROCK_LEAF_OPAQUE_BASES = new Set(Object.values(BEDROCK_LEAF_SPECS).map(s => `${s.bedrockBase}_opaque`));
const BEDROCK_LEAF_CARRIED_BASES = new Set(
  Object.values(BEDROCK_LEAF_SPECS).filter(s => s.carriedKey).map(s => `${s.bedrockBase}_carried`)
);

export function getBedrockLeafSpec(javaRelPath: string): BedrockLeafSpec | null {
  return Object.hasOwn(BEDROCK_LEAF_SPECS, javaRelPath) ? BEDROCK_LEAF_SPECS[javaRelPath] : null;
}

export function isBedrockOpaqueLeafPath(bedrockRelPath: string): boolean {
  const m = bedrockRelPath.match(/^textures\/blocks?\/([^/]+)\.(png|tga)$/i);
  return m ? BEDROCK_LEAF_OPAQUE_BASES.has(m[1].toLowerCase()) : false;
}

export function isBedrockCarriedLeafPath(bedrockRelPath: string): boolean {
  const m = bedrockRelPath.match(/^textures\/blocks?\/([^/]+)\.(png|tga)$/i);
  return m ? BEDROCK_LEAF_CARRIED_BASES.has(m[1].toLowerCase()) : false;
}

/**
 * Synthesizes Bedrock Fancy (.tga/.png), Opaque (_opaque.png), and Carried (_carried.tga) leaf textures
 * from a single Java Edition leaf PNG.
 */
export function synthesizeBedrockLeafTextures(
  javaRelPath: string,
  pngBytes: Uint8Array
): Record<string, Uint8Array> | null {
  const spec = getBedrockLeafSpec(javaRelPath);
  if (!spec) return null;

  const decoded = decodePngToRgbaSync(pngBytes);
  if (!decoded) {
    const out: Record<string, Uint8Array> = {
      [`textures/blocks/${spec.bedrockBase}.png`]: pngBytes,
      [`textures/blocks/${spec.bedrockBase}_opaque.png`]: pngBytes,
    };
    if (spec.carriedTint) {
      out[`textures/blocks/${spec.bedrockBase}_carried.png`] = pngBytes;
    }
    return out;
  }

  const { width, height, rgba } = decoded;
  const totalPixels = width * height;
  const out: Record<string, Uint8Array> = {};

  // 1. Fancy leaf (.tga or .png)
  out[`textures/blocks/${spec.bedrockBase}.${spec.fancyExt}`] =
    spec.fancyExt === 'tga' ? encodeRgbaToTgaSync(width, height, rgba) : pngBytes;

  // 2. Opaque leaf (_opaque.png): fill transparent holes with darkened average leaf RGB
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (rgba[idx + 3] >= 128) {
      sumR += rgba[idx];
      sumG += rgba[idx + 1];
      sumB += rgba[idx + 2];
      count++;
    }
  }
  const bgR = count > 0 ? Math.round((sumR / count) * 0.25) : 35;
  const bgG = count > 0 ? Math.round((sumG / count) * 0.25) : 35;
  const bgB = count > 0 ? Math.round((sumB / count) * 0.25) : 35;

  const opaqueRgba = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (rgba[idx + 3] >= 128) {
      opaqueRgba[idx] = rgba[idx];
      opaqueRgba[idx + 1] = rgba[idx + 1];
      opaqueRgba[idx + 2] = rgba[idx + 2];
    } else {
      opaqueRgba[idx] = bgR;
      opaqueRgba[idx + 1] = bgG;
      opaqueRgba[idx + 2] = bgB;
    }
    opaqueRgba[idx + 3] = 255;
  }
  out[`textures/blocks/${spec.bedrockBase}_opaque.png`] = encodeRgbaToPngSync(width, height, opaqueRgba);

  // 3. Carried leaf (_carried.tga) with biome-tinted RGB
  if (spec.carriedTint) {
    const [tr, tg, tb] = spec.carriedTint;
    const carriedRgba = new Uint8Array(totalPixels * 4);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      carriedRgba[idx] = Math.round((rgba[idx] * tr) / 255);
      carriedRgba[idx + 1] = Math.round((rgba[idx + 1] * tg) / 255);
      carriedRgba[idx + 2] = Math.round((rgba[idx + 2] * tb) / 255);
      carriedRgba[idx + 3] = rgba[idx + 3];
    }
    out[`textures/blocks/${spec.bedrockBase}_carried.tga`] = encodeRgbaToTgaSync(width, height, carriedRgba);
  }

  return out;
}

/**
 * Generates Bedrock Edition terrain_texture.json content
 * based on the blocks encountered during conversion.
 */
export function generateTerrainTexture(convertedBlocks: Set<string>): string {
  const terrainTexture: any = {
    resource_pack_name: "pack.name",
    texture_name: "atlas.terrain",
    num_mip_levels: 4,
    padding: 8,
    texture_data: Object.create(null)
  };

  for (const javaPath of convertedBlocks) {
    const leafSpec = getBedrockLeafSpec(javaPath);
    if (leafSpec) {
      terrainTexture.texture_data[leafSpec.terrainKey] = {
        textures: [
          `textures/blocks/${leafSpec.bedrockBase}`,
          `textures/blocks/${leafSpec.bedrockBase}_opaque`,
        ]
      };
      if (leafSpec.carriedKey) {
        terrainTexture.texture_data[leafSpec.carriedKey] = {
          textures: [
            `textures/blocks/${leafSpec.bedrockBase}_carried`,
            `textures/blocks/${leafSpec.bedrockBase}_carried`,
          ]
        };
      }
      continue;
    }

    if (
      javaPath === 'assets/minecraft/textures/block/grass_block_side.png' ||
      javaPath === 'assets/minecraft/textures/block/grass_block_side_overlay.png'
    ) {
      continue;
    }

    const bedrockPath = getTargetContext(javaPath, 'java-to-bedrock');
    if (bedrockPath && bedrockPath.startsWith('textures/blocks/')) {
      const texturePath = bedrockPath.replace(/\.(png|tga)$/, ''); // Bedrock paths skip extension
      const shortName = getBedrockAtlasTile(texturePath);
      if (!shortName || isUnsafeObjectKey(shortName)) continue;

      terrainTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(terrainTexture, null, 2);
}
