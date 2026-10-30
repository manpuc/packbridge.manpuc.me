import { getTargetContext } from '../rules';
import { isUnsafeObjectKey } from '../security';

/**
 * Generates Bedrock Edition item_texture.json content
 * based on the items encountered during conversion.
 */
export function generateItemTexture(convertedItems: Set<string>): string {
  const itemTexture: any = {
    resource_pack_name: "pack.name",
    texture_name: "atlas.items",
    texture_data: Object.create(null)
  };

  for (const javaPath of convertedItems) {
    const bedrockPath = getTargetContext(javaPath, 'java-to-bedrock');
    if (bedrockPath && bedrockPath.startsWith('textures/items/')) {
      // Remove textures/items/ prefix and .png extension for the short name
      // e.g. textures/items/apple.png -> apple
      const shortName = bedrockPath.replace('textures/items/', '').replace(/\.(png|tga)$/, '');
      if (!shortName || isUnsafeObjectKey(shortName)) continue;
      const texturePath = bedrockPath.replace(/\.(png|tga)$/, '');

      itemTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(itemTexture, null, 2);
}
