import { getActiveMappings, getFallbackMappings } from '../rules';

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
    texture_data: {}
  };

  const active = getActiveMappings();
  const fallback = getFallbackMappings();

  for (const javaPath of convertedBlocks) {
    const lookupPath = javaPath.replace(/^assets\/minecraft\//, 'assets/');
    const bedrockPath = active.java_to_bedrock[javaPath] || fallback.java_to_bedrock[lookupPath];
    if (bedrockPath && bedrockPath.startsWith('textures/blocks/')) {
      // Remove textures/ prefix and .png extension for the short name
      const shortName = bedrockPath.replace('textures/blocks/', '').replace('.png', '');
      const texturePath = bedrockPath.replace('.png', ''); // Bedrock paths skip .png

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
  const blocksJson: Record<string, any> = {
    format_version: [1, 1, 0]
  };

  const active = getActiveMappings();
  const fallback = getFallbackMappings();

  for (const javaPath of convertedBlocks) {
    const lookupPath = javaPath.replace(/^assets\/minecraft\//, 'assets/');
    const bedrockPath = active.java_to_bedrock[javaPath] || fallback.java_to_bedrock[lookupPath];
    if (bedrockPath && bedrockPath.startsWith('textures/blocks/')) {
      const shortName = bedrockPath.replace('textures/blocks/', '').replace('.png', '');

      // Use texture short name directly as block ID
      blocksJson[shortName] = {
        textures: shortName,
        sound: "stone" // Default sound
      };
    }
  }

  return JSON.stringify(blocksJson, null, 2);
}
