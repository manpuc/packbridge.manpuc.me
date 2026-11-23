import { encodeRgbaToPngSync, getPngDimensions } from './tga';
import { decodeImageToRgbaSync, decodePngToRgbaSync } from './pbr';

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BedrockSemver = [number, number, number];

export interface GuiSpriteSpec {
  javaSprite: string;
  box: CropBox;
  bedrockPath?: string;
  minJavaFormat?: number;
  minBedrockVersion?: BedrockSemver;
  mcmeta?: string;
  /** False when another sprite shares the exact same sheet box (avoid overwriting primary when stitching). */
  primaryBoxOwner?: boolean;
}

const MAX_GUI_DIMENSION = 8192;

export function compareBedrockVersion(a: BedrockSemver, b: BedrockSemver): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function isJavaVillager2Version(packFormat: number, versionId?: string): boolean {
  return packFormat >= 4 && packFormat <= 15 && versionId !== '1.13.0';
}

export function migrateJavaGuiContainerPath(
  path: string,
  targetPackFormat: number,
  targetVersionId?: string
): string {
  if (path === 'assets/minecraft/textures/gui/container/villager.png' && isJavaVillager2Version(targetPackFormat, targetVersionId)) {
    return 'assets/minecraft/textures/gui/container/villager2.png';
  }
  if (path === 'assets/minecraft/textures/gui/container/villager2.png' && !isJavaVillager2Version(targetPackFormat, targetVersionId)) {
    return 'assets/minecraft/textures/gui/container/villager.png';
  }
  return path;
}

export const BUTTON_WIDGET_METADATA = JSON.stringify(
  {
    gui: {
      scaling: {
        type: 'nine_slice',
        width: 200,
        height: 20,
        border: { left: 20, top: 4, right: 20, bottom: 4 },
      },
    },
  },
  null,
  2
);

const SPRITE_PREFIX = 'assets/minecraft/textures/gui/sprites/';

export const HOTBAR_SLICE_MAPPINGS: Record<string, CropBox> = {
  'textures/ui/hotbar_start_cap.png': { x: 0, y: 0, w: 1, h: 22 },
  'textures/ui/hotbar_0.png': { x: 1, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_1.png': { x: 21, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_2.png': { x: 41, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_3.png': { x: 61, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_4.png': { x: 81, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_5.png': { x: 101, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_6.png': { x: 121, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_7.png': { x: 141, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_8.png': { x: 161, y: 0, w: 20, h: 22 },
  'textures/ui/hotbar_end_cap.png': { x: 181, y: 0, w: 1, h: 22 },
};

const HARDCORE_BEDROCK: BedrockSemver = [1, 21, 50];
const FROZEN_BEDROCK: BedrockSemver = [1, 17, 0];

export const JAVA_ICONS_SPRITES: GuiSpriteSpec[] = [
  { javaSprite: `${SPRITE_PREFIX}hud/crosshair.png`, box: { x: 0, y: 0, w: 15, h: 15 } },

  // Normal hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/container.png`, box: { x: 16, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart_background.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/container_blinking.png`, box: { x: 25, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart_blink.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/full.png`, box: { x: 52, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/half.png`, box: { x: 61, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/full_blinking.png`, box: { x: 70, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart_flash.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/half_blinking.png`, box: { x: 79, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/heart_flash_half.png' },

  // Poisoned hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_full.png`, box: { x: 88, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/poison_heart.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_half.png`, box: { x: 97, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/poison_heart_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_full_blinking.png`, box: { x: 106, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/poison_heart_flash.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_half_blinking.png`, box: { x: 115, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/poison_heart_flash_half.png' },

  // Withered hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_full.png`, box: { x: 124, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/wither_heart.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_half.png`, box: { x: 133, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/wither_heart_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_full_blinking.png`, box: { x: 142, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/wither_heart_flash.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_half_blinking.png`, box: { x: 151, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/wither_heart_flash_half.png' },

  // Absorbing hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_full.png`, box: { x: 160, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/absorption_heart.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_half.png`, box: { x: 169, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/absorption_heart_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_full_blinking.png`, box: { x: 160, y: 0, w: 9, h: 9 }, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_half_blinking.png`, box: { x: 169, y: 0, w: 9, h: 9 }, primaryBoxOwner: false },

  // Frozen hearts (Java 1.17+ / Bedrock 1.17+)
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_full.png`, box: { x: 178, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/freeze_heart.png', minJavaFormat: 7, minBedrockVersion: FROZEN_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_half.png`, box: { x: 187, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/freeze_heart_half.png', minJavaFormat: 7, minBedrockVersion: FROZEN_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_full_blinking.png`, box: { x: 178, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/freeze_heart_flash.png', minJavaFormat: 7, minBedrockVersion: FROZEN_BEDROCK, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_half_blinking.png`, box: { x: 187, y: 0, w: 9, h: 9 }, bedrockPath: 'textures/ui/freeze_heart_flash_half.png', minJavaFormat: 7, minBedrockVersion: FROZEN_BEDROCK, primaryBoxOwner: false },

  // Hardcore hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/container_hardcore.png`, box: { x: 16, y: 45, w: 9, h: 9 } },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/container_hardcore_blinking.png`, box: { x: 25, y: 45, w: 9, h: 9 } },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/hardcore_full.png`, box: { x: 52, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/heart.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/hardcore_half.png`, box: { x: 61, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/heart_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/hardcore_full_blinking.png`, box: { x: 70, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/heart_flash.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/hardcore_half_blinking.png`, box: { x: 79, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/heart_flash_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_hardcore_full.png`, box: { x: 88, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/poison_heart.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_hardcore_half.png`, box: { x: 97, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/poison_heart_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_hardcore_full_blinking.png`, box: { x: 106, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/poison_heart_flash.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/poisoned_hardcore_half_blinking.png`, box: { x: 115, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/poison_heart_flash_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_hardcore_full.png`, box: { x: 124, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/wither_heart.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_hardcore_half.png`, box: { x: 133, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/wither_heart_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_hardcore_full_blinking.png`, box: { x: 142, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/wither_heart_flash.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/withered_hardcore_half_blinking.png`, box: { x: 151, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/wither_heart_flash_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_hardcore_full.png`, box: { x: 160, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/absorption_heart.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_hardcore_half.png`, box: { x: 169, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/absorption_heart_half.png', minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_hardcore_full_blinking.png`, box: { x: 160, y: 45, w: 9, h: 9 }, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/absorbing_hardcore_half_blinking.png`, box: { x: 169, y: 45, w: 9, h: 9 }, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_hardcore_full.png`, box: { x: 178, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/freeze_heart.png', minJavaFormat: 7, minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_hardcore_half.png`, box: { x: 187, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/freeze_heart_half.png', minJavaFormat: 7, minBedrockVersion: HARDCORE_BEDROCK },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_hardcore_full_blinking.png`, box: { x: 178, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/freeze_heart_flash.png', minJavaFormat: 7, minBedrockVersion: HARDCORE_BEDROCK, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/frozen_hardcore_half_blinking.png`, box: { x: 187, y: 45, w: 9, h: 9 }, bedrockPath: 'textures/ui/hardcore/freeze_heart_flash_half.png', minJavaFormat: 7, minBedrockVersion: HARDCORE_BEDROCK, primaryBoxOwner: false },

  // Vehicle hearts
  { javaSprite: `${SPRITE_PREFIX}hud/heart/vehicle_container.png`, box: { x: 52, y: 9, w: 9, h: 9 } },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/vehicle_full.png`, box: { x: 88, y: 9, w: 9, h: 9 }, bedrockPath: 'textures/ui/horse_heart.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/heart/vehicle_half.png`, box: { x: 97, y: 9, w: 9, h: 9 }, bedrockPath: 'textures/ui/horse_heart_half.png' },

  // Armor
  { javaSprite: `${SPRITE_PREFIX}hud/armor_empty.png`, box: { x: 16, y: 9, w: 9, h: 9 }, bedrockPath: 'textures/ui/armor_empty.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/armor_half.png`, box: { x: 25, y: 9, w: 9, h: 9 }, bedrockPath: 'textures/ui/armor_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/armor_full.png`, box: { x: 34, y: 9, w: 9, h: 9 }, bedrockPath: 'textures/ui/armor_full.png' },

  // Air bubbles
  { javaSprite: `${SPRITE_PREFIX}hud/air.png`, box: { x: 16, y: 18, w: 9, h: 9 }, bedrockPath: 'textures/ui/bubble.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/air_bursting.png`, box: { x: 25, y: 18, w: 9, h: 9 }, bedrockPath: 'textures/ui/bubble_pop.png' },

  // Food / hunger
  { javaSprite: `${SPRITE_PREFIX}hud/food_empty.png`, box: { x: 16, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_background.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/food_full.png`, box: { x: 52, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_full.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/food_half.png`, box: { x: 61, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_half.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/food_empty_hunger.png`, box: { x: 133, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_effect_background.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/food_full_hunger.png`, box: { x: 88, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_effect_full.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/food_half_hunger.png`, box: { x: 97, y: 27, w: 9, h: 9 }, bedrockPath: 'textures/ui/hunger_effect_half.png' },

  // Bars & attack indicators
  { javaSprite: `${SPRITE_PREFIX}hud/experience_bar_background.png`, box: { x: 0, y: 64, w: 182, h: 5 } },
  { javaSprite: `${SPRITE_PREFIX}hud/experience_bar_progress.png`, box: { x: 0, y: 69, w: 182, h: 5 } },
  { javaSprite: `${SPRITE_PREFIX}hud/jump_bar_cooldown.png`, box: { x: 0, y: 74, w: 182, h: 5 } },
  { javaSprite: `${SPRITE_PREFIX}hud/jump_bar_background.png`, box: { x: 0, y: 84, w: 182, h: 5 }, bedrockPath: 'textures/ui/horse_jump_empty.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/jump_bar_progress.png`, box: { x: 0, y: 89, w: 182, h: 5 }, bedrockPath: 'textures/ui/horse_jump_full.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar_attack_indicator_background.png`, box: { x: 0, y: 94, w: 18, h: 18 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar_attack_indicator_progress.png`, box: { x: 18, y: 94, w: 18, h: 18 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}hud/crosshair_attack_indicator_background.png`, box: { x: 36, y: 94, w: 16, h: 4 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}hud/crosshair_attack_indicator_progress.png`, box: { x: 52, y: 94, w: 16, h: 4 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}hud/crosshair_attack_indicator_full.png`, box: { x: 68, y: 94, w: 16, h: 16 }, minJavaFormat: 2 },

  // Ping icons
  ...[5, 4, 3, 2, 1].map((n, i) => ({
    javaSprite: `${SPRITE_PREFIX}icon/ping_${n}.png`,
    box: { x: 0, y: 176 + i * 8, w: 10, h: 8 },
  })),
  { javaSprite: `${SPRITE_PREFIX}icon/ping_unknown.png`, box: { x: 0, y: 216, w: 10, h: 8 } },
  ...[5, 4, 3, 2, 1].map((n, i) => ({
    javaSprite: `${SPRITE_PREFIX}server_list/ping_${n}.png`,
    box: { x: 0, y: 176 + i * 8, w: 10, h: 8 },
    primaryBoxOwner: false,
  })),
  ...[1, 2, 3, 4, 5].map((n, i) => ({
    javaSprite: `${SPRITE_PREFIX}server_list/pinging_${n}.png`,
    box: { x: 10, y: 176 + i * 8, w: 10, h: 8 },
  })),
  { javaSprite: `${SPRITE_PREFIX}server_list/incompatible.png`, box: { x: 0, y: 216, w: 10, h: 8 }, primaryBoxOwner: false },
  { javaSprite: `${SPRITE_PREFIX}server_list/unreachable.png`, box: { x: 0, y: 216, w: 10, h: 8 }, primaryBoxOwner: false },
];

export const JAVA_WIDGETS_SPRITES: GuiSpriteSpec[] = [
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar.png`, box: { x: 0, y: 0, w: 182, h: 22 } },
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar_selection.png`, box: { x: 0, y: 22, w: 24, h: 23 }, bedrockPath: 'textures/ui/selected_hotbar_slot.png' },
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar_offhand_left.png`, box: { x: 24, y: 22, w: 29, h: 24 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}hud/hotbar_offhand_right.png`, box: { x: 53, y: 22, w: 29, h: 24 }, minJavaFormat: 2 },
  { javaSprite: `${SPRITE_PREFIX}widget/button_disabled.png`, box: { x: 0, y: 46, w: 200, h: 20 }, mcmeta: BUTTON_WIDGET_METADATA },
  { javaSprite: `${SPRITE_PREFIX}widget/button.png`, box: { x: 0, y: 66, w: 200, h: 20 }, mcmeta: BUTTON_WIDGET_METADATA },
  { javaSprite: `${SPRITE_PREFIX}widget/button_highlighted.png`, box: { x: 0, y: 86, w: 200, h: 20 }, mcmeta: BUTTON_WIDGET_METADATA },
  { javaSprite: `${SPRITE_PREFIX}widget/locked_button.png`, box: { x: 0, y: 146, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}widget/locked_button_highlighted.png`, box: { x: 0, y: 166, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}widget/locked_button_disabled.png`, box: { x: 0, y: 186, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}widget/unlocked_button.png`, box: { x: 20, y: 146, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}widget/unlocked_button_highlighted.png`, box: { x: 20, y: 166, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}widget/unlocked_button_disabled.png`, box: { x: 20, y: 186, w: 20, h: 20 } },
  { javaSprite: `${SPRITE_PREFIX}icon/draft_report.png`, box: { x: 182, y: 24, w: 15, h: 15 }, minJavaFormat: 9 },
];

const BOSS_BAR_COLORS = ['pink', 'blue', 'red', 'green', 'yellow', 'purple', 'white'];
const BOSS_BAR_NOTCHES = [6, 10, 12, 20];

export const JAVA_BARS_SPRITES: GuiSpriteSpec[] = [
  ...BOSS_BAR_COLORS.flatMap((c, i) => [
    { javaSprite: `${SPRITE_PREFIX}boss_bar/${c}_background.png`, box: { x: 0, y: i * 10, w: 182, h: 5 }, minJavaFormat: 2 },
    { javaSprite: `${SPRITE_PREFIX}boss_bar/${c}_progress.png`, box: { x: 0, y: i * 10 + 5, w: 182, h: 5 }, minJavaFormat: 2 },
  ]),
  ...BOSS_BAR_NOTCHES.flatMap((n, i) => [
    { javaSprite: `${SPRITE_PREFIX}boss_bar/notched_${n}_background.png`, box: { x: 0, y: 80 + i * 10, w: 182, h: 5 }, minJavaFormat: 2 },
    { javaSprite: `${SPRITE_PREFIX}boss_bar/notched_${n}_progress.png`, box: { x: 0, y: 85 + i * 10, w: 182, h: 5 }, minJavaFormat: 2 },
  ]),
];

export const EXTRA_MODERN_GUI_SPRITES: Array<{
  javaSprite: string;
  bedrockPath: string;
  minJavaFormat?: number;
  minBedrockVersion?: BedrockSemver;
}> = [
  { javaSprite: `${SPRITE_PREFIX}hud/air_empty.png`, bedrockPath: 'textures/ui/bubble_empty.png', minJavaFormat: 42 },
];

const ALL_BEDROCK_MAPPED_SPECS = [
  ...JAVA_ICONS_SPRITES.filter((s): s is GuiSpriteSpec & { bedrockPath: string } => Boolean(s.bedrockPath)),
  ...JAVA_WIDGETS_SPRITES.filter((s): s is GuiSpriteSpec & { bedrockPath: string } => Boolean(s.bedrockPath)),
  ...EXTRA_MODERN_GUI_SPRITES.map((s) => ({ ...s, box: { x: 0, y: 0, w: 0, h: 0 } })),
];

export const ICONS_MAPPINGS: Record<string, CropBox> = JAVA_ICONS_SPRITES.reduce((acc, s) => {
  if (s.bedrockPath && !acc[s.bedrockPath]) acc[s.bedrockPath] = s.box;
  return acc;
}, Object.create(null) as Record<string, CropBox>);

export const WIDGETS_MAPPINGS: Record<string, CropBox> = {
  ...HOTBAR_SLICE_MAPPINGS,
  'textures/ui/selected_hotbar_slot.png': { x: 0, y: 22, w: 24, h: 24 },
};

export const MODERN_GUI_SPRITE_JAVA_TO_BEDROCK: Record<string, string> = ALL_BEDROCK_MAPPED_SPECS.reduce(
  (acc, s) => {
    if (!acc[s.javaSprite]) acc[s.javaSprite] = s.bedrockPath;
    return acc;
  },
  Object.create(null) as Record<string, string>
);

export const MODERN_GUI_SPRITE_BEDROCK_TO_JAVA: Record<string, string> = ALL_BEDROCK_MAPPED_SPECS.reduce(
  (acc, s) => {
    if (!acc[s.bedrockPath]) acc[s.bedrockPath] = s.javaSprite;
    return acc;
  },
  Object.create(null) as Record<string, string>
);

export function getLegacyIconsToBedrockMappings(
  sourceJavaFormat: number,
  targetBedrockMinEngine: BedrockSemver
): Record<string, CropBox> {
  const out: Record<string, CropBox> = {};
  for (const s of JAVA_ICONS_SPRITES) {
    if (!s.bedrockPath) continue;
    if (sourceJavaFormat < (s.minJavaFormat ?? 1)) continue;
    if (compareBedrockVersion(targetBedrockMinEngine, s.minBedrockVersion ?? [1, 12, 0]) < 0) continue;
    if (!out[s.bedrockPath]) out[s.bedrockPath] = s.box;
  }
  return out;
}

export function getModernJavaToBedrockGuiPath(
  javaPath: string,
  targetBedrockMinEngine: BedrockSemver
): string | null {
  const spec = ALL_BEDROCK_MAPPED_SPECS.find((s) => s.javaSprite === javaPath);
  if (!spec) return null;
  if (compareBedrockVersion(targetBedrockMinEngine, spec.minBedrockVersion ?? [1, 12, 0]) < 0) {
    return null;
  }
  return spec.bedrockPath;
}

export function getBedrockToModernJavaGuiPath(
  bedrockPath: string,
  targetJavaFormat: number
): string | null {
  if (targetJavaFormat < 18) return null;
  const normalized = bedrockPath.replace(/\.tga$/i, '.png');
  const spec = ALL_BEDROCK_MAPPED_SPECS.find((s) => s.bedrockPath === normalized);
  if (!spec) return null;
  if (targetJavaFormat < Math.max(18, spec.minJavaFormat ?? 18)) return null;
  return spec.javaSprite;
}

export function getJavaSheetToModernSprites(
  sheetPath: string,
  sourceJavaFormat: number,
  targetJavaFormat: number
): { mappings: Record<string, CropBox>; mcmetas: Record<string, string> } | null {
  const specs =
    sheetPath === 'assets/minecraft/textures/gui/icons.png' || sheetPath === 'textures/gui/icons.png'
      ? JAVA_ICONS_SPRITES
      : sheetPath === 'assets/minecraft/textures/gui/widgets.png' || sheetPath === 'textures/gui/gui.png'
      ? JAVA_WIDGETS_SPRITES
      : sheetPath === 'assets/minecraft/textures/gui/bars.png'
      ? JAVA_BARS_SPRITES
      : null;
  if (!specs) return null;

  const mappings: Record<string, CropBox> = {};
  const mcmetas: Record<string, string> = {};
  for (const s of specs) {
    const minFmt = s.minJavaFormat ?? 1;
    if (sourceJavaFormat < minFmt || targetJavaFormat < minFmt) continue;
    mappings[s.javaSprite] = s.box;
    if (s.mcmeta) mcmetas[`${s.javaSprite}.mcmeta`] = s.mcmeta;
  }
  return Object.keys(mappings).length > 0 ? { mappings, mcmetas } : null;
}

export function getJavaModernSpriteSheetTarget(
  javaSpritePath: string,
  targetJavaFormat: number
): { sheet: 'icons' | 'widgets' | 'bars'; box: CropBox; isPrimary: boolean; isButton: boolean } | null {
  const groups: Array<{ sheet: 'icons' | 'widgets' | 'bars'; specs: GuiSpriteSpec[] }> = [
    { sheet: 'icons', specs: JAVA_ICONS_SPRITES },
    { sheet: 'widgets', specs: JAVA_WIDGETS_SPRITES },
    { sheet: 'bars', specs: JAVA_BARS_SPRITES },
  ];
  for (const g of groups) {
    const spec = g.specs.find((s) => s.javaSprite === javaSpritePath);
    if (spec) {
      if (targetJavaFormat < (spec.minJavaFormat ?? 1)) return null;
      return {
        sheet: g.sheet,
        box: spec.box,
        isPrimary: spec.primaryBoxOwner !== false,
        isButton: g.sheet === 'widgets' && javaSpritePath.startsWith(`${SPRITE_PREFIX}widget/`),
      };
    }
  }
  return null;
}

export function getBedrockGuiSheetTarget(
  bedrockPath: string,
  targetJavaFormat: number
): { sheet: 'icons' | 'widgets'; box: CropBox; isPrimary: boolean } | null {
  const normalized = bedrockPath.replace(/\.tga$/i, '.png');
  if (Object.hasOwn(HOTBAR_SLICE_MAPPINGS, normalized)) {
    return { sheet: 'widgets', box: HOTBAR_SLICE_MAPPINGS[normalized], isPrimary: true };
  }
  for (const s of JAVA_WIDGETS_SPRITES) {
    if (s.bedrockPath === normalized) {
      if (targetJavaFormat < (s.minJavaFormat ?? 1)) return null;
      return { sheet: 'widgets', box: s.box, isPrimary: s.primaryBoxOwner !== false };
    }
  }
  for (const s of JAVA_ICONS_SPRITES) {
    if (s.bedrockPath === normalized) {
      if (targetJavaFormat < (s.minJavaFormat ?? 1)) return null;
      return { sheet: 'icons', box: s.box, isPrimary: s.primaryBoxOwner !== false };
    }
  }
  return null;
}

export async function processGuiSpriteSheet(
  pngData: Uint8Array,
  mappings: Record<string, CropBox>,
  options?: { baseWidth?: number }
): Promise<Record<string, Uint8Array>> {
  const dims = getPngDimensions(pngData);
  if (!dims) {
    throw new Error('Invalid or oversized GUI PNG image');
  }

  const baseWidth = options?.baseWidth ?? 256;
  const scale = dims.width / baseWidth;
  const results: Record<string, Uint8Array> = {};

  const decoded = decodePngToRgbaSync(pngData);
  if (decoded) {
    for (const [targetPath, box] of Object.entries(mappings)) {
      const sx = Math.round(box.x * scale);
      const sy = Math.round(box.y * scale);
      const sw = Math.max(1, Math.round(box.w * scale));
      const sh = Math.max(1, Math.round(box.h * scale));

      const outRgba = new Uint8Array(sw * sh * 4);
      const srcX0 = Math.max(0, sx);
      const srcY0 = Math.max(0, sy);
      const srcX1 = Math.min(decoded.width, sx + sw);
      const srcY1 = Math.min(decoded.height, sy + sh);

      if (srcX1 > srcX0 && srcY1 > srcY0) {
        const copyW = srcX1 - srcX0;
        const rowBytes = copyW * 4;
        const dstX0 = srcX0 - sx;
        const dstY0 = srcY0 - sy;
        for (let row = 0; row < srcY1 - srcY0; row++) {
          const srcOffset = ((srcY0 + row) * decoded.width + srcX0) * 4;
          const dstOffset = ((dstY0 + row) * sw + dstX0) * 4;
          outRgba.set(decoded.rgba.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
        }
      }

      results[targetPath] = encodeRgbaToPngSync(sw, sh, outRgba);
    }
    return results;
  }

  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('OffscreenCanvas or createImageBitmap is not supported in this environment');
  }

  const blob = new Blob([pngData as any], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);

  try {
    for (const [targetPath, box] of Object.entries(mappings)) {
      const sx = Math.round(box.x * scale);
      const sy = Math.round(box.y * scale);
      const sw = Math.max(1, Math.round(box.w * scale));
      const sh = Math.max(1, Math.round(box.h * scale));

      const canvas = new OffscreenCanvas(sw, sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to acquire 2D context for OffscreenCanvas');
      }

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

export function composeGuiSpriteSheet(
  entries: Array<{ bytes: Uint8Array; box: CropBox; isPrimary?: boolean }>,
  sheetWidth: number,
  sheetHeight: number,
  baseSheetBytes?: Uint8Array | null
): Uint8Array | null {
  const base = baseSheetBytes ? decodeImageToRgbaSync(baseSheetBytes) : null;
  const decodedEntries = entries
    .map((e) => ({ ...e, img: decodeImageToRgbaSync(e.bytes) }))
    .filter((e): e is typeof e & { img: NonNullable<typeof e.img> } => e.img !== null);

  if (!base && decodedEntries.length === 0) return null;

  let scale = base ? Math.max(1, Math.round(base.width / sheetWidth)) : 1;
  for (const e of decodedEntries) {
    if (e.box.w > 0) {
      scale = Math.max(scale, Math.round(e.img.width / e.box.w));
    }
  }
  const maxScale = Math.max(1, Math.floor(Math.min(MAX_GUI_DIMENSION / sheetWidth, MAX_GUI_DIMENSION / sheetHeight)));
  scale = Math.min(scale, maxScale);

  const outW = sheetWidth * scale;
  const outH = sheetHeight * scale;
  const outRgba = new Uint8Array(outW * outH * 4);

  const blitNearest = (
    src: { width: number; height: number; rgba: Uint8Array },
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) => {
    const x0 = Math.max(0, dx);
    const y0 = Math.max(0, dy);
    const x1 = Math.min(outW, dx + dw);
    const y1 = Math.min(outH, dy + dh);
    for (let y = y0; y < y1; y++) {
      const sy = Math.min(src.height - 1, Math.floor(((y - dy) * src.height) / dh));
      for (let x = x0; x < x1; x++) {
        const sx = Math.min(src.width - 1, Math.floor(((x - dx) * src.width) / dw));
        const sIdx = (sy * src.width + sx) * 4;
        const dIdx = (y * outW + x) * 4;
        outRgba[dIdx] = src.rgba[sIdx];
        outRgba[dIdx + 1] = src.rgba[sIdx + 1];
        outRgba[dIdx + 2] = src.rgba[sIdx + 2];
        outRgba[dIdx + 3] = src.rgba[sIdx + 3];
      }
    }
  };

  if (base) {
    blitNearest(base, 0, 0, outW, outH);
  }

  // Draw secondary/shared-box sprites first so primary sprites win overlapping slots
  const ordered = [...decodedEntries].sort((a, b) => Number(a.isPrimary !== false) - Number(b.isPrimary !== false));
  for (const e of ordered) {
    blitNearest(
      e.img,
      Math.round(e.box.x * scale),
      Math.round(e.box.y * scale),
      Math.max(1, Math.round(e.box.w * scale)),
      Math.max(1, Math.round(e.box.h * scale))
    );
  }

  return encodeRgbaToPngSync(outW, outH, outRgba);
}
