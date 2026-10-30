import { getTargetContext } from '../rules';
import { isUnsafeObjectKey } from '../security';

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
      // Remove textures/ prefix and .png extension for the short name
      const shortName = bedrockPath.replace('textures/blocks/', '').replace(/\.(png|tga)$/, '');
      if (!shortName || isUnsafeObjectKey(shortName)) continue;
      const texturePath = bedrockPath.replace(/\.(png|tga)$/, ''); // Bedrock paths skip extension

      terrainTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(terrainTexture, null, 2);
}

/**
 * Generates a basic Bedrock Edition blocks.json content.
 * This maps block IDs to the texture short names defined in terrain_texture.json.
 */
export function generateBlocksJson(convertedBlocks: Set<string>): string {
  const blocksJson: Record<string, any> = Object.create(null);
  blocksJson.format_version = "1.16.0";

  for (const javaPath of convertedBlocks) {
    const bedrockPath = getTargetContext(javaPath, 'java-to-bedrock');
    if (bedrockPath && bedrockPath.startsWith('textures/blocks/')) {
      const shortName = bedrockPath.replace('textures/blocks/', '').replace(/\.(png|tga)$/, '');
      if (!shortName || isUnsafeObjectKey(shortName) || shortName === 'format_version') continue;

      // Use texture short name directly as block ID
      blocksJson[shortName] = {
        textures: shortName,
        sound: "stone" // Default sound
      };
    }
  }

  return JSON.stringify(blocksJson, null, 2);
}
