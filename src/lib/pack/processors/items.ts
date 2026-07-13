import { getActiveMappings, getFallbackMappings } from '../rules';

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

  const active = getActiveMappings();
  const fallback = getFallbackMappings();

  for (const javaPath of convertedItems) {
    // Normalize path for mappings lookup (assets/minecraft/ -> assets/)
    const lookupPath = javaPath.replace(/^assets\/minecraft\//, 'assets/');
    const bedrockPath = active.java_to_bedrock[lookupPath] || fallback.java_to_bedrock[lookupPath];
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
