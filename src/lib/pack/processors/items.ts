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
      const texturePath = bedrockPath.replace(/\.(png|tga)$/, '');
      const shortName = texturePath.split('/').pop() || '';
      if (!shortName || isUnsafeObjectKey(shortName)) continue;

      itemTexture.texture_data[shortName] = {
        textures: texturePath
      };
    }
  }

  return JSON.stringify(itemTexture, null, 2);
}
