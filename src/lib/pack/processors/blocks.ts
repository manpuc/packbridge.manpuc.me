import { getTargetContext } from '../rules';
import { isUnsafeObjectKey } from '../security';
import { getBedrockAtlasTile } from './animation';

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
