import { decodeImageToRgba, type DecodedRgbaImage } from './pbr';
import { encodeRgbaToPngSync } from './tga';
import {
  alphaBlendPixel,
  blitRgbaScaled,
  compareBedrockVersion,
  cropRgbaBox,
  hasNonTransparentPixels,
  isJavaVillager2Version,
  type BedrockSemver,
  type CropBox,
} from './gui';

// shortcut: Bedrock containers use vanilla JSON UI 9-slice/component textures rather than bundled VDX/UIDX JSON UI overrides, so custom per-container decorative artwork outside standard slot/progress regions is not preserved on Bedrock.

const SPRITE_CONTAINER_PREFIX = 'assets/minecraft/textures/gui/sprites/container/';
const JAVA_CONTAINER_PREFIX = 'assets/minecraft/textures/gui/container/';
const MAX_CONTAINER_DIMENSION = 8192;

interface ContainerSpriteSpec {
  sprite: string; // relative to sprites/container/
  box: CropBox;
  bedrockPath?: string;
  bedrockFallback?: boolean; // true for blast_furnace/smoker/grindstone/smithing sharing furnace/anvil Bedrock UI
  minJavaFormat?: number;
  maxJavaFormat?: number;
  minBedrockVersion?: BedrockSemver;
}

const EFFECT_BG_MODERN_MCMETA = JSON.stringify(
  { gui: { scaling: { type: 'nine_slice', width: 120, height: 32, border: 4 } } },
  null,
  2
);

interface ContainerSheetSpec {
  sheetW: number;
  sheetH: number;
  panelBox: CropBox;
  sprites: ContainerSpriteSpec[];
  panelBedrockExtras?: Array<{ box: CropBox; bedrockPaths: string[] }>;
}

const STANDARD_PANEL: CropBox = { x: 0, y: 0, w: 176, h: 166 };

export const CONTAINER_SHEETS: Record<string, ContainerSheetSpec> = {
  furnace: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'furnace/lit_progress.png', box: { x: 176, y: 0, w: 14, h: 14 }, bedrockPath: 'textures/ui/flame_full_image.png' },
      { sprite: 'furnace/burn_progress.png', box: { x: 176, y: 14, w: 24, h: 16 }, bedrockPath: 'textures/ui/arrow_active.png' },
    ],
    panelBedrockExtras: [
      { box: { x: 56, y: 36, w: 14, h: 14 }, bedrockPaths: ['textures/ui/flame_empty_image.png'] },
      { box: { x: 80, y: 35, w: 22, h: 15 }, bedrockPaths: ['textures/ui/arrow_inactive.png', 'textures/ui/arrow_large.png'] },
    ],
  },
  blast_furnace: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'blast_furnace/lit_progress.png', box: { x: 176, y: 0, w: 14, h: 14 }, bedrockPath: 'textures/ui/flame_full_image.png', bedrockFallback: true },
      { sprite: 'blast_furnace/burn_progress.png', box: { x: 176, y: 14, w: 24, h: 16 }, bedrockPath: 'textures/ui/arrow_active.png', bedrockFallback: true },
    ],
  },
  smoker: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'smoker/lit_progress.png', box: { x: 176, y: 0, w: 14, h: 14 }, bedrockPath: 'textures/ui/flame_full_image.png', bedrockFallback: true },
      { sprite: 'smoker/burn_progress.png', box: { x: 176, y: 14, w: 24, h: 16 }, bedrockPath: 'textures/ui/arrow_active.png', bedrockFallback: true },
    ],
  },
  brewing_stand: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'brewing_stand/brew_progress.png', box: { x: 176, y: 0, w: 9, h: 28 }, bedrockPath: 'textures/ui/brewing_arrow_full.png' },
      { sprite: 'brewing_stand/bubbles.png', box: { x: 185, y: 0, w: 12, h: 29 }, bedrockPath: 'textures/ui/bubbles_full.png' },
      { sprite: 'brewing_stand/fuel_length.png', box: { x: 176, y: 29, w: 18, h: 4 }, bedrockPath: 'textures/ui/brewing_fuel_bar_full.png' },
    ],
    panelBedrockExtras: [
      { box: { x: 97, y: 16, w: 9, h: 28 }, bedrockPaths: ['textures/ui/brewing_arrow_empty.png'] },
      { box: { x: 63, y: 14, w: 12, h: 29 }, bedrockPaths: ['textures/ui/bubbles_empty.png'] },
      { box: { x: 60, y: 44, w: 18, h: 4 }, bedrockPaths: ['textures/ui/brewing_fuel_bar_empty.png'] },
    ],
  },
  beacon: {
    sheetW: 256,
    sheetH: 256,
    panelBox: { x: 0, y: 0, w: 230, h: 219 },
    sprites: [
      { sprite: 'beacon/button.png', box: { x: 0, y: 219, w: 22, h: 22 }, bedrockPath: 'textures/ui/beacon_button_default.png' },
      { sprite: 'beacon/button_selected.png', box: { x: 22, y: 219, w: 22, h: 22 }, bedrockPath: 'textures/ui/beacon_button_pressed.png' },
      { sprite: 'beacon/button_disabled.png', box: { x: 44, y: 219, w: 22, h: 22 }, bedrockPath: 'textures/ui/beacon_button_locked.png' },
      { sprite: 'beacon/button_highlighted.png', box: { x: 66, y: 219, w: 22, h: 22 }, bedrockPath: 'textures/ui/beacon_button_hover.png' },
      { sprite: 'beacon/confirm.png', box: { x: 90, y: 220, w: 18, h: 18 } },
      { sprite: 'beacon/cancel.png', box: { x: 112, y: 220, w: 18, h: 18 } },
    ],
  },
  enchanting_table: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'enchanting_table/enchantment_slot.png', box: { x: 0, y: 166, w: 108, h: 19 }, bedrockPath: 'textures/ui/enchanting_active_background.png' },
      { sprite: 'enchanting_table/enchantment_slot_disabled.png', box: { x: 0, y: 185, w: 108, h: 19 }, bedrockPath: 'textures/ui/enchanting_dark_background.png' },
      { sprite: 'enchanting_table/enchantment_slot_highlighted.png', box: { x: 0, y: 204, w: 108, h: 19 }, bedrockPath: 'textures/ui/enchanting_active_background_with_hover_text.png' },
      { sprite: 'enchanting_table/level_1.png', box: { x: 0, y: 223, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_selectable_1.png' },
      { sprite: 'enchanting_table/level_2.png', box: { x: 16, y: 223, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_selectable_2.png' },
      { sprite: 'enchanting_table/level_3.png', box: { x: 32, y: 223, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_selectable_3.png' },
      { sprite: 'enchanting_table/level_1_disabled.png', box: { x: 0, y: 239, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_unselectable_1.png' },
      { sprite: 'enchanting_table/level_2_disabled.png', box: { x: 16, y: 239, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_unselectable_2.png' },
      { sprite: 'enchanting_table/level_3_disabled.png', box: { x: 32, y: 239, w: 16, h: 16 }, bedrockPath: 'textures/ui/dust_unselectable_3.png' },
    ],
  },
  anvil: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'anvil/text_field.png', box: { x: 0, y: 166, w: 110, h: 16 } },
      { sprite: 'anvil/text_field_disabled.png', box: { x: 0, y: 182, w: 110, h: 16 } },
      { sprite: 'anvil/error.png', box: { x: 176, y: 0, w: 28, h: 21 }, bedrockPath: 'textures/ui/crossout.png' },
    ],
  },
  grindstone: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'grindstone/error.png', box: { x: 176, y: 0, w: 28, h: 21 }, bedrockPath: 'textures/ui/crossout.png', bedrockFallback: true },
    ],
  },
  smithing: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'smithing/error.png', box: { x: 176, y: 0, w: 28, h: 21 }, bedrockPath: 'textures/ui/crossout.png', bedrockFallback: true },
    ],
  },
  loom: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'loom/banner_slot.png', box: { x: 176, y: 0, w: 16, h: 16 }, bedrockPath: 'textures/ui/loom_banner_empty.png' },
      { sprite: 'loom/dye_slot.png', box: { x: 192, y: 0, w: 16, h: 16 }, bedrockPath: 'textures/ui/loom_dye_empty.png' },
      { sprite: 'loom/pattern_slot.png', box: { x: 208, y: 0, w: 16, h: 16 }, bedrockPath: 'textures/ui/loom_pattern_item_empty.png' },
      { sprite: 'loom/scroller.png', box: { x: 232, y: 0, w: 12, h: 15 } },
      { sprite: 'loom/scroller_disabled.png', box: { x: 244, y: 0, w: 12, h: 15 } },
      { sprite: 'loom/pattern.png', box: { x: 0, y: 166, w: 14, h: 14 } },
      { sprite: 'loom/pattern_selected.png', box: { x: 0, y: 180, w: 14, h: 14 } },
      { sprite: 'loom/pattern_highlighted.png', box: { x: 0, y: 194, w: 14, h: 14 } },
      { sprite: 'loom/error.png', box: { x: 176, y: 17, w: 17, h: 16 } },
    ],
  },
  cartography_table: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'cartography_table/map.png', box: { x: 176, y: 0, w: 66, h: 66 } },
      { sprite: 'cartography_table/scaled_map.png', box: { x: 176, y: 66, w: 66, h: 66 } },
      { sprite: 'cartography_table/duplicated_map.png', box: { x: 176, y: 132, w: 50, h: 66 } },
      { sprite: 'cartography_table/error.png', box: { x: 226, y: 132, w: 28, h: 21 } },
      { sprite: 'cartography_table/locked.png', box: { x: 52, y: 214, w: 10, h: 14 } },
    ],
  },
  stonecutter: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'stonecutter/scroller.png', box: { x: 176, y: 0, w: 12, h: 15 } },
      { sprite: 'stonecutter/scroller_disabled.png', box: { x: 188, y: 0, w: 12, h: 15 } },
      { sprite: 'stonecutter/recipe.png', box: { x: 0, y: 166, w: 16, h: 18 } },
      { sprite: 'stonecutter/recipe_selected.png', box: { x: 0, y: 184, w: 16, h: 18 } },
      { sprite: 'stonecutter/recipe_highlighted.png', box: { x: 0, y: 202, w: 16, h: 18 } },
    ],
  },
  villager: {
    sheetW: 512,
    sheetH: 256,
    panelBox: { x: 0, y: 0, w: 276, h: 166 },
    sprites: [
      { sprite: 'villager/out_of_stock.png', box: { x: 311, y: 0, w: 28, h: 21 } },
      { sprite: 'villager/experience_bar_background.png', box: { x: 0, y: 186, w: 102, h: 5 } },
      { sprite: 'villager/experience_bar_current.png', box: { x: 0, y: 191, w: 102, h: 5 } },
      { sprite: 'villager/experience_bar_result.png', box: { x: 0, y: 181, w: 102, h: 5 } },
      { sprite: 'villager/scroller.png', box: { x: 0, y: 199, w: 6, h: 27 } },
      { sprite: 'villager/scroller_disabled.png', box: { x: 6, y: 199, w: 6, h: 27 } },
      { sprite: 'villager/trade_arrow.png', box: { x: 15, y: 171, w: 10, h: 9 } },
      { sprite: 'villager/trade_arrow_out_of_stock.png', box: { x: 25, y: 171, w: 10, h: 9 } },
      { sprite: 'villager/discount_strikethrough.png', box: { x: 0, y: 176, w: 9, h: 2 }, bedrockPath: 'textures/ui/red_slash.png' },
    ],
  },
  inventory: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'inventory/effect_background_large.png', box: { x: 0, y: 166, w: 120, h: 32 }, bedrockPath: 'textures/ui/effect_background.png', maxJavaFormat: 74 },
      { sprite: 'inventory/effect_background_small.png', box: { x: 0, y: 198, w: 32, h: 32 }, maxJavaFormat: 74 },
    ],
  },
  horse: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [
      { sprite: 'horse/chest_slots.png', box: { x: 0, y: 166, w: 90, h: 54 } },
      { sprite: 'horse/armor_slot.png', box: { x: 0, y: 220, w: 18, h: 18 } },
      { sprite: 'horse/saddle_slot.png', box: { x: 18, y: 220, w: 18, h: 18 } },
      { sprite: 'horse/llama_armor_slot.png', box: { x: 36, y: 220, w: 18, h: 18 } },
    ],
    panelBedrockExtras: [
      { box: { x: 1, y: 221, w: 16, h: 16 }, bedrockPaths: ['textures/ui/empty_horse_slot_armor.png'] },
      { box: { x: 19, y: 221, w: 16, h: 16 }, bedrockPaths: ['textures/ui/empty_horse_slot_saddle.png'] },
      { box: { x: 37, y: 221, w: 16, h: 16 }, bedrockPaths: ['textures/ui/empty_llama_slot_carpet.png'] },
    ],
  },
  crafting_table: {
    sheetW: 256,
    sheetH: 256,
    panelBox: STANDARD_PANEL,
    sprites: [],
    panelBedrockExtras: [
      { box: { x: 89, y: 34, w: 22, h: 15 }, bedrockPaths: ['textures/ui/arrow_large.png'] },
    ],
  },
  dispenser: { sheetW: 256, sheetH: 256, panelBox: STANDARD_PANEL, sprites: [] },
  generic_54: { sheetW: 256, sheetH: 256, panelBox: { x: 0, y: 0, w: 176, h: 222 }, sprites: [] },
  hopper: { sheetW: 256, sheetH: 256, panelBox: { x: 0, y: 0, w: 176, h: 133 }, sprites: [] },
  shulker_box: { sheetW: 256, sheetH: 256, panelBox: STANDARD_PANEL, sprites: [] },
};

const STANDALONE_CONTAINER_SPRITES: ContainerSpriteSpec[] = [
  { sprite: 'crafter/disabled_slot.png', box: { x: 0, y: 0, w: 18, h: 18 }, bedrockPath: 'textures/ui/slot_disabled.png', minJavaFormat: 34, minBedrockVersion: [1, 21, 0] },
  { sprite: 'crafter/powered_redstone.png', box: { x: 0, y: 0, w: 16, h: 16 }, bedrockPath: 'textures/ui/redstone_arrow_powered.png', minJavaFormat: 34, minBedrockVersion: [1, 21, 0] },
  { sprite: 'crafter/unpowered_redstone.png', box: { x: 0, y: 0, w: 16, h: 16 }, bedrockPath: 'textures/ui/redstone_arrow_unpowered.png', minJavaFormat: 34, minBedrockVersion: [1, 21, 0] },
  { sprite: 'inventory/effect_background.png', box: { x: 0, y: 166, w: 120, h: 32 }, bedrockPath: 'textures/ui/effect_background.png', minJavaFormat: 75 },
  { sprite: 'inventory/effect_background_ambient.png', box: { x: 0, y: 0, w: 0, h: 0 }, bedrockPath: 'textures/ui/effect_background_ambient.png', minJavaFormat: 75 },
];

interface ContainerSlotSpec {
  modernSlot: string; // e.g. 'helmet' -> sprites/container/slot/helmet.png
  legacyItem?: string; // e.g. 'assets/minecraft/textures/item/empty_armor_slot_helmet.png'
  legacySprite?: string; // e.g. 'loom/banner_slot.png' (1.20.2 - 1.21.3)
  bedrockPath?: string;
  inset1px?: boolean;
}

const CONTAINER_SLOT_SPECS: ContainerSlotSpec[] = [
  { modernSlot: 'helmet', legacyItem: 'assets/minecraft/textures/item/empty_armor_slot_helmet.png', bedrockPath: 'textures/ui/empty_armor_slot_helmet.png' },
  { modernSlot: 'chestplate', legacyItem: 'assets/minecraft/textures/item/empty_armor_slot_chestplate.png', bedrockPath: 'textures/ui/empty_armor_slot_chestplate.png' },
  { modernSlot: 'leggings', legacyItem: 'assets/minecraft/textures/item/empty_armor_slot_leggings.png', bedrockPath: 'textures/ui/empty_armor_slot_leggings.png' },
  { modernSlot: 'boots', legacyItem: 'assets/minecraft/textures/item/empty_armor_slot_boots.png', bedrockPath: 'textures/ui/empty_armor_slot_boots.png' },
  { modernSlot: 'shield', legacyItem: 'assets/minecraft/textures/item/empty_armor_slot_shield.png', bedrockPath: 'textures/ui/empty_armor_slot_shield.png' },
  { modernSlot: 'lapis_lazuli', legacyItem: 'assets/minecraft/textures/item/empty_slot_lapis_lazuli.png', bedrockPath: 'textures/ui/lapis_image.png' },
  { modernSlot: 'ingot', legacyItem: 'assets/minecraft/textures/item/empty_slot_ingot.png', bedrockPath: 'textures/ui/ingot_image.png' },
  { modernSlot: 'banner', legacySprite: 'loom/banner_slot.png', bedrockPath: 'textures/ui/loom_banner_empty.png' },
  { modernSlot: 'dye', legacySprite: 'loom/dye_slot.png', bedrockPath: 'textures/ui/loom_dye_empty.png' },
  { modernSlot: 'banner_pattern', legacySprite: 'loom/pattern_slot.png', bedrockPath: 'textures/ui/loom_pattern_item_empty.png' },
  { modernSlot: 'horse_armor', legacySprite: 'horse/armor_slot.png', bedrockPath: 'textures/ui/empty_horse_slot_armor.png', inset1px: true },
  { modernSlot: 'saddle', legacySprite: 'horse/saddle_slot.png', bedrockPath: 'textures/ui/empty_horse_slot_saddle.png', inset1px: true },
  { modernSlot: 'llama_armor', legacySprite: 'horse/llama_armor_slot.png', bedrockPath: 'textures/ui/empty_llama_slot_carpet.png', inset1px: true },
  { modernSlot: 'potion', bedrockPath: 'textures/ui/bottle_empty.png' },
  { modernSlot: 'brewing_fuel', bedrockPath: 'textures/ui/brewing_fuel_empty.png' },
  // Java-only 1.21.4 slot migrations
  { modernSlot: 'amethyst_shard', legacyItem: 'assets/minecraft/textures/item/empty_slot_amethyst_shard.png' },
  { modernSlot: 'axe', legacyItem: 'assets/minecraft/textures/item/empty_slot_axe.png' },
  { modernSlot: 'diamond', legacyItem: 'assets/minecraft/textures/item/empty_slot_diamond.png' },
  { modernSlot: 'emerald', legacyItem: 'assets/minecraft/textures/item/empty_slot_emerald.png' },
  { modernSlot: 'hoe', legacyItem: 'assets/minecraft/textures/item/empty_slot_hoe.png' },
  { modernSlot: 'pickaxe', legacyItem: 'assets/minecraft/textures/item/empty_slot_pickaxe.png' },
  { modernSlot: 'quartz', legacyItem: 'assets/minecraft/textures/item/empty_slot_quartz.png' },
  { modernSlot: 'redstone_dust', legacyItem: 'assets/minecraft/textures/item/empty_slot_redstone_dust.png' },
  { modernSlot: 'shovel', legacyItem: 'assets/minecraft/textures/item/empty_slot_shovel.png' },
  { modernSlot: 'sword', legacyItem: 'assets/minecraft/textures/item/empty_slot_sword.png' },
  { modernSlot: 'smithing_template_armor_trim', legacyItem: 'assets/minecraft/textures/item/empty_slot_smithing_template_armor_trim.png' },
  { modernSlot: 'smithing_template_netherite_upgrade', legacyItem: 'assets/minecraft/textures/item/empty_slot_smithing_template_netherite_upgrade.png' },
];

const BEDROCK_CONTAINER_THEME_AND_PARTS = new Set([
  'textures/ui/dialog_background_opaque.png',
  'textures/ui/cell_image.png',
  'textures/ui/cell_image_normal.png',
  'textures/ui/flame_empty_image.png',
  'textures/ui/flame_full_image.png',
  'textures/ui/arrow_inactive.png',
  'textures/ui/arrow_active.png',
  'textures/ui/arrow_large.png',
  'textures/ui/brewing_arrow_empty.png',
  'textures/ui/brewing_arrow_full.png',
  'textures/ui/bubbles_empty.png',
  'textures/ui/bubbles_full.png',
  'textures/ui/brewing_fuel_bar_empty.png',
  'textures/ui/brewing_fuel_bar_full.png',
  'textures/ui/beacon_button_default.png',
  'textures/ui/beacon_button_hover.png',
  'textures/ui/beacon_button_locked.png',
  'textures/ui/beacon_button_pressed.png',
  'textures/ui/enchanting_active_background.png',
  'textures/ui/enchanting_dark_background.png',
  'textures/ui/enchanting_active_background_with_hover_text.png',
  'textures/ui/dust_selectable_1.png',
  'textures/ui/dust_selectable_2.png',
  'textures/ui/dust_selectable_3.png',
  'textures/ui/dust_unselectable_1.png',
  'textures/ui/dust_unselectable_2.png',
  'textures/ui/dust_unselectable_3.png',
  'textures/ui/crossout.png',
  'textures/ui/effect_background.png',
  'textures/ui/effect_background_ambient.png',
]);

const SLOT_LEGACY_SPRITES = new Set(
  CONTAINER_SLOT_SPECS.map((s) => s.legacySprite).filter((s): s is string => Boolean(s))
);

function getContainerKey(path: string): string | null {
  if (!path.startsWith(JAVA_CONTAINER_PREFIX) || !path.endsWith('.png')) return null;
  const rel = path.slice(JAVA_CONTAINER_PREFIX.length, -4);
  if (rel === 'villager2') return 'villager';
  return Object.hasOwn(CONTAINER_SHEETS, rel) ? rel : null;
}

export function isJavaContainerSheetPath(path: string): boolean {
  return path.startsWith(JAVA_CONTAINER_PREFIX) && path.endsWith('.png');
}

export function isSharedBedrockThemeContainer(path: string): boolean {
  return getContainerKey(path) !== null;
}

export function isBedrockContainerThemeOrPartPath(path: string): boolean {
  return BEDROCK_CONTAINER_THEME_AND_PARTS.has(path.replace(/\.tga$/i, '.png'));
}

export function getJavaSlotItemToBedrockUiPath(javaPath: string): string | null {
  const slot = CONTAINER_SLOT_SPECS.find((s) => s.legacyItem === javaPath && s.bedrockPath);
  return slot?.bedrockPath ?? null;
}

export function getModernJavaContainerToBedrockPath(
  javaPath: string,
  targetBedrockMinEngine: BedrockSemver
): { path: string; isFallback: boolean } | null {
  if (!javaPath.startsWith(SPRITE_CONTAINER_PREFIX)) return null;
  const rel = javaPath.slice(SPRITE_CONTAINER_PREFIX.length);

  for (const s of STANDALONE_CONTAINER_SPRITES) {
    if (s.sprite === rel && s.bedrockPath) {
      if (compareBedrockVersion(targetBedrockMinEngine, s.minBedrockVersion ?? [1, 12, 0]) < 0) return null;
      return { path: s.bedrockPath, isFallback: Boolean(s.bedrockFallback) };
    }
  }

  for (const slot of CONTAINER_SLOT_SPECS) {
    if (!slot.bedrockPath) continue;
    if (`slot/${slot.modernSlot}.png` === rel) {
      return { path: slot.bedrockPath, isFallback: false };
    }
    if (slot.legacySprite === rel) {
      return { path: slot.bedrockPath, isFallback: true };
    }
  }

  for (const sheet of Object.values(CONTAINER_SHEETS)) {
    for (const sp of sheet.sprites) {
      if (sp.sprite === rel && sp.bedrockPath) {
        if (compareBedrockVersion(targetBedrockMinEngine, sp.minBedrockVersion ?? [1, 12, 0]) < 0) return null;
        return {
          path: sp.bedrockPath,
          isFallback: Boolean(sp.bedrockFallback) || sp.sprite === 'inventory/effect_background_large.png',
        };
      }
    }
  }

  return null;
}

export function getBedrockContainerToModernJavaPaths(
  bedrockPath: string,
  targetJavaFormat: number
): string[] {
  const normalized = bedrockPath.replace(/\.tga$/i, '.png');
  const out: string[] = [];

  if (targetJavaFormat >= 18) {
    for (const s of STANDALONE_CONTAINER_SPRITES) {
      if (
        s.bedrockPath === normalized &&
        targetJavaFormat >= (s.minJavaFormat ?? 18) &&
        (s.maxJavaFormat === undefined || targetJavaFormat <= s.maxJavaFormat)
      ) {
        out.push(`${SPRITE_CONTAINER_PREFIX}${s.sprite}`);
      }
    }
    for (const sheet of Object.values(CONTAINER_SHEETS)) {
      for (const sp of sheet.sprites) {
        if (SLOT_LEGACY_SPRITES.has(sp.sprite)) continue;
        if (
          sp.bedrockPath === normalized &&
          targetJavaFormat >= (sp.minJavaFormat ?? 18) &&
          (sp.maxJavaFormat === undefined || targetJavaFormat <= sp.maxJavaFormat)
        ) {
          out.push(`${SPRITE_CONTAINER_PREFIX}${sp.sprite}`);
        }
      }
    }
  }

  for (const slot of CONTAINER_SLOT_SPECS) {
    if (slot.bedrockPath !== normalized) continue;
    if (targetJavaFormat >= 46) {
      out.push(`${SPRITE_CONTAINER_PREFIX}slot/${slot.modernSlot}.png`);
    } else if (slot.legacyItem) {
      out.push(slot.legacyItem);
    } else if (targetJavaFormat >= 18 && slot.legacySprite) {
      out.push(`${SPRITE_CONTAINER_PREFIX}${slot.legacySprite}`);
    }
  }

  return out;
}

export function migrateJavaContainerSlotPath(path: string, targetJavaFormat: number): string {
  if (targetJavaFormat >= 75 && path === `${SPRITE_CONTAINER_PREFIX}inventory/effect_background_large.png`) {
    return `${SPRITE_CONTAINER_PREFIX}inventory/effect_background.png`;
  }
  if (targetJavaFormat >= 18 && targetJavaFormat < 75 && path === `${SPRITE_CONTAINER_PREFIX}inventory/effect_background.png`) {
    return `${SPRITE_CONTAINER_PREFIX}inventory/effect_background_large.png`;
  }
  if (targetJavaFormat >= 46) {
    for (const slot of CONTAINER_SLOT_SPECS) {
      if (slot.legacyItem === path || (slot.legacySprite && `${SPRITE_CONTAINER_PREFIX}${slot.legacySprite}` === path)) {
        return `${SPRITE_CONTAINER_PREFIX}slot/${slot.modernSlot}.png`;
      }
    }
  } else {
    for (const slot of CONTAINER_SLOT_SPECS) {
      if (`${SPRITE_CONTAINER_PREFIX}slot/${slot.modernSlot}.png` === path) {
        if (slot.legacyItem) return slot.legacyItem;
        if (targetJavaFormat >= 18 && slot.legacySprite) return `${SPRITE_CONTAINER_PREFIX}${slot.legacySprite}`;
      }
    }
  }
  return path;
}

function blitRegion(
  src: DecodedRgbaImage,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dst: Uint8Array,
  dstW: number,
  dx: number,
  dy: number
) {
  for (let row = 0; row < sh; row++) {
    const srcY = sy + row;
    const dstY = dy + row;
    if (srcY < 0 || srcY >= src.height || dstY < 0) continue;
    for (let col = 0; col < sw; col++) {
      const srcX = sx + col;
      const dstX = dx + col;
      if (srcX < 0 || srcX >= src.width || dstX < 0 || dstX >= dstW) continue;
      const sIdx = (srcY * src.width + srcX) * 4;
      const dIdx = (dstY * dstW + dstX) * 4;
      dst[dIdx] = src.rgba[sIdx];
      dst[dIdx + 1] = src.rgba[sIdx + 1];
      dst[dIdx + 2] = src.rgba[sIdx + 2];
      dst[dIdx + 3] = src.rgba[sIdx + 3];
    }
  }
}

export async function sliceJavaContainerSheetForModernJava(
  sheetRelPath: string,
  pngBytes: Uint8Array,
  targetJavaFormat: number,
  sourceJavaFormat?: number
): Promise<{ sprites: Record<string, Uint8Array>; mcmetas: Record<string, string>; clippedSheet: Uint8Array | null } | null> {
  const key = getContainerKey(sheetRelPath);
  if (!key) return null;
  if (key === 'villager' && sheetRelPath.endsWith('/villager.png') && sourceJavaFormat !== undefined && sourceJavaFormat < 18) {
    return null;
  }
  const spec = CONTAINER_SHEETS[key];
  if (spec.sprites.length === 0) return null;

  const img = await decodeImageToRgba(pngBytes, MAX_CONTAINER_DIMENSION);
  if (!img || img.width < spec.sheetW || img.width > MAX_CONTAINER_DIMENSION || img.height > MAX_CONTAINER_DIMENSION) {
    return null;
  }

  const scale = img.width / spec.sheetW;
  const sprites: Record<string, Uint8Array> = {};
  const mcmetas: Record<string, string> = {};
  for (const sp of spec.sprites) {
    if (targetJavaFormat >= 75 && sp.sprite === 'inventory/effect_background_small.png') continue;
    const slotMeta = targetJavaFormat >= 46
      ? CONTAINER_SLOT_SPECS.find((s) => s.legacySprite === sp.sprite && s.inset1px)
      : undefined;
    const cropBox = slotMeta
      ? { x: sp.box.x + 1, y: sp.box.y + 1, w: sp.box.w - 2, h: sp.box.h - 2 }
      : sp.box;
    const cropped = cropRgbaBox(img, cropBox, scale);
    if (!hasNonTransparentPixels(cropped.rgba)) continue;
    const rawOut = `${SPRITE_CONTAINER_PREFIX}${sp.sprite}`;
    const outPath = migrateJavaContainerSlotPath(rawOut, targetJavaFormat);
    sprites[outPath] = encodeRgbaToPngSync(cropped.width, cropped.height, cropped.rgba);
    if (targetJavaFormat >= 75 && sp.sprite === 'inventory/effect_background_large.png') {
      mcmetas[`${outPath}.mcmeta`] = EFFECT_BG_MODERN_MCMETA;
    }
  }

  // Clip container sheet to panelBox on a clean canvas
  const clippedRgba = new Uint8Array(img.width * img.height * 4);
  const px = Math.round(spec.panelBox.x * scale);
  const py = Math.round(spec.panelBox.y * scale);
  const pw = Math.round(spec.panelBox.w * scale);
  const ph = Math.round(spec.panelBox.h * scale);
  blitRegion(img, px, py, pw, ph, clippedRgba, img.width, px, py);

  return {
    sprites,
    mcmetas,
    clippedSheet: encodeRgbaToPngSync(img.width, img.height, clippedRgba),
  };
}

export function getJavaContainerModernSpriteTarget(
  javaSpritePath: string,
  targetJavaFormat: number,
  targetVersionId?: string
): { sheetPath: string; box: CropBox; sheetW: number; sheetH: number } | null {
  if (!javaSpritePath.startsWith(SPRITE_CONTAINER_PREFIX)) return null;
  let rel = javaSpritePath.slice(SPRITE_CONTAINER_PREFIX.length);
  if (rel === 'inventory/effect_background.png') {
    rel = 'inventory/effect_background_large.png';
  }

  // Map 1.21.4+ slot/{banner,dye,banner_pattern,horse_armor,saddle,llama_armor}.png back to legacy sprites
  for (const slot of CONTAINER_SLOT_SPECS) {
    if (slot.legacySprite && `slot/${slot.modernSlot}.png` === rel) {
      rel = slot.legacySprite;
      break;
    }
  }

  for (const [key, spec] of Object.entries(CONTAINER_SHEETS)) {
    for (const sp of spec.sprites) {
      if (sp.sprite === rel) {
        const fileName =
          key === 'villager' && isJavaVillager2Version(targetJavaFormat, targetVersionId) ? 'villager2.png' : `${key}.png`;
        return {
          sheetPath: `${JAVA_CONTAINER_PREFIX}${fileName}`,
          box: sp.box,
          sheetW: spec.sheetW,
          sheetH: spec.sheetH,
        };
      }
    }
  }

  return null;
}

function extractBedrockThemeFromContainer(
  img: DecodedRgbaImage,
  panelW: number,
  panelH: number,
  slotX: number,
  slotY: number
): { dialogBg: Uint8Array; cellImage: Uint8Array; cellNormal: Uint8Array } {
  const s = Math.max(1, Math.min(8, Math.round(img.width / 256)));

  // 1. dialog_background_opaque.png (16s x 16s, border = 4s)
  const bgW = 16 * s;
  const bgRgba = new Uint8Array(bgW * bgW * 4);
  const b = 4 * s;
  const pw = panelW * s;
  const ph = panelH * s;
  blitRegion(img, 0, 0, b, b, bgRgba, bgW, 0, 0);
  blitRegion(img, pw - b, 0, b, b, bgRgba, bgW, bgW - b, 0);
  blitRegion(img, 0, ph - b, b, b, bgRgba, bgW, 0, bgW - b);
  blitRegion(img, pw - b, ph - b, b, b, bgRgba, bgW, bgW - b, bgW - b);
  blitRegion(img, b, 0, 8 * s, b, bgRgba, bgW, b, 0);
  blitRegion(img, b, ph - b, 8 * s, b, bgRgba, bgW, b, bgW - b);
  blitRegion(img, 0, b, b, 8 * s, bgRgba, bgW, 0, b);
  blitRegion(img, pw - b, b, b, 8 * s, bgRgba, bgW, bgW - b, b);
  blitRegion(img, 150 * s, 5 * s, 8 * s, 8 * s, bgRgba, bgW, b, b);

  // 2. cell_image.png (10s x 10s, border = s) & cell_image_normal.png (5s x 5s)
  const sx0 = slotX * s;
  const sy0 = slotY * s;
  const slotSize = 18 * s;

  const buildCell = (dim: number) => {
    const out = new Uint8Array(dim * dim * 4);
    const inner = dim - 2 * s;
    blitRegion(img, sx0, sy0, s, s, out, dim, 0, 0);
    blitRegion(img, sx0 + slotSize - s, sy0, s, s, out, dim, dim - s, 0);
    blitRegion(img, sx0, sy0 + slotSize - s, s, s, out, dim, 0, dim - s);
    blitRegion(img, sx0 + slotSize - s, sy0 + slotSize - s, s, s, out, dim, dim - s, dim - s);
    blitRegion(img, sx0 + s, sy0, inner, s, out, dim, s, 0);
    blitRegion(img, sx0 + s, sy0 + slotSize - s, inner, s, out, dim, s, dim - s);
    blitRegion(img, sx0, sy0 + s, s, inner, out, dim, 0, s);
    blitRegion(img, sx0 + slotSize - s, sy0 + s, s, inner, out, dim, dim - s, s);
    blitRegion(img, sx0 + 2 * s, sy0 + 2 * s, inner, inner, out, dim, s, s);
    return encodeRgbaToPngSync(dim, dim, out);
  };

  return {
    dialogBg: encodeRgbaToPngSync(bgW, bgW, bgRgba),
    cellImage: buildCell(10 * s),
    cellNormal: buildCell(5 * s),
  };
}

export async function extractBedrockContainerAssetsFromJava(
  javaContainers: Map<string, { sourcePath: string; bytes: Uint8Array }>,
  targetBedrockMinEngine: BedrockSemver,
  sourceJavaFormat?: number
): Promise<Array<{ sourcePath: string; outPath: string; bytes: Uint8Array }>> {
  const results: Array<{ sourcePath: string; outPath: string; bytes: Uint8Array }> = [];
  const written = new Set<string>();

  const decodedByKey = new Map<string, { sourcePath: string; img: DecodedRgbaImage; spec: ContainerSheetSpec }>();
  for (const [relPath, entry] of javaContainers.entries()) {
    const key = getContainerKey(relPath);
    if (!key) continue;
    if (key === 'villager' && relPath.endsWith('/villager.png') && sourceJavaFormat !== undefined && sourceJavaFormat < 18) {
      continue;
    }
    const spec = CONTAINER_SHEETS[key];
    const img = await decodeImageToRgba(entry.bytes, MAX_CONTAINER_DIMENSION);
    if (!img || img.width < spec.sheetW) continue;
    decodedByKey.set(key, { sourcePath: entry.sourcePath, img, spec });
  }

  // 1. Extract 9-slice theme from highest-priority available container
  const themeCandidates: Array<{ key: string; pw: number; ph: number; sx: number; sy: number }> = [
    { key: 'inventory', pw: 176, ph: 166, sx: 7, sy: 83 },
    { key: 'generic_54', pw: 176, ph: 222, sx: 7, sy: 139 },
    { key: 'crafting_table', pw: 176, ph: 166, sx: 7, sy: 83 },
    { key: 'furnace', pw: 176, ph: 166, sx: 7, sy: 83 },
    { key: 'shulker_box', pw: 176, ph: 166, sx: 7, sy: 83 },
    { key: 'dispenser', pw: 176, ph: 166, sx: 7, sy: 83 },
  ];
  for (const cand of themeCandidates) {
    const found = decodedByKey.get(cand.key);
    if (!found) continue;
    const theme = extractBedrockThemeFromContainer(found.img, cand.pw, cand.ph, cand.sx, cand.sy);
    for (const [outPath, bytes] of [
      ['textures/ui/dialog_background_opaque.png', theme.dialogBg],
      ['textures/ui/cell_image.png', theme.cellImage],
      ['textures/ui/cell_image_normal.png', theme.cellNormal],
    ] as const) {
      written.add(outPath);
      results.push({ sourcePath: found.sourcePath, outPath, bytes });
    }
    break;
  }

  // 2. Extract individual sprites (primary sheets first, fallback sheets second)
  const orderedKeys = [
    'furnace', 'brewing_stand', 'beacon', 'enchanting_table', 'anvil',
    'loom', 'villager', 'inventory', 'horse', 'blast_furnace', 'smoker', 'grindstone', 'smithing', 'crafting_table',
  ];
  for (const key of orderedKeys) {
    const found = decodedByKey.get(key);
    if (!found) continue;
    const scale = found.img.width / found.spec.sheetW;

    for (const sp of found.spec.sprites) {
      if (!sp.bedrockPath || written.has(sp.bedrockPath)) continue;
      if (compareBedrockVersion(targetBedrockMinEngine, sp.minBedrockVersion ?? [1, 12, 0]) < 0) continue;
      const cropped = cropRgbaBox(found.img, sp.box, scale);
      if (!hasNonTransparentPixels(cropped.rgba)) continue;
      written.add(sp.bedrockPath);
      results.push({ sourcePath: found.sourcePath, outPath: sp.bedrockPath, bytes: encodeRgbaToPngSync(cropped.width, cropped.height, cropped.rgba) });
    }

    for (const extra of found.spec.panelBedrockExtras ?? []) {
      const cropped = cropRgbaBox(found.img, extra.box, scale);
      const isInsidePanel =
        extra.box.x >= found.spec.panelBox.x &&
        extra.box.y >= found.spec.panelBox.y &&
        extra.box.x + extra.box.w <= found.spec.panelBox.x + found.spec.panelBox.w &&
        extra.box.y + extra.box.h <= found.spec.panelBox.y + found.spec.panelBox.h;
      if (!isInsidePanel && !hasNonTransparentPixels(cropped.rgba)) continue;
      const png = encodeRgbaToPngSync(cropped.width, cropped.height, cropped.rgba);
      for (const bp of extra.bedrockPaths) {
        if (written.has(bp)) continue;
        written.add(bp);
        results.push({ sourcePath: found.sourcePath, outPath: bp, bytes: png });
      }
    }
  }

  return results;
}

function drawNineSlice(
  dst: Uint8Array,
  dstW: number,
  dstH: number,
  src: DecodedRgbaImage,
  borderPx: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  const b = Math.min(borderPx, Math.floor(src.width / 2), Math.floor(src.height / 2), Math.floor(rw / 2), Math.floor(rh / 2));
  const srcMidW = Math.max(1, src.width - 2 * b);
  const srcMidH = Math.max(1, src.height - 2 * b);
  const dstMidW = Math.max(1, rw - 2 * b);
  const dstMidH = Math.max(1, rh - 2 * b);

  for (let y = 0; y < rh; y++) {
    const dy = ry + y;
    if (dy < 0 || dy >= dstH) continue;
    const sy =
      y < b ? y :
      y >= rh - b ? src.height - (rh - y) :
      b + Math.floor(((y - b) * srcMidH) / dstMidH);
    for (let x = 0; x < rw; x++) {
      const dx = rx + x;
      if (dx < 0 || dx >= dstW) continue;
      const sx =
        x < b ? x :
        x >= rw - b ? src.width - (rw - x) :
        b + Math.floor(((x - b) * srcMidW) / dstMidW);
      const sIdx = (sy * src.width + sx) * 4;
      const a = src.rgba[sIdx + 3];
      if (a === 0) continue;
      const dIdx = (dy * dstW + dx) * 4;
      alphaBlendPixel(dst, dIdx, src.rgba[sIdx], src.rgba[sIdx + 1], src.rgba[sIdx + 2], a);
    }
  }
}

function fillSolidRect(dst: Uint8Array, dstW: number, rx: number, ry: number, rw: number, rh: number, r: number, g: number, b: number) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const idx = (y * dstW + x) * 4;
      dst[idx] = r;
      dst[idx + 1] = g;
      dst[idx + 2] = b;
      dst[idx + 3] = 255;
    }
  }
}

function gridSlots(x0: number, y0: number, cols: number, rows: number): CropBox[] {
  const out: CropBox[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: x0 + c * 18, y: y0 + r * 18, w: 18, h: 18 });
    }
  }
  return out;
}

const PLAYER_INV_SLOTS = [...gridSlots(7, 83, 9, 3), ...gridSlots(7, 141, 9, 1)];

const CONTAINER_SYNTH_LAYOUTS: Record<string, { panel: CropBox; slots: CropBox[]; extras?: Array<{ bedrock: string; box: CropBox }> }> = {
  inventory: {
    panel: STANDARD_PANEL,
    slots: [
      ...gridSlots(7, 7, 1, 4),
      { x: 76, y: 61, w: 18, h: 18 },
      ...gridSlots(97, 17, 2, 2),
      { x: 153, y: 27, w: 18, h: 18 },
      ...PLAYER_INV_SLOTS,
    ],
  },
  generic_54: {
    panel: { x: 0, y: 0, w: 176, h: 222 },
    slots: [...gridSlots(7, 17, 9, 6), ...gridSlots(7, 139, 9, 3), ...gridSlots(7, 197, 9, 1)],
  },
  crafting_table: {
    panel: STANDARD_PANEL,
    slots: [...gridSlots(29, 16, 3, 3), { x: 119, y: 30, w: 26, h: 26 }, ...PLAYER_INV_SLOTS],
    extras: [{ bedrock: 'textures/ui/arrow_inactive.png', box: { x: 89, y: 34, w: 22, h: 15 } }],
  },
  furnace: {
    panel: STANDARD_PANEL,
    slots: [{ x: 55, y: 16, w: 18, h: 18 }, { x: 55, y: 52, w: 18, h: 18 }, { x: 111, y: 30, w: 26, h: 26 }, ...PLAYER_INV_SLOTS],
    extras: [
      { bedrock: 'textures/ui/flame_empty_image.png', box: { x: 56, y: 36, w: 14, h: 14 } },
      { bedrock: 'textures/ui/arrow_inactive.png', box: { x: 80, y: 35, w: 22, h: 15 } },
    ],
  },
  blast_furnace: {
    panel: STANDARD_PANEL,
    slots: [{ x: 55, y: 16, w: 18, h: 18 }, { x: 55, y: 52, w: 18, h: 18 }, { x: 111, y: 30, w: 26, h: 26 }, ...PLAYER_INV_SLOTS],
    extras: [
      { bedrock: 'textures/ui/flame_empty_image.png', box: { x: 56, y: 36, w: 14, h: 14 } },
      { bedrock: 'textures/ui/arrow_inactive.png', box: { x: 80, y: 35, w: 22, h: 15 } },
    ],
  },
  smoker: {
    panel: STANDARD_PANEL,
    slots: [{ x: 55, y: 16, w: 18, h: 18 }, { x: 55, y: 52, w: 18, h: 18 }, { x: 111, y: 30, w: 26, h: 26 }, ...PLAYER_INV_SLOTS],
    extras: [
      { bedrock: 'textures/ui/flame_empty_image.png', box: { x: 56, y: 36, w: 14, h: 14 } },
      { bedrock: 'textures/ui/arrow_inactive.png', box: { x: 80, y: 35, w: 22, h: 15 } },
    ],
  },
  dispenser: {
    panel: STANDARD_PANEL,
    slots: [...gridSlots(61, 16, 3, 3), ...PLAYER_INV_SLOTS],
  },
  hopper: {
    panel: { x: 0, y: 0, w: 176, h: 133 },
    slots: [...gridSlots(43, 19, 5, 1), ...gridSlots(7, 50, 9, 3), ...gridSlots(7, 108, 9, 1)],
  },
  shulker_box: {
    panel: STANDARD_PANEL,
    slots: [...gridSlots(7, 17, 9, 3), ...PLAYER_INV_SLOTS],
  },
  brewing_stand: {
    panel: STANDARD_PANEL,
    slots: [
      { x: 16, y: 16, w: 18, h: 18 },
      { x: 78, y: 16, w: 18, h: 18 },
      { x: 55, y: 50, w: 18, h: 18 },
      { x: 78, y: 57, w: 18, h: 18 },
      { x: 101, y: 50, w: 18, h: 18 },
      ...PLAYER_INV_SLOTS,
    ],
    extras: [
      { bedrock: 'textures/ui/brewing_arrow_empty.png', box: { x: 97, y: 16, w: 9, h: 28 } },
      { bedrock: 'textures/ui/bubbles_empty.png', box: { x: 63, y: 14, w: 12, h: 29 } },
      { bedrock: 'textures/ui/brewing_fuel_bar_empty.png', box: { x: 60, y: 44, w: 18, h: 4 } },
    ],
  },
  anvil: {
    panel: STANDARD_PANEL,
    slots: [{ x: 26, y: 46, w: 18, h: 18 }, { x: 75, y: 46, w: 18, h: 18 }, { x: 133, y: 46, w: 18, h: 18 }, ...PLAYER_INV_SLOTS],
    extras: [{ bedrock: 'textures/ui/arrow_large.png', box: { x: 99, y: 45, w: 22, h: 15 } }],
  },
  enchanting_table: {
    panel: STANDARD_PANEL,
    slots: [{ x: 14, y: 46, w: 18, h: 18 }, { x: 34, y: 46, w: 18, h: 18 }, ...PLAYER_INV_SLOTS],
  },
  beacon: {
    panel: { x: 0, y: 0, w: 230, h: 219 },
    slots: [{ x: 135, y: 109, w: 18, h: 18 }, ...gridSlots(35, 136, 9, 3), ...gridSlots(35, 194, 9, 1)],
  },
  horse: {
    panel: STANDARD_PANEL,
    slots: [{ x: 7, y: 17, w: 18, h: 18 }, { x: 7, y: 35, w: 18, h: 18 }, ...PLAYER_INV_SLOTS],
  },
};

export async function synthesizeJavaContainersFromBedrock(
  bedrockParts: Map<string, Uint8Array>,
  targetJavaFormat: number
): Promise<Record<string, Uint8Array>> {
  const decodedParts = new Map<string, DecodedRgbaImage>();
  for (const [k, v] of bedrockParts.entries()) {
    const d = await decodeImageToRgba(v, MAX_CONTAINER_DIMENSION);
    if (d) decodedParts.set(k, d);
  }

  const panelImg = decodedParts.get('textures/ui/dialog_background_opaque.png') ?? null;
  const cellImg = decodedParts.get('textures/ui/cell_image.png') ?? decodedParts.get('textures/ui/cell_image_normal.png') ?? null;
  if (!panelImg && !cellImg) {
    return {};
  }

  const s = panelImg
    ? Math.max(1, Math.min(4, Math.round(panelImg.width / 16)))
    : Math.max(1, Math.min(4, Math.round((cellImg!.width >= 10 ? cellImg!.width / 10 : cellImg!.width / 5))));

  const out: Record<string, Uint8Array> = {};
  for (const [key, layout] of Object.entries(CONTAINER_SYNTH_LAYOUTS)) {
    const sheetSpec = CONTAINER_SHEETS[key];
    const w = sheetSpec.sheetW * s;
    const h = sheetSpec.sheetH * s;
    const rgba = new Uint8Array(w * h * 4);

    if (panelImg) {
      drawNineSlice(rgba, w, h, panelImg, 4 * s, layout.panel.x * s, layout.panel.y * s, layout.panel.w * s, layout.panel.h * s);
    } else {
      fillSolidRect(rgba, w, layout.panel.x * s, layout.panel.y * s, layout.panel.w * s, layout.panel.h * s, 198, 198, 198);
    }

    for (const slot of layout.slots) {
      if (cellImg) {
        drawNineSlice(rgba, w, h, cellImg, s, slot.x * s, slot.y * s, slot.w * s, slot.h * s);
      } else {
        fillSolidRect(rgba, w, slot.x * s, slot.y * s, slot.w * s, slot.h * s, 139, 139, 139);
      }
    }

    for (const extra of layout.extras ?? []) {
      const exImg = decodedParts.get(extra.bedrock);
      if (exImg) {
        blitRgbaScaled(rgba, w, h, exImg, extra.box.x * s, extra.box.y * s, extra.box.w * s, extra.box.h * s, true);
      }
    }

    if (targetJavaFormat < 18) {
      for (const sp of sheetSpec.sprites) {
        if (!sp.bedrockPath) continue;
        const spImg = decodedParts.get(sp.bedrockPath);
        if (spImg) {
          blitRgbaScaled(rgba, w, h, spImg, sp.box.x * s, sp.box.y * s, sp.box.w * s, sp.box.h * s, true);
        }
      }
    }

    out[`${JAVA_CONTAINER_PREFIX}${key}.png`] = encodeRgbaToPngSync(w, h, rgba);
  }

  return out;
}
