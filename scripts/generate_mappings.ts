import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import minecraftData from 'minecraft-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return await res.json();
}

// Fetch authoritative sound mappings from GeyserMC/mappings
async function fetchGeyserSounds(): Promise<{ java_to_bedrock: Record<string, string>; bedrock_to_java: Record<string, string> }> {
  const j2b: Record<string, string> = {};
  const b2j: Record<string, string> = {};

  try {
    console.log("Fetching authoritative sound mappings from GeyserMC/mappings...");
    const geyserSounds = await fetchJson('https://raw.githubusercontent.com/GeyserMC/mappings/master/sounds.json');

    for (const [javaEvent, mapping] of Object.entries(geyserSounds) as [string, any][]) {
      const bedrockEvent = mapping.playsound_mapping;
      if (bedrockEvent && typeof bedrockEvent === 'string') {
        j2b[javaEvent] = bedrockEvent;
        if (!b2j[bedrockEvent]) {
          b2j[bedrockEvent] = javaEvent;
        }
      }
    }
    console.log(`  Loaded ${Object.keys(j2b).length} Geyser sound events!`);
  } catch (e) {
    console.warn("  Failed to fetch Geyser sounds, will use fallback.", e);
  }

  return { java_to_bedrock: j2b, bedrock_to_java: b2j };
}

// Generate language and item mapping from PrismarineJS minecraft-data
function getPrismarineLanguageMappings(javaVerId: string, bedrockVerId: string) {
  const j2b: Record<string, string> = {};
  const b2j: Record<string, string> = {};

  try {
    // Clean versions for minecraft-data lookup
    const jClean = javaVerId.split('.').slice(0, 3).join('.');
    const bClean = bedrockVerId.split('.').slice(0, 3).join('.');

    const javaData = minecraftData(jClean) || minecraftData('1.21.4');
    const bedData = minecraftData(`bedrock_${bClean}`) || minecraftData('bedrock_1.21.0');

    if (javaData?.language && bedData?.language) {
      const valToBKey = new Map<string, string>();
      for (const [bk, bv] of Object.entries(bedData.language)) {
        if (bv && typeof bv === 'string') {
          valToBKey.set(bv.toLowerCase().trim(), bk);
        }
      }

      for (const [jk, jv] of Object.entries(javaData.language)) {
        if (!jv || typeof jv !== 'string') continue;
        const bk = valToBKey.get(jv.toLowerCase().trim());
        if (bk) {
          j2b[jk] = bk;
          if (!b2j[bk]) b2j[bk] = jk;
        }
      }
      console.log(`  PrismarineJS matched ${Object.keys(j2b).length} language keys for Java ${jClean} <-> Bedrock ${bClean}`);
    }
  } catch (e) {
    console.warn(`  Warning matching PrismarineJS language keys:`, e);
  }

  return { java_to_bedrock: j2b, bedrock_to_java: b2j };
}

// Authoritative texture overrides verified against Mojang/bedrock-samples
// (terrain_texture.json & item_texture.json)
const AUTHORITATIVE_TEXTURE_OVERRIDES: Record<string, string> = {
  // Terracotta & Stained Terracotta (was falsely mapped to glazed_terracotta_*)
  "assets/minecraft/textures/block/terracotta.png": "textures/blocks/hardened_clay.png",
  "assets/minecraft/textures/block/white_terracotta.png": "textures/blocks/hardened_clay_stained_white.png",
  "assets/minecraft/textures/block/orange_terracotta.png": "textures/blocks/hardened_clay_stained_orange.png",
  "assets/minecraft/textures/block/magenta_terracotta.png": "textures/blocks/hardened_clay_stained_magenta.png",
  "assets/minecraft/textures/block/light_blue_terracotta.png": "textures/blocks/hardened_clay_stained_light_blue.png",
  "assets/minecraft/textures/block/yellow_terracotta.png": "textures/blocks/hardened_clay_stained_yellow.png",
  "assets/minecraft/textures/block/lime_terracotta.png": "textures/blocks/hardened_clay_stained_lime.png",
  "assets/minecraft/textures/block/pink_terracotta.png": "textures/blocks/hardened_clay_stained_pink.png",
  "assets/minecraft/textures/block/gray_terracotta.png": "textures/blocks/hardened_clay_stained_gray.png",
  "assets/minecraft/textures/block/light_gray_terracotta.png": "textures/blocks/hardened_clay_stained_silver.png",
  "assets/minecraft/textures/block/cyan_terracotta.png": "textures/blocks/hardened_clay_stained_cyan.png",
  "assets/minecraft/textures/block/purple_terracotta.png": "textures/blocks/hardened_clay_stained_purple.png",
  "assets/minecraft/textures/block/blue_terracotta.png": "textures/blocks/hardened_clay_stained_blue.png",
  "assets/minecraft/textures/block/brown_terracotta.png": "textures/blocks/hardened_clay_stained_brown.png",
  "assets/minecraft/textures/block/green_terracotta.png": "textures/blocks/hardened_clay_stained_green.png",
  "assets/minecraft/textures/block/red_terracotta.png": "textures/blocks/hardened_clay_stained_red.png",
  "assets/minecraft/textures/block/black_terracotta.png": "textures/blocks/hardened_clay_stained_black.png",

  // Light Gray (Silver in Bedrock) blocks (was falsely mapped to gray / candle)
  "assets/minecraft/textures/block/light_gray_wool.png": "textures/blocks/wool_colored_silver.png",
  "assets/minecraft/textures/block/light_gray_concrete.png": "textures/blocks/concrete_silver.png",
  "assets/minecraft/textures/block/light_gray_concrete_powder.png": "textures/blocks/concrete_powder_silver.png",
  "assets/minecraft/textures/block/light_gray_glazed_terracotta.png": "textures/blocks/glazed_terracotta_silver.png",
  "assets/minecraft/textures/block/light_gray_stained_glass.png": "textures/blocks/glass_silver.png",
  "assets/minecraft/textures/block/light_gray_stained_glass_pane_top.png": "textures/blocks/glass_pane_top_silver.png",
  "assets/minecraft/textures/block/light_gray_shulker_box.png": "textures/blocks/shulker_top_silver.png",
  "assets/minecraft/textures/block/shulker_box.png": "textures/blocks/shulker_top_undyed.png",

  // Stone, Bricks, Sandstone, Prismarine
  "assets/minecraft/textures/block/bricks.png": "textures/blocks/brick.png",
  "assets/minecraft/textures/block/stone_bricks.png": "textures/blocks/stonebrick.png",
  "assets/minecraft/textures/block/mossy_stone_bricks.png": "textures/blocks/stonebrick_mossy.png",
  "assets/minecraft/textures/block/cracked_stone_bricks.png": "textures/blocks/stonebrick_cracked.png",
  "assets/minecraft/textures/block/chiseled_stone_bricks.png": "textures/blocks/stonebrick_carved.png",
  "assets/minecraft/textures/block/nether_bricks.png": "textures/blocks/nether_brick.png",
  "assets/minecraft/textures/block/polished_andesite.png": "textures/blocks/stone_andesite_smooth.png",
  "assets/minecraft/textures/block/polished_diorite.png": "textures/blocks/stone_diorite_smooth.png",
  "assets/minecraft/textures/block/polished_granite.png": "textures/blocks/stone_granite_smooth.png",
  "assets/minecraft/textures/block/smooth_stone.png": "textures/blocks/stone_slab_top.png",
  "assets/minecraft/textures/block/prismarine.png": "textures/blocks/prismarine_rough.png",
  "assets/minecraft/textures/block/sandstone.png": "textures/blocks/sandstone_normal.png",
  "assets/minecraft/textures/block/chiseled_sandstone.png": "textures/blocks/sandstone_carved.png",
  "assets/minecraft/textures/block/cut_sandstone.png": "textures/blocks/sandstone_smooth.png",
  "assets/minecraft/textures/block/red_sandstone.png": "textures/blocks/red_sandstone_normal.png",
  "assets/minecraft/textures/block/chiseled_red_sandstone.png": "textures/blocks/red_sandstone_carved.png",
  "assets/minecraft/textures/block/cut_red_sandstone.png": "textures/blocks/red_sandstone_smooth.png",
  "assets/minecraft/textures/block/quartz_pillar.png": "textures/blocks/quartz_block_lines.png",
  "assets/minecraft/textures/block/quartz_pillar_top.png": "textures/blocks/quartz_block_lines_top.png",

  // Woods, Logs, Planks, Doors
  "assets/minecraft/textures/block/dark_oak_log.png": "textures/blocks/log_big_oak.png",
  "assets/minecraft/textures/block/dark_oak_log_top.png": "textures/blocks/log_big_oak_top.png",
  "assets/minecraft/textures/block/dark_oak_planks.png": "textures/blocks/planks_big_oak.png",
  "assets/minecraft/textures/block/dark_oak_sapling.png": "textures/blocks/sapling_roofed_oak.png",
  "assets/minecraft/textures/block/dark_oak_leaves.png": "textures/blocks/leaves_big_oak_opaque.png",
  "assets/minecraft/textures/block/cherry_log.png": "textures/blocks/cherry_log_side.png",
  "assets/minecraft/textures/block/stripped_cherry_log.png": "textures/blocks/stripped_cherry_log_side.png",
  "assets/minecraft/textures/block/mangrove_log.png": "textures/blocks/mangrove_log_side.png",
  "assets/minecraft/textures/block/stripped_mangrove_log.png": "textures/blocks/stripped_mangrove_log_side.png",
  "assets/minecraft/textures/block/crimson_stem.png": "textures/blocks/huge_fungus/crimson_log_side.png",
  "assets/minecraft/textures/block/crimson_stem_top.png": "textures/blocks/huge_fungus/crimson_log_top.png",
  "assets/minecraft/textures/block/stripped_crimson_stem.png": "textures/blocks/huge_fungus/stripped_crimson_stem_side.png",
  "assets/minecraft/textures/block/stripped_crimson_stem_top.png": "textures/blocks/huge_fungus/stripped_crimson_stem_top.png",
  "assets/minecraft/textures/block/crimson_door_bottom.png": "textures/blocks/huge_fungus/crimson_door_lower.png",
  "assets/minecraft/textures/block/crimson_door_top.png": "textures/blocks/huge_fungus/crimson_door_top.png",
  "assets/minecraft/textures/block/warped_stem.png": "textures/blocks/huge_fungus/warped_stem_side.png",
  "assets/minecraft/textures/block/warped_stem_top.png": "textures/blocks/huge_fungus/warped_stem_top.png",
  "assets/minecraft/textures/block/stripped_warped_stem.png": "textures/blocks/huge_fungus/stripped_warped_stem_side.png",
  "assets/minecraft/textures/block/stripped_warped_stem_top.png": "textures/blocks/huge_fungus/stripped_warped_stem_top.png",
  "assets/minecraft/textures/block/warped_door_bottom.png": "textures/blocks/huge_fungus/warped_door_lower.png",
  "assets/minecraft/textures/block/warped_door_top.png": "textures/blocks/huge_fungus/warped_door_top.png",

  // Utility & Interactive Blocks (Furnace, Smoker, Blast Furnace, Redstone, etc.)
  "assets/minecraft/textures/block/furnace_front.png": "textures/blocks/furnace_front_off.png",
  "assets/minecraft/textures/block/blast_furnace_front.png": "textures/blocks/blast_furnace_front_off.png",
  "assets/minecraft/textures/block/smoker_front.png": "textures/blocks/smoker_front_off.png",
  "assets/minecraft/textures/block/dispenser_front.png": "textures/blocks/dispenser_front_horizontal.png",
  "assets/minecraft/textures/block/dropper_front.png": "textures/blocks/dropper_front_horizontal.png",
  "assets/minecraft/textures/block/observer_back_on.png": "textures/blocks/observer_back_lit.png",
  "assets/minecraft/textures/block/comparator.png": "textures/blocks/comparator_off.png",
  "assets/minecraft/textures/block/repeater.png": "textures/blocks/repeater_off.png",
  "assets/minecraft/textures/block/redstone_lamp.png": "textures/blocks/redstone_lamp_off.png",
  "assets/minecraft/textures/block/activator_rail_on.png": "textures/blocks/rail_activator_powered.png",
  "assets/minecraft/textures/block/detector_rail_on.png": "textures/blocks/rail_detector_powered.png",
  "assets/minecraft/textures/block/powered_rail.png": "textures/blocks/rail_golden.png",
  "assets/minecraft/textures/block/powered_rail_on.png": "textures/blocks/rail_golden_powered.png",
  "assets/minecraft/textures/block/rail.png": "textures/blocks/rail_normal.png",
  "assets/minecraft/textures/block/rail_corner.png": "textures/blocks/rail_normal_turned.png",
  "assets/minecraft/textures/block/note_block.png": "textures/blocks/noteblock.png",
  "assets/minecraft/textures/block/grindstone_side.png": "textures/blocks/grindstone_side.png",
  "assets/minecraft/textures/block/grindstone_pivot.png": "textures/blocks/grindstone_pivot.png",
  "assets/minecraft/textures/block/grindstone_round.png": "textures/blocks/grindstone_round.png",
  "assets/minecraft/textures/block/fletching_table_front.png": "textures/blocks/fletcher_table_side1.png",
  "assets/minecraft/textures/block/fletching_table_side.png": "textures/blocks/fletcher_table_side2.png",
  "assets/minecraft/textures/block/stonecutter_saw.png": "textures/blocks/stonecutter2_saw.png",
  "assets/minecraft/textures/block/stonecutter_side.png": "textures/blocks/stonecutter2_side.png",
  "assets/minecraft/textures/block/stonecutter_top.png": "textures/blocks/stonecutter2_top.png",
  "assets/minecraft/textures/block/stonecutter_bottom.png": "textures/blocks/stonecutter2_bottom.png",
  "assets/minecraft/textures/block/chipped_anvil_top.png": "textures/blocks/anvil_top_damaged_1.png",
  "assets/minecraft/textures/block/damaged_anvil_top.png": "textures/blocks/anvil_top_damaged_2.png",
  "assets/minecraft/textures/block/end_portal_frame_top.png": "textures/blocks/endframe_top.png",
  "assets/minecraft/textures/block/end_portal_frame_side.png": "textures/blocks/endframe_side.png",
  "assets/minecraft/textures/block/end_portal_frame_eye.png": "textures/blocks/endframe_eye.png",
  "assets/minecraft/textures/block/item_frame.png": "textures/blocks/itemframe_background.png",
  "assets/minecraft/textures/block/lightning_rod_on.png": "textures/blocks/lightning_rod_powered.png",
  "assets/minecraft/textures/block/carved_pumpkin.png": "textures/blocks/pumpkin_face_off.png",
  "assets/minecraft/textures/block/jack_o_lantern.png": "textures/blocks/pumpkin_face_on.png",

  // Dirt, Grass, Plants, Crops
  "assets/minecraft/textures/block/grass_block_side.png": "textures/blocks/grass_side_carried.png",
  "assets/minecraft/textures/block/grass_block_snow.png": "textures/blocks/grass_side_snowed.png",
  "assets/minecraft/textures/block/rooted_dirt.png": "textures/blocks/dirt_with_roots.png",
  "assets/minecraft/textures/block/farmland_moist.png": "textures/blocks/farmland_wet.png",
  "assets/minecraft/textures/block/melon_stem.png": "textures/blocks/melon_stem_disconnected.png",
  "assets/minecraft/textures/block/pumpkin_stem.png": "textures/blocks/pumpkin_stem_disconnected.png",
  "assets/minecraft/textures/block/wheat_stage0.png": "textures/blocks/wheat_stage_0.png",
  "assets/minecraft/textures/block/wheat_stage1.png": "textures/blocks/wheat_stage_1.png",
  "assets/minecraft/textures/block/wheat_stage2.png": "textures/blocks/wheat_stage_2.png",
  "assets/minecraft/textures/block/wheat_stage3.png": "textures/blocks/wheat_stage_3.png",
  "assets/minecraft/textures/block/wheat_stage4.png": "textures/blocks/wheat_stage_4.png",
  "assets/minecraft/textures/block/wheat_stage5.png": "textures/blocks/wheat_stage_5.png",
  "assets/minecraft/textures/block/wheat_stage6.png": "textures/blocks/wheat_stage_6.png",
  "assets/minecraft/textures/block/wheat_stage7.png": "textures/blocks/wheat_stage_7.png",
  "assets/minecraft/textures/block/carrots_stage0.png": "textures/blocks/carrots_stage_0.png",
  "assets/minecraft/textures/block/carrots_stage1.png": "textures/blocks/carrots_stage_1.png",
  "assets/minecraft/textures/block/carrots_stage2.png": "textures/blocks/carrots_stage_2.png",
  "assets/minecraft/textures/block/carrots_stage3.png": "textures/blocks/carrots_stage_3.png",
  "assets/minecraft/textures/block/potatoes_stage0.png": "textures/blocks/potatoes_stage_0.png",
  "assets/minecraft/textures/block/potatoes_stage1.png": "textures/blocks/potatoes_stage_1.png",
  "assets/minecraft/textures/block/potatoes_stage2.png": "textures/blocks/potatoes_stage_2.png",
  "assets/minecraft/textures/block/potatoes_stage3.png": "textures/blocks/potatoes_stage_3.png",
  "assets/minecraft/textures/block/beetroots_stage0.png": "textures/blocks/beetroots_stage_0.png",
  "assets/minecraft/textures/block/beetroots_stage1.png": "textures/blocks/beetroots_stage_1.png",
  "assets/minecraft/textures/block/beetroots_stage2.png": "textures/blocks/beetroots_stage_2.png",
  "assets/minecraft/textures/block/beetroots_stage3.png": "textures/blocks/beetroots_stage_3.png",
  "assets/minecraft/textures/block/nether_wart_stage0.png": "textures/blocks/nether_wart_stage_0.png",
  "assets/minecraft/textures/block/nether_wart_stage1.png": "textures/blocks/nether_wart_stage_1.png",
  "assets/minecraft/textures/block/nether_wart_stage2.png": "textures/blocks/nether_wart_stage_2.png",
  "assets/minecraft/textures/block/cocoa_stage0.png": "textures/blocks/cocoa_stage_0.png",
  "assets/minecraft/textures/block/cocoa_stage1.png": "textures/blocks/cocoa_stage_1.png",
  "assets/minecraft/textures/block/cocoa_stage2.png": "textures/blocks/cocoa_stage_2.png",
  "assets/minecraft/textures/block/torchflower_crop_stage1.png": "textures/blocks/torchflower_crop_stage_1.png",
  "assets/minecraft/textures/block/Flowering_azalea_leaves.png": "textures/blocks/azalea_leaves_flowers_opaque.png",
  "assets/minecraft/textures/block/flowering_azalea_leaves.png": "textures/blocks/azalea_leaves_flowers_opaque.png",
  "assets/minecraft/textures/block/lilac_bottom.png": "textures/blocks/double_plant_syringa_bottom.png",
  "assets/minecraft/textures/block/lilac_top.png": "textures/blocks/double_plant_syringa_top.png",
  "assets/minecraft/textures/block/peony_bottom.png": "textures/blocks/double_plant_paeonia_bottom.png",
  "assets/minecraft/textures/block/peony_top.png": "textures/blocks/double_plant_paeonia_top.png",
  "assets/minecraft/textures/block/rose_bush_bottom.png": "textures/blocks/double_plant_rose_bottom.png",
  "assets/minecraft/textures/block/rose_bush_top.png": "textures/blocks/double_plant_rose_top.png",
  "assets/minecraft/textures/block/sunflower_bottom.png": "textures/blocks/double_plant_sunflower_bottom.png",
  "assets/minecraft/textures/block/sunflower_top.png": "textures/blocks/double_plant_sunflower_top.png",
  "assets/minecraft/textures/block/tall_grass_bottom.png": "textures/blocks/double_plant_grass_bottom.png",
  "assets/minecraft/textures/block/tall_grass_top.png": "textures/blocks/double_plant_grass_top.png",
  "assets/minecraft/textures/block/large_fern_bottom.png": "textures/blocks/double_plant_fern_bottom.png",
  "assets/minecraft/textures/block/large_fern_top.png": "textures/blocks/double_plant_fern_top.png",
  "assets/minecraft/textures/block/poppy.png": "textures/blocks/flower_rose.png",
  "assets/minecraft/textures/block/azure_bluet.png": "textures/blocks/flower_houstonia.png",
  "assets/minecraft/textures/block/cobweb.png": "textures/blocks/web.png",
  "assets/minecraft/textures/block/sugar_cane.png": "textures/blocks/reeds.png",
  "assets/minecraft/textures/block/lily_pad.png": "textures/blocks/waterlily.png",
  "assets/minecraft/textures/block/dead_bush.png": "textures/blocks/deadbush.png",
  "assets/minecraft/textures/block/short_grass.png": "textures/blocks/tallgrass.png",
  "assets/minecraft/textures/block/grass.png": "textures/blocks/tallgrass.png",
  "assets/minecraft/textures/block/fern.png": "textures/blocks/fern.png",
  "assets/minecraft/textures/block/cactus_top.png": "textures/blocks/cactus_top.png",
  "assets/minecraft/textures/block/cactus_side.png": "textures/blocks/cactus_side.png",
  "assets/minecraft/textures/block/cactus_bottom.png": "textures/blocks/cactus_bottom.png",
  "assets/minecraft/textures/block/tube_coral_block.png": "textures/blocks/coral_blue.png",
  "assets/minecraft/textures/block/brain_coral_block.png": "textures/blocks/coral_pink.png",
  "assets/minecraft/textures/block/bubble_coral_block.png": "textures/blocks/coral_purple.png",
  "assets/minecraft/textures/block/fire_coral_block.png": "textures/blocks/coral_red.png",
  "assets/minecraft/textures/block/horn_coral_block.png": "textures/blocks/coral_yellow.png",
  "assets/minecraft/textures/block/dead_tube_coral_block.png": "textures/blocks/coral_blue_dead.png",
  "assets/minecraft/textures/block/dead_brain_coral_block.png": "textures/blocks/coral_pink_dead.png",
  "assets/minecraft/textures/block/dead_bubble_coral_block.png": "textures/blocks/coral_purple_dead.png",
  "assets/minecraft/textures/block/dead_fire_coral_block.png": "textures/blocks/coral_red_dead.png",
  "assets/minecraft/textures/block/dead_horn_coral_block.png": "textures/blocks/coral_yellow_dead.png",
  "assets/minecraft/textures/block/tube_coral.png": "textures/blocks/coral_plant_blue.png",
  "assets/minecraft/textures/block/brain_coral.png": "textures/blocks/coral_plant_pink.png",
  "assets/minecraft/textures/block/bubble_coral.png": "textures/blocks/coral_plant_purple.png",
  "assets/minecraft/textures/block/fire_coral.png": "textures/blocks/coral_plant_red.png",
  "assets/minecraft/textures/block/horn_coral.png": "textures/blocks/coral_plant_yellow.png",
  "assets/minecraft/textures/block/dead_tube_coral.png": "textures/blocks/coral_plant_blue_dead.png",
  "assets/minecraft/textures/block/dead_brain_coral.png": "textures/blocks/coral_plant_pink_dead.png",
  "assets/minecraft/textures/block/dead_bubble_coral.png": "textures/blocks/coral_plant_purple_dead.png",
  "assets/minecraft/textures/block/dead_fire_coral.png": "textures/blocks/coral_plant_red_dead.png",
  "assets/minecraft/textures/block/dead_horn_coral.png": "textures/blocks/coral_plant_yellow_dead.png",
  "assets/minecraft/textures/block/tube_coral_fan.png": "textures/blocks/coral_fan_blue.png",
  "assets/minecraft/textures/block/brain_coral_fan.png": "textures/blocks/coral_fan_pink.png",
  "assets/minecraft/textures/block/bubble_coral_fan.png": "textures/blocks/coral_fan_purple.png",
  "assets/minecraft/textures/block/fire_coral_fan.png": "textures/blocks/coral_fan_red.png",
  "assets/minecraft/textures/block/horn_coral_fan.png": "textures/blocks/coral_fan_yellow.png",
  "assets/minecraft/textures/block/dead_tube_coral_fan.png": "textures/blocks/coral_fan_blue_dead.png",
  "assets/minecraft/textures/block/dead_brain_coral_fan.png": "textures/blocks/coral_fan_pink_dead.png",
  "assets/minecraft/textures/block/dead_bubble_coral_fan.png": "textures/blocks/coral_fan_purple_dead.png",
  "assets/minecraft/textures/block/dead_fire_coral_fan.png": "textures/blocks/coral_fan_red_dead.png",
  "assets/minecraft/textures/block/dead_horn_coral_fan.png": "textures/blocks/coral_fan_yellow_dead.png",
  "assets/minecraft/textures/block/jigsaw_top.png": "textures/blocks/jigsaw_front.png",
  "assets/minecraft/textures/block/jigsaw_bottom.png": "textures/blocks/jigsaw_back.png",
  "assets/minecraft/textures/block/cave_vines.png": "textures/blocks/cave_vines_head.png",
  "assets/minecraft/textures/block/cave_vines_lit.png": "textures/blocks/cave_vines_head_berries.png",
  "assets/minecraft/textures/block/cave_vines_plant.png": "textures/blocks/cave_vines_body.png",
  "assets/minecraft/textures/block/cave_vines_plant_lit.png": "textures/blocks/cave_vines_body_berries.png",
  "assets/minecraft/textures/block/twisting_vines.png": "textures/blocks/twisting_vines_bottom.png",
  "assets/minecraft/textures/block/twisting_vines_plant.png": "textures/blocks/twisting_vines_base.png",
  "assets/minecraft/textures/block/weeping_vines.png": "textures/blocks/weeping_vines_bottom.png",
  "assets/minecraft/textures/block/weeping_vines_plant.png": "textures/blocks/weeping_vines_base.png",

  // Destroy stages
  "assets/minecraft/textures/block/destroy_stage_0.png": "textures/environment/destroy_stage_0.png",
  "assets/minecraft/textures/block/destroy_stage_1.png": "textures/environment/destroy_stage_1.png",
  "assets/minecraft/textures/block/destroy_stage_2.png": "textures/environment/destroy_stage_2.png",
  "assets/minecraft/textures/block/destroy_stage_3.png": "textures/environment/destroy_stage_3.png",
  "assets/minecraft/textures/block/destroy_stage_4.png": "textures/environment/destroy_stage_4.png",
  "assets/minecraft/textures/block/destroy_stage_5.png": "textures/environment/destroy_stage_5.png",
  "assets/minecraft/textures/block/destroy_stage_6.png": "textures/environment/destroy_stage_6.png",
  "assets/minecraft/textures/block/destroy_stage_7.png": "textures/environment/destroy_stage_7.png",
  "assets/minecraft/textures/block/destroy_stage_8.png": "textures/environment/destroy_stage_8.png",
  "assets/minecraft/textures/block/destroy_stage_9.png": "textures/environment/destroy_stage_9.png",

  // Items
  "assets/minecraft/textures/item/bucket.png": "textures/items/bucket_empty.png",
  "assets/minecraft/textures/item/cod_bucket.png": "textures/items/bucket_cod.png",
  "assets/minecraft/textures/item/cooked_cod.png": "textures/items/fish_cooked.png",
  "assets/minecraft/textures/item/cod.png": "textures/items/fish_raw.png",
  "assets/minecraft/textures/item/salmon.png": "textures/items/fish_salmon_raw.png",
  "assets/minecraft/textures/item/cooked_salmon.png": "textures/items/fish_salmon_cooked.png",
  "assets/minecraft/textures/item/tropical_fish.png": "textures/items/fish_clownfish_raw.png",
  "assets/minecraft/textures/item/pufferfish.png": "textures/items/fish_pufferfish_raw.png",
  "assets/minecraft/textures/item/fishing_rod.png": "textures/items/fishing_rod_uncast.png",
  "assets/minecraft/textures/item/fishing_rod_cast.png": "textures/items/fishing_rod_cast.png",
  "assets/minecraft/textures/item/fire_charge.png": "textures/items/fireball.png",
  "assets/minecraft/textures/item/firework_rocket.png": "textures/items/fireworks.png",
  "assets/minecraft/textures/item/firework_star.png": "textures/items/fireworks_charge.png",
  "assets/minecraft/textures/item/minecart.png": "textures/items/minecart_normal.png",
  "assets/minecraft/textures/item/tnt_minecart.png": "textures/items/minecart_tnt.png",
  "assets/minecraft/textures/item/nether_brick.png": "textures/items/netherbrick.png",
  "assets/minecraft/textures/item/sugar_cane.png": "textures/items/reeds.png",
  "assets/minecraft/textures/item/slime_ball.png": "textures/items/slimeball.png",
  "assets/minecraft/textures/item/glistering_melon_slice.png": "textures/items/melon_speckled.png",
  "assets/minecraft/textures/item/potion.png": "textures/items/potion_bottle_drinkable.png",
  "assets/minecraft/textures/item/glass_bottle.png": "textures/items/potion_bottle_empty.png",
  "assets/minecraft/textures/item/leather_helmet.png": "textures/items/leather_helmet.png",
  "assets/minecraft/textures/item/leather_chestplate.png": "textures/items/leather_chestplate.png",
  "assets/minecraft/textures/item/leather_leggings.png": "textures/items/leather_leggings.png",
  "assets/minecraft/textures/item/leather_boots.png": "textures/items/leather_boots.png",
  "assets/minecraft/textures/item/leather_horse_armor.png": "textures/items/leather_horse_armor.png",
  "assets/minecraft/textures/item/dark_oak_sign.png": "textures/items/sign_darkoak.png",
  "assets/minecraft/textures/item/oak_sign.png": "textures/items/sign.png",
  "assets/minecraft/textures/item/dark_oak_boat.png": "textures/items/boat_darkoak.png",
  "assets/minecraft/textures/item/music_disc_5.png": "textures/items/record_5.png",
  "assets/minecraft/textures/item/music_disc_otherside.png": "textures/items/record_otherside.png",
  "assets/minecraft/textures/item/music_disc_pigstep.png": "textures/items/record_pigstep.png",
  "assets/minecraft/textures/item/turtle_scute.png": "textures/items/turtle_shell_piece.png",
  "assets/minecraft/textures/item/ink_sac.png": "textures/items/dye_powder_black_new.png",
  "assets/minecraft/textures/item/cocoa_beans.png": "textures/items/dye_powder_brown_new.png",
  "assets/minecraft/textures/item/lapis_lazuli.png": "textures/items/dye_powder_blue_new.png",
  "assets/minecraft/textures/item/bone_meal.png": "textures/items/dye_powder_white_new.png",
  "assets/minecraft/textures/item/glow_ink_sac.png": "textures/items/dye_powder_glow.png",
};

function applyTextureOverrides(content: any, isFallback = false) {
  if (!content.java_to_bedrock) content.java_to_bedrock = {};
  if (!content.bedrock_to_java) content.bedrock_to_java = {};

  for (const [javaFull, bedrockPath] of Object.entries(AUTHORITATIVE_TEXTURE_OVERRIDES)) {
    const javaKey = isFallback ? javaFull.replace(/^assets\/minecraft\//, 'assets/') : javaFull;
    content.java_to_bedrock[javaKey] = bedrockPath;
  }

  // Rebuild bedrock_to_java deterministically from java_to_bedrock so no stale/colliding
  // reverse entries remain, then apply authoritative overrides on top.
  const rebuiltB2J: Record<string, string> = {};
  for (const [javaKey, bedrockPath] of Object.entries(content.java_to_bedrock) as [string, string][]) {
    if (!rebuiltB2J[bedrockPath]) {
      rebuiltB2J[bedrockPath] = javaKey;
    }
  }
  for (const [javaFull, bedrockPath] of Object.entries(AUTHORITATIVE_TEXTURE_OVERRIDES)) {
    const javaKey = isFallback ? javaFull.replace(/^assets\/minecraft\//, 'assets/') : javaFull;
    rebuiltB2J[bedrockPath] = javaKey;
  }
  content.bedrock_to_java = rebuiltB2J;
}

async function updateMappings() {
  // 1. Fetch Geyser sound mappings
  const geyserSounds = await fetchGeyserSounds();

  const mappingsDir = path.join(__dirname, '../src/lib/pack/mappings');
  const baseMappingPath = path.join(__dirname, '../src/lib/pack/mappings.json');

  const files = await fs.readdir(mappingsDir);
  console.log(`Found ${files.length} mapping files in ${mappingsDir}`);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(mappingsDir, file);
    try {
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Parse versions from filename, e.g., "1.21.4_to_1.21.50.json"
      const parts = file.replace('.json', '').split('_to_');
      const javaVer = parts[0] || '1.21.4';
      const bedrockVer = parts[1] || '1.21.50';

      const langMap = getPrismarineLanguageMappings(javaVer, bedrockVer);

      // Apply authoritative Mojang texture overrides
      applyTextureOverrides(content, false);

      // Merge Geyser sounds and Prismarine language keys
      content.sounds_java_to_bedrock = {
        ...(content.sounds_java_to_bedrock || {}),
        ...geyserSounds.java_to_bedrock
      };
      content.sounds_bedrock_to_java = {
        ...(content.sounds_bedrock_to_java || {}),
        ...geyserSounds.bedrock_to_java
      };
      content.lang_java_to_bedrock = langMap.java_to_bedrock;
      content.lang_bedrock_to_java = langMap.bedrock_to_java;

      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      console.log(`  Updated ${file} with Geyser sounds (${Object.keys(content.sounds_java_to_bedrock).length}) and Prismarine lang (${Object.keys(content.lang_java_to_bedrock).length})`);
    } catch (e) {
      console.error(`  Failed to update ${file}:`, e);
    }
  }

  // Also update fallback mappings.json
  console.log("Updating fallback mappings.json...");
  try {
    const baseContent = JSON.parse(await fs.readFile(baseMappingPath, 'utf8'));
    const defaultLang = getPrismarineLanguageMappings('1.21.4', '1.21.50');

    // Apply authoritative Mojang texture overrides
    applyTextureOverrides(baseContent, true);

    baseContent.sounds_java_to_bedrock = {
      ...(baseContent.sounds_java_to_bedrock || {}),
      ...geyserSounds.java_to_bedrock
    };
    baseContent.sounds_bedrock_to_java = {
      ...(baseContent.sounds_bedrock_to_java || {}),
      ...geyserSounds.bedrock_to_java
    };
    baseContent.lang_java_to_bedrock = defaultLang.java_to_bedrock;
    baseContent.lang_bedrock_to_java = defaultLang.bedrock_to_java;

    await fs.writeFile(baseMappingPath, JSON.stringify(baseContent, null, 2));
    console.log("Fallback mappings.json updated successfully!");
  } catch (e) {
    console.error("Failed to update base mappings.json:", e);
  }
}

updateMappings().catch(console.error);
