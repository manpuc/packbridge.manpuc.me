import mappings from '../mappings.json';

/**
 * Generates Bedrock Edition item_texture.json content
 * based on the items encountered during conversion.
 */
export function generateItemTexture(convertedItems: Set<string>): string {
  const itemTexture: any = {
    resource_pack_name: "pack.name",
    texture_name: "atlas.items",
    texture_data: {}
  };

  for (const javaPath of convertedItems) {
    const bedrockPath = (mappings as any).java_to_bedrock[javaPath];
    if (bedrockPath && bedrockPath.startsWith('textures/items/')) {
      // Remove textures/items/ prefix and .png extension for the short name
      // e.g. textures/items/apple.png -> apple
      const shortName = bedrockPath.replace('textures/items/', '').replace('.png', '');
      const texturePath = bedrockPath.replace('.png', '');

      itemTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(itemTexture, null, 2);
}
