import { encodeRgbaToPngSync, getPngDimensions, isValidPngHeader } from './tga';
import { decodeImageToRgba, type DecodedRgbaImage } from './pbr';

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
export const MAX_GUI_PIXELS = 4096 * 4096;

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
        border: 3,
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
  { javaSprite: `${SPRITE_PREFIX}hud/jump_bar_cooldown.png`, box: { x: 0, y: 74, w: 182, h: 5 }, minJavaFormat: 15 },
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

export const WIDGETS_MAPPINGS: Record<string, CropBox> = {
  ...HOTBAR_SLICE_MAPPINGS,
  'textures/ui/selected_hotbar_slot.png': { x: 0, y: 22, w: 24, h: 24 },
};

export function hasNonTransparentPixels(rgba: Uint8Array): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] > 0) return true;
  }
  return false;
}

export function alphaBlendPixel(dst: Uint8Array, dIdx: number, sr: number, sg: number, sb: number, sa: number): void {
  if (sa === 0) return;
  if (sa === 255 || dst[dIdx + 3] === 0) {
    dst[dIdx] = sr;
    dst[dIdx + 1] = sg;
    dst[dIdx + 2] = sb;
    dst[dIdx + 3] = sa;
    return;
  }
  const srcA = sa / 255;
  const dstA = dst[dIdx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  dst[dIdx] = Math.round((sr * srcA + dst[dIdx] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 1] = Math.round((sg * srcA + dst[dIdx + 1] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 2] = Math.round((sb * srcA + dst[dIdx + 2] * dstA * (1 - srcA)) / outA);
  dst[dIdx + 3] = Math.round(outA * 255);
}

export function cropRgbaBox(
  img: DecodedRgbaImage,
  box: CropBox,
  scaleX: number,
  scaleY = scaleX
): { width: number; height: number; rgba: Uint8Array } {
  const sx = Math.round(box.x * scaleX);
  const sy = Math.round(box.y * scaleY);
  const ex = Math.round((box.x + box.w) * scaleX);
  const ey = Math.round((box.y + box.h) * scaleY);
  const sw = Math.max(1, ex - sx);
  const sh = Math.max(1, ey - sy);
  const rgba = new Uint8Array(sw * sh * 4);
  const srcX0 = Math.max(0, sx);
  const srcY0 = Math.max(0, sy);
  const srcX1 = Math.min(img.width, sx + sw);
  const srcY1 = Math.min(img.height, sy + sh);

  if (srcX1 > srcX0 && srcY1 > srcY0) {
    const rowBytes = (srcX1 - srcX0) * 4;
    const dstX0 = srcX0 - sx;
    const dstY0 = srcY0 - sy;
    for (let row = 0; row < srcY1 - srcY0; row++) {
      const srcOff = ((srcY0 + row) * img.width + srcX0) * 4;
      const dstOff = ((dstY0 + row) * sw + dstX0) * 4;
      rgba.set(img.rgba.subarray(srcOff, srcOff + rowBytes), dstOff);
    }
  }
  return { width: sw, height: sh, rgba };
}

export function blitRgbaScaled(
  dst: Uint8Array,
  dstW: number,
  dstH: number,
  src: DecodedRgbaImage,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  blend = false
): void {
  const x0 = Math.max(0, dx);
  const y0 = Math.max(0, dy);
  const x1 = Math.min(dstW, dx + dw);
  const y1 = Math.min(dstH, dy + dh);
  for (let y = y0; y < y1; y++) {
    const sy = Math.min(src.height - 1, Math.floor(((y - dy) * src.height) / dh));
    for (let x = x0; x < x1; x++) {
      const sx = Math.min(src.width - 1, Math.floor(((x - dx) * src.width) / dw));
      const sIdx = (sy * src.width + sx) * 4;
      const dIdx = (y * dstW + x) * 4;
      if (blend) {
        if (src.rgba[sIdx + 3] === 0) continue;
        alphaBlendPixel(dst, dIdx, src.rgba[sIdx], src.rgba[sIdx + 1], src.rgba[sIdx + 2], src.rgba[sIdx + 3]);
      } else {
        dst[dIdx] = src.rgba[sIdx];
        dst[dIdx + 1] = src.rgba[sIdx + 1];
        dst[dIdx + 2] = src.rgba[sIdx + 2];
        dst[dIdx + 3] = src.rgba[sIdx + 3];
      }
    }
  }
}

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
  const normalized = bedrockPath.toLowerCase().replace(/\.tga$/, '.png');
  const spec = ALL_BEDROCK_MAPPED_SPECS.find((s) => s.bedrockPath === normalized);
  if (!spec) return null;
  if (targetJavaFormat < Math.max(18, spec.minJavaFormat ?? 18)) return null;
  return spec.javaSprite;
}

const BEDROCK_GUI_SHEET_WIDGETS = new Set([
  `${SPRITE_PREFIX}hud/hotbar.png`,
  `${SPRITE_PREFIX}hud/hotbar_selection.png`,
  `${SPRITE_PREFIX}widget/button_disabled.png`,
  `${SPRITE_PREFIX}widget/button.png`,
  `${SPRITE_PREFIX}widget/button_highlighted.png`,
]);

export function getJavaSheetToModernSprites(
  sheetPath: string,
  sourceJavaFormat: number,
  targetJavaFormat: number
): { mappings: Record<string, CropBox>; mcmetas: Record<string, string> } | null {
  const isBedrockIcons = sheetPath === 'textures/gui/icons.png';
  const isBedrockGui = sheetPath === 'textures/gui/gui.png';
  const specs =
    sheetPath === 'assets/minecraft/textures/gui/icons.png' || isBedrockIcons
      ? JAVA_ICONS_SPRITES
      : sheetPath === 'assets/minecraft/textures/gui/widgets.png' || isBedrockGui
      ? JAVA_WIDGETS_SPRITES
      : sheetPath === 'assets/minecraft/textures/gui/bars.png'
      ? JAVA_BARS_SPRITES
      : null;
  if (!specs) return null;

  const mappings: Record<string, CropBox> = {};
  const mcmetas: Record<string, string> = {};
  for (const s of specs) {
    if (isBedrockIcons) {
      if (
        !s.javaSprite.startsWith(`${SPRITE_PREFIX}hud/`) ||
        s.javaSprite.includes('attack_indicator') ||
        s.javaSprite === `${SPRITE_PREFIX}hud/jump_bar_cooldown.png`
      ) {
        continue;
      }
    } else if (isBedrockGui && !BEDROCK_GUI_SHEET_WIDGETS.has(s.javaSprite)) {
      continue;
    }
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
        isButton:
          javaSpritePath === `${SPRITE_PREFIX}widget/button.png` ||
          javaSpritePath === `${SPRITE_PREFIX}widget/button_highlighted.png` ||
          javaSpritePath === `${SPRITE_PREFIX}widget/button_disabled.png`,
      };
    }
  }
  return null;
}

export function getBedrockGuiSheetTarget(
  bedrockPath: string,
  targetJavaFormat: number
): { sheet: 'icons' | 'widgets'; box: CropBox; isPrimary: boolean } | null {
  const normalized = bedrockPath.toLowerCase().replace(/\.tga$/, '.png');
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
  options?: { baseWidth?: number; baseHeight?: number; skipTransparent?: boolean }
): Promise<Record<string, Uint8Array>> {
  if (isValidPngHeader(pngData)) {
    const dims = getPngDimensions(pngData);
    if (!dims || dims.width * dims.height > MAX_GUI_PIXELS) {
      throw new Error('Invalid or oversized GUI PNG image');
    }
  }

  const baseWidth = options?.baseWidth ?? 256;
  const decoded = await decodeImageToRgba(pngData, MAX_GUI_DIMENSION);
  if (!decoded || decoded.width * decoded.height > MAX_GUI_PIXELS) {
    throw new Error('Failed to decode GUI PNG image');
  }
  const scaleX = decoded.width / baseWidth;
  const scaleY = options?.baseHeight ? decoded.height / options.baseHeight : scaleX;

  const results: Record<string, Uint8Array> = {};
  for (const [targetPath, box] of Object.entries(mappings)) {
    const cropped = cropRgbaBox(decoded, box, scaleX, scaleY);
    if (options?.skipTransparent && !hasNonTransparentPixels(cropped.rgba)) continue;
    results[targetPath] = encodeRgbaToPngSync(cropped.width, cropped.height, cropped.rgba);
  }
  return results;
}

export async function composeGuiSpriteSheet(
  entries: Array<{ bytes: Uint8Array; box: CropBox; isPrimary?: boolean }>,
  sheetWidth: number,
  sheetHeight: number,
  baseSheetBytes?: Uint8Array | null
): Promise<Uint8Array | null> {
  const rawBase = baseSheetBytes ? await decodeImageToRgba(baseSheetBytes, MAX_GUI_DIMENSION) : null;
  const base = rawBase && rawBase.width * rawBase.height <= MAX_GUI_PIXELS ? rawBase : null;
  const decodedEntries: Array<{ bytes: Uint8Array; box: CropBox; isPrimary?: boolean; img: DecodedRgbaImage }> = [];
  for (const e of entries) {
    const img = await decodeImageToRgba(e.bytes, MAX_GUI_DIMENSION);
    if (img && img.width * img.height <= MAX_GUI_PIXELS) decodedEntries.push({ ...e, img });
  }

  if (!base && decodedEntries.length === 0) return null;

  let scale = base ? Math.max(1, Math.round(base.width / sheetWidth)) : 1;
  let reliableScale = 0;
  let fallbackScale = 0;
  for (const e of decodedEntries) {
    if (e.box.w <= 0 || e.box.h <= 0) continue;
    const entryScale = Math.min(Math.round(e.img.width / e.box.w), Math.round(e.img.height / e.box.h));
    if (e.box.w >= 8 && e.box.h >= 8) {
      reliableScale = Math.max(reliableScale, entryScale);
    } else {
      fallbackScale = Math.max(fallbackScale, entryScale);
    }
  }
  scale = Math.max(scale, reliableScale > 0 ? reliableScale : fallbackScale);
  const maxScaleByDim = Math.floor(Math.min(MAX_GUI_DIMENSION / sheetWidth, MAX_GUI_DIMENSION / sheetHeight));
  const maxScaleByPixels = Math.floor(Math.sqrt(MAX_GUI_PIXELS / (sheetWidth * sheetHeight)));
  const maxScale = Math.max(1, Math.min(maxScaleByDim, maxScaleByPixels));
  scale = Math.min(scale, maxScale);

  const outW = sheetWidth * scale;
  const outH = sheetHeight * scale;
  const outRgba = new Uint8Array(outW * outH * 4);

  if (base) {
    const baseDrawH = Math.min(outH, Math.max(1, Math.round(base.height * (outW / base.width))));
    blitRgbaScaled(outRgba, outW, outH, base, 0, 0, outW, baseDrawH);
  }

  // Draw secondary/shared-box sprites first so primary sprites win overlapping slots
  const ordered = [...decodedEntries].sort((a, b) => Number(a.isPrimary !== false) - Number(b.isPrimary !== false));
  for (const e of ordered) {
    blitRgbaScaled(
      outRgba,
      outW,
      outH,
      e.img,
      Math.round(e.box.x * scale),
      Math.round(e.box.y * scale),
      Math.max(1, Math.round(e.box.w * scale)),
      Math.max(1, Math.round(e.box.h * scale))
    );
  }

  return encodeRgbaToPngSync(outW, outH, outRgba);
}
