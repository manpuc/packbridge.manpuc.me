export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ICONS_MAPPINGS: Record<string, CropBox> = {
  "textures/ui/cross_hair.png": { x: 0, y: 0, w: 15, h: 15 },
  "textures/ui/heart_background.png": { x: 16, y: 0, w: 9, h: 9 },
  "textures/ui/heart.png": { x: 52, y: 0, w: 9, h: 9 },
  "textures/ui/heart_half.png": { x: 61, y: 0, w: 9, h: 9 },
  "textures/ui/hunger_background.png": { x: 16, y: 27, w: 9, h: 9 },
  "textures/ui/hunger_full.png": { x: 52, y: 27, w: 9, h: 9 },
  "textures/ui/hunger_half.png": { x: 61, y: 27, w: 9, h: 9 },
  "textures/ui/armor_empty.png": { x: 16, y: 9, w: 9, h: 9 },
  "textures/ui/armor_full.png": { x: 34, y: 9, w: 9, h: 9 },
  "textures/ui/armor_half.png": { x: 25, y: 9, w: 9, h: 9 },
  "textures/ui/bubble.png": { x: 16, y: 18, w: 9, h: 9 },
  "textures/ui/bubble_pop.png": { x: 25, y: 18, w: 9, h: 9 },
  "textures/ui/horse_jump_empty.png": { x: 0, y: 84, w: 18, h: 5 },
  "textures/ui/horse_jump_full.png": { x: 0, y: 89, w: 18, h: 5 }
};

export const WIDGETS_MAPPINGS: Record<string, CropBox> = {
  "textures/ui/hotbar_start.png": { x: 0, y: 0, w: 20, h: 22 }, // Left cap
  "textures/ui/hotbar_0.png": { x: 20, y: 0, w: 20, h: 22 },    // Slot
  "textures/ui/hotbar_end.png": { x: 162, y: 0, w: 20, h: 22 }, // Right cap
  "textures/ui/selected_hotbar_slot.png": { x: 0, y: 22, w: 24, h: 24 }
};

// More mappings can be added (e.g. inventory.png)

export async function processGuiSpriteSheet(
  pngData: Uint8Array,
  mappings: Record<string, CropBox>
): Promise<Record<string, Uint8Array>> {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('OffscreenCanvas or createImageBitmap is not supported in this environment');
  }

  const blob = new Blob([pngData as any], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);
  const results: Record<string, Uint8Array> = {};

  for (const [targetPath, box] of Object.entries(mappings)) {
    const canvas = new OffscreenCanvas(box.w, box.h);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    // Draw only the specified crop area
    ctx.drawImage(bitmap, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    
    const outBlob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await outBlob.arrayBuffer();
    results[targetPath] = new Uint8Array(buffer);
  }

  return results;
}
