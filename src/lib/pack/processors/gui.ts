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

/**
 * Java 1.20.2+ split GUI sprites mapping (assets/minecraft/textures/gui/sprites/... <-> Bedrock textures/ui/...)
 */
export const MODERN_GUI_SPRITE_JAVA_TO_BEDROCK: Record<string, string> = {
  "assets/minecraft/textures/gui/sprites/hud/crosshair.png": "textures/ui/cross_hair.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/container.png": "textures/ui/heart_background.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/container_blinking.png": "textures/ui/heart_blink.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/full.png": "textures/ui/heart.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/half.png": "textures/ui/heart_half.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/absorbing_full.png": "textures/ui/absorption_heart.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/absorbing_half.png": "textures/ui/absorption_heart_half.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/poisoned_full.png": "textures/ui/poison_heart.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/poisoned_half.png": "textures/ui/poison_heart_half.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/withered_full.png": "textures/ui/wither_heart.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/withered_half.png": "textures/ui/wither_heart_half.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/frozen_full.png": "textures/ui/freeze_heart.png",
  "assets/minecraft/textures/gui/sprites/hud/heart/frozen_half.png": "textures/ui/freeze_heart_half.png",
  "assets/minecraft/textures/gui/sprites/hud/food_empty.png": "textures/ui/hunger_background.png",
  "assets/minecraft/textures/gui/sprites/hud/food_full.png": "textures/ui/hunger_full.png",
  "assets/minecraft/textures/gui/sprites/hud/food_half.png": "textures/ui/hunger_half.png",
  "assets/minecraft/textures/gui/sprites/hud/food_empty_hunger.png": "textures/ui/hunger_effect_background.png",
  "assets/minecraft/textures/gui/sprites/hud/food_full_hunger.png": "textures/ui/hunger_effect_full.png",
  "assets/minecraft/textures/gui/sprites/hud/food_half_hunger.png": "textures/ui/hunger_effect_half.png",
  "assets/minecraft/textures/gui/sprites/hud/armor_empty.png": "textures/ui/armor_empty.png",
  "assets/minecraft/textures/gui/sprites/hud/armor_full.png": "textures/ui/armor_full.png",
  "assets/minecraft/textures/gui/sprites/hud/armor_half.png": "textures/ui/armor_half.png",
  "assets/minecraft/textures/gui/sprites/hud/air.png": "textures/ui/bubble.png",
  "assets/minecraft/textures/gui/sprites/hud/air_bursting.png": "textures/ui/bubble_pop.png",
  "assets/minecraft/textures/gui/sprites/hud/hotbar_selection.png": "textures/ui/selected_hotbar_slot.png",
  "assets/minecraft/textures/gui/sprites/hud/experience_bar_background.png": "textures/ui/experiencenub.png",
  "assets/minecraft/textures/gui/sprites/hud/jump_bar_background.png": "textures/ui/horse_jump_empty.png",
  "assets/minecraft/textures/gui/sprites/hud/jump_bar_progress.png": "textures/ui/horse_jump_full.png"
};

export const MODERN_GUI_SPRITE_BEDROCK_TO_JAVA: Record<string, string> = Object.entries(
  MODERN_GUI_SPRITE_JAVA_TO_BEDROCK
).reduce((acc, [jPath, bPath]) => {
  if (!acc[bPath]) acc[bPath] = jPath;
  return acc;
}, Object.create(null) as Record<string, string>);

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

  try {
    // Standard Minecraft GUI sprite sheet base resolution is 256px
    const scale = bitmap.width > 0 ? bitmap.width / 256 : 1;

    for (const [targetPath, box] of Object.entries(mappings)) {
      const sx = Math.round(box.x * scale);
      const sy = Math.round(box.y * scale);
      const sw = Math.max(1, Math.round(box.w * scale));
      const sh = Math.max(1, Math.round(box.h * scale));

      const canvas = new OffscreenCanvas(sw, sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Draw only the specified crop area
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

      const outBlob = await canvas.convertToBlob({ type: 'image/png' });
      const buffer = await outBlob.arrayBuffer();
      results[targetPath] = new Uint8Array(buffer);
    }
  } finally {
    bitmap.close();
  }

  return results;
}
