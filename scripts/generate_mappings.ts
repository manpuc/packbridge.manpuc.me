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
  "assets/minecraft/textures/item/rabbit.png": "textures/items/rabbit_raw.png",
  "assets/minecraft/textures/item/cooked_porkchop.png": "textures/items/hoglin_meat_cooked.png",
  "assets/minecraft/textures/item/porkchop.png": "textures/items/hoglin_meat_raw.png",
  "assets/minecraft/textures/item/heart_of_the_sea.png": "textures/items/heartofthesea_closed.png",
  "assets/minecraft/textures/item/bell.png": "textures/items/villagebell.png",

  // 1.21.4+ Pale Garden & Resin & Creaking & Eyeblossom
  "assets/minecraft/textures/block/pale_oak_log.png": "textures/blocks/pale_oak_log_side.png",
  "assets/minecraft/textures/block/pale_oak_log_top.png": "textures/blocks/pale_oak_log_top.png",
  "assets/minecraft/textures/block/stripped_pale_oak_log.png": "textures/blocks/stripped_pale_oak_log_side.png",
  "assets/minecraft/textures/block/stripped_pale_oak_log_top.png": "textures/blocks/stripped_pale_oak_log_top.png",
  "assets/minecraft/textures/block/pale_oak_planks.png": "textures/blocks/pale_oak_planks.png",
  "assets/minecraft/textures/block/pale_oak_leaves.png": "textures/blocks/pale_oak_leaves.png",
  "assets/minecraft/textures/block/pale_oak_sapling.png": "textures/blocks/pale_oak_sapling.png",
  "assets/minecraft/textures/block/pale_oak_door_bottom.png": "textures/blocks/pale_oak_door_bottom.png",
  "assets/minecraft/textures/block/pale_oak_door_top.png": "textures/blocks/pale_oak_door_top.png",
  "assets/minecraft/textures/block/pale_oak_trapdoor.png": "textures/blocks/pale_oak_trapdoor.png",
  "assets/minecraft/textures/block/pale_moss_block.png": "textures/blocks/pale_moss_block.png",
  "assets/minecraft/textures/block/pale_moss_carpet.png": "textures/blocks/pale_moss.png",
  "assets/minecraft/textures/block/pale_moss_carpet_side_small.png": "textures/blocks/pale_moss_carpet_side_tip.png",
  "assets/minecraft/textures/block/pale_moss_carpet_side_tall.png": "textures/blocks/pale_moss_carpet_side_base.png",
  "assets/minecraft/textures/block/pale_hanging_moss.png": "textures/blocks/pale_hanging_moss_middle.png",
  "assets/minecraft/textures/block/pale_hanging_moss_tip.png": "textures/blocks/pale_hanging_moss_tip.png",
  "assets/minecraft/textures/block/open_eyeblossom.png": "textures/blocks/eyeblossom_blooming.png",
  "assets/minecraft/textures/block/closed_eyeblossom.png": "textures/blocks/eyeblossom_dormant.png",
  "assets/minecraft/textures/block/open_eyeblossom_emissive.png": "textures/blocks/eyeblossom_eyes_blooming.png",
  "assets/minecraft/textures/block/creaking_heart_awake.png": "textures/blocks/creaking_heart_side_active.png",
  "assets/minecraft/textures/block/creaking_heart_dormant.png": "textures/blocks/creaking_heart_side_dormant.png",
  "assets/minecraft/textures/block/creaking_heart.png": "textures/blocks/creaking_heart_side_inactive.png",
  "assets/minecraft/textures/block/creaking_heart_top_awake.png": "textures/blocks/creaking_heart_top_active.png",
  "assets/minecraft/textures/block/creaking_heart_top_dormant.png": "textures/blocks/creaking_heart_top_dormant.png",
  "assets/minecraft/textures/block/creaking_heart_top.png": "textures/blocks/creaking_heart_top_inactive.png",
  "assets/minecraft/textures/block/resin_block.png": "textures/blocks/resin_block.png",
  "assets/minecraft/textures/block/resin_bricks.png": "textures/blocks/resin_bricks.png",
  "assets/minecraft/textures/block/chiseled_resin_bricks.png": "textures/blocks/chiseled_resin_bricks.png",
  "assets/minecraft/textures/block/resin_clump.png": "textures/blocks/resin_clump.png",
  "assets/minecraft/textures/item/resin_brick.png": "textures/items/resin_brick.png",
  "assets/minecraft/textures/item/resin_clump.png": "textures/items/resin_clump.png",
  "assets/minecraft/textures/item/pale_oak_boat.png": "textures/items/pale_oak_boat.png",
  "assets/minecraft/textures/item/pale_oak_chest_boat.png": "textures/items/pale_oak_chest_boat.png",
  "assets/minecraft/textures/item/pale_oak_door.png": "textures/items/pale_oak_door.png",
  "assets/minecraft/textures/item/pale_oak_sign.png": "textures/items/pale_oak_sign.png",
  "assets/minecraft/textures/item/pale_oak_hanging_sign.png": "textures/items/pale_oak_hanging_sign.png",

  // 1.21.5+ Spring Drop (Bush, Firefly Bush, Wildflowers, Leaf Litter, Cactus Flower, Dry Grass)
  "assets/minecraft/textures/block/bush.png": "textures/blocks/bush.png",
  "assets/minecraft/textures/block/firefly_bush.png": "textures/blocks/firefly_bush.png",
  "assets/minecraft/textures/block/firefly_bush_emissive.png": "textures/blocks/firefly_bush_firefly.png",
  "assets/minecraft/textures/block/cactus_flower.png": "textures/blocks/cactus_flower.png",
  "assets/minecraft/textures/block/leaf_litter.png": "textures/blocks/leaf_litter.png",
  "assets/minecraft/textures/block/short_dry_grass.png": "textures/blocks/short_dry_grass.png",
  "assets/minecraft/textures/block/tall_dry_grass.png": "textures/blocks/tall_dry_grass.png",
  "assets/minecraft/textures/block/wildflowers.png": "textures/blocks/wildflowers.png",
  "assets/minecraft/textures/block/wildflowers_stem.png": "textures/blocks/wildflowers_stem.png",

  // Decorated Pot & Conduit
  "assets/minecraft/textures/entity/decorated_pot/decorated_pot_base.png": "textures/blocks/decorated_pot_base.png",
  "assets/minecraft/textures/entity/decorated_pot/decorated_pot_side.png": "textures/blocks/decorated_pot_side.png",
  "assets/minecraft/textures/entity/conduit/base.png": "textures/blocks/conduit_base.png",
  "assets/minecraft/textures/entity/conduit/cage.png": "textures/blocks/conduit_cage.png",
  "assets/minecraft/textures/entity/conduit/closed_eye.png": "textures/blocks/conduit_closed.png",
  "assets/minecraft/textures/entity/conduit/open_eye.png": "textures/blocks/conduit_open.png",
  "assets/minecraft/textures/entity/conduit/wind.png": "textures/blocks/conduit_wind_horizontal.png",
  "assets/minecraft/textures/entity/conduit/wind_vertical.png": "textures/blocks/conduit_wind_vertical.png",

  // Entities & Armor & Environment
  "assets/minecraft/textures/entity/creeper/creeper.png": "textures/entity/creeper/creeper.png",
  "assets/minecraft/textures/entity/creeper/creeper_armor.png": "textures/entity/creeper/creeper_charged.png",
  "assets/minecraft/textures/entity/creaking/creaking.png": "textures/entity/creaking/creaking.png",
  "assets/minecraft/textures/entity/creaking/creaking_eyes.png": "textures/entity/creaking/creaking_eyes.png",
  "assets/minecraft/textures/entity/end_crystal/end_crystal.png": "textures/entity/endercrystal/endercrystal.png",
  "assets/minecraft/textures/entity/end_crystal/end_crystal_beam.png": "textures/entity/endercrystal/endercrystal_beam.png",
  "assets/minecraft/textures/entity/turtle/big_sea_turtle.png": "textures/entity/sea_turtle.png",
  "assets/minecraft/textures/entity/snow_golem.png": "textures/entity/snow_golem.png",
  "assets/minecraft/textures/entity/wandering_trader.png": "textures/entity/wandering_trader.png",
  "assets/minecraft/textures/entity/piglin/zombified_piglin.png": "textures/entity/pig/pigzombie.png",
  "assets/minecraft/textures/entity/iron_golem/iron_golem.png": "textures/entity/iron_golem.png",
  "assets/minecraft/textures/entity/iron_golem/iron_golem_crackiness_high.png": "textures/entity/iron_golem/cracked_high.png",
  "assets/minecraft/textures/entity/iron_golem/iron_golem_crackiness_medium.png": "textures/entity/iron_golem/cracked_medium.png",
  "assets/minecraft/textures/entity/iron_golem/iron_golem_crackiness_low.png": "textures/entity/iron_golem/cracked_low.png",
  "assets/minecraft/textures/entity/cat/all_black.png": "textures/entity/cat/allblackcat.png",
  "assets/minecraft/textures/entity/cat/black.png": "textures/entity/cat/tuxedo.png",
  "assets/minecraft/textures/entity/cat/british_shorthair.png": "textures/entity/cat/britishshorthair.png",
  "assets/minecraft/textures/entity/cat/calico.png": "textures/entity/cat/calico.png",
  "assets/minecraft/textures/entity/cat/jellie.png": "textures/entity/cat/jellie.png",
  "assets/minecraft/textures/entity/cat/persian.png": "textures/entity/cat/persian.png",
  "assets/minecraft/textures/entity/cat/ragdoll.png": "textures/entity/cat/ragdoll.png",
  "assets/minecraft/textures/entity/cat/red.png": "textures/entity/cat/redtabby.png",
  "assets/minecraft/textures/entity/cat/siamese.png": "textures/entity/cat/siamesecat.png",
  "assets/minecraft/textures/entity/cat/tabby.png": "textures/entity/cat/tabby.png",
  "assets/minecraft/textures/entity/cat/white.png": "textures/entity/cat/white.png",
  "assets/minecraft/textures/entity/cat/cat_collar.png": "textures/entity/cat/white_tame.png",
  "assets/minecraft/textures/entity/wolf/wolf_collar.png": "textures/entity/wolf/wolf_tame.png",
  "assets/minecraft/textures/entity/wolf/wolf_armor.png": "textures/entity/wolf/wolf_armor.png",
  "assets/minecraft/textures/entity/wolf/wolf_armor_overlay.png": "textures/entity/wolf/wolf_armor_dyed.png",
  "assets/minecraft/textures/entity/wolf/wolf_armor_crackiness_high.png": "textures/entity/wolf/wolf_armor_cracked_high.png",
  "assets/minecraft/textures/entity/wolf/wolf_armor_crackiness_medium.png": "textures/entity/wolf/wolf_armor_cracked_medium.png",
  "assets/minecraft/textures/entity/wolf/wolf_armor_crackiness_low.png": "textures/entity/wolf/wolf_armor_cracked_low.png",
  "assets/minecraft/textures/entity/signs/oak.png": "textures/entity/sign.png",
  "assets/minecraft/textures/entity/signs/spruce.png": "textures/entity/sign_spruce.png",
  "assets/minecraft/textures/entity/signs/birch.png": "textures/entity/sign_birch.png",
  "assets/minecraft/textures/entity/signs/jungle.png": "textures/entity/sign_jungle.png",
  "assets/minecraft/textures/entity/signs/acacia.png": "textures/entity/sign_acacia.png",
  "assets/minecraft/textures/entity/signs/dark_oak.png": "textures/entity/sign_darkoak.png",
  "assets/minecraft/textures/entity/signs/crimson.png": "textures/entity/sign_crimson.png",
  "assets/minecraft/textures/entity/signs/warped.png": "textures/entity/sign_warped.png",
  "assets/minecraft/textures/entity/signs/mangrove.png": "textures/entity/mangrove_sign.png",
  "assets/minecraft/textures/entity/signs/cherry.png": "textures/entity/cherry_sign.png",
  "assets/minecraft/textures/entity/signs/bamboo.png": "textures/entity/bamboo_sign.png",
  "assets/minecraft/textures/entity/signs/pale_oak.png": "textures/entity/pale_oak_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/oak.png": "textures/entity/oak_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/spruce.png": "textures/entity/spruce_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/birch.png": "textures/entity/birch_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/jungle.png": "textures/entity/jungle_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/acacia.png": "textures/entity/acacia_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/dark_oak.png": "textures/entity/dark_oak_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/crimson.png": "textures/entity/crimson_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/warped.png": "textures/entity/warped_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/mangrove.png": "textures/entity/mangrove_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/cherry.png": "textures/entity/cherry_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/bamboo.png": "textures/entity/bamboo_hanging_sign.png",
  "assets/minecraft/textures/entity/signs/hanging/pale_oak.png": "textures/entity/pale_oak_hanging_sign.png",
  "assets/minecraft/textures/entity/boat/oak.png": "textures/entity/boat/boat_oak.png",
  "assets/minecraft/textures/entity/boat/spruce.png": "textures/entity/boat/boat_spruce.png",
  "assets/minecraft/textures/entity/boat/birch.png": "textures/entity/boat/boat_birch.png",
  "assets/minecraft/textures/entity/boat/jungle.png": "textures/entity/boat/boat_jungle.png",
  "assets/minecraft/textures/entity/boat/acacia.png": "textures/entity/boat/boat_acacia.png",
  "assets/minecraft/textures/entity/boat/dark_oak.png": "textures/entity/boat/boat_darkoak.png",
  "assets/minecraft/textures/entity/boat/mangrove.png": "textures/entity/boat/mangrove_boat.png",
  "assets/minecraft/textures/entity/boat/cherry.png": "textures/entity/boat/cherry_boat.png",
  "assets/minecraft/textures/entity/boat/bamboo.png": "textures/entity/boat/bamboo_raft.png",
  "assets/minecraft/textures/entity/boat/pale_oak.png": "textures/entity/boat/pale_oak_boat.png",
  "assets/minecraft/textures/entity/chest_boat/oak.png": "textures/entity/boat/chest_boat_oak.png",
  "assets/minecraft/textures/entity/chest_boat/spruce.png": "textures/entity/boat/chest_boat_spruce.png",
  "assets/minecraft/textures/entity/chest_boat/birch.png": "textures/entity/boat/chest_boat_birch.png",
  "assets/minecraft/textures/entity/chest_boat/jungle.png": "textures/entity/boat/chest_boat_jungle.png",
  "assets/minecraft/textures/entity/chest_boat/acacia.png": "textures/entity/boat/chest_boat_acacia.png",
  "assets/minecraft/textures/entity/chest_boat/dark_oak.png": "textures/entity/boat/chest_boat_darkoak.png",
  "assets/minecraft/textures/entity/chest_boat/mangrove.png": "textures/entity/boat/chest_boat_mangrove.png",
  "assets/minecraft/textures/entity/chest_boat/cherry.png": "textures/entity/boat/chest_boat_cherry.png",
  "assets/minecraft/textures/entity/chest_boat/bamboo.png": "textures/entity/boat/chest_boat_bamboo.png",
  "assets/minecraft/textures/entity/chest_boat/pale_oak.png": "textures/entity/boat/chest_boat_pale_oak.png",
  "assets/minecraft/textures/entity/bed/light_gray.png": "textures/entity/bed/silver.png",
  "assets/minecraft/textures/entity/shulker/shulker_light_gray.png": "textures/entity/shulker/shulker_silver.png",
  "assets/minecraft/textures/entity/shulker/shulker.png": "textures/entity/shulker/shulker_undyed.png",
  "assets/minecraft/textures/entity/llama/decor/light_gray.png": "textures/entity/llama/decor/decor_silver.png",
  "assets/minecraft/textures/entity/llama/decor/trader_llama.png": "textures/entity/llama/decor/trader_llama_decor.png",
  "assets/minecraft/textures/models/armor/chainmail_layer_1.png": "textures/models/armor/chain_1.png",
  "assets/minecraft/textures/models/armor/chainmail_layer_2.png": "textures/models/armor/chain_2.png",
  "assets/minecraft/textures/models/armor/diamond_layer_1.png": "textures/models/armor/diamond_1.png",
  "assets/minecraft/textures/models/armor/diamond_layer_2.png": "textures/models/armor/diamond_2.png",
  "assets/minecraft/textures/models/armor/gold_layer_1.png": "textures/models/armor/gold_1.png",
  "assets/minecraft/textures/models/armor/gold_layer_2.png": "textures/models/armor/gold_2.png",
  "assets/minecraft/textures/models/armor/iron_layer_1.png": "textures/models/armor/iron_1.png",
  "assets/minecraft/textures/models/armor/iron_layer_2.png": "textures/models/armor/iron_2.png",
  "assets/minecraft/textures/models/armor/leather_layer_1.png": "textures/models/armor/leather_1.png",
  "assets/minecraft/textures/models/armor/leather_layer_2.png": "textures/models/armor/leather_2.png",
  "assets/minecraft/textures/models/armor/netherite_layer_1.png": "textures/models/armor/netherite_1.png",
  "assets/minecraft/textures/models/armor/netherite_layer_2.png": "textures/models/armor/netherite_2.png",
  "assets/minecraft/textures/models/armor/turtle_layer_1.png": "textures/models/armor/turtle_1.png",
  "assets/minecraft/textures/entity/elytra.png": "textures/models/armor/elytra.png",
  "assets/minecraft/textures/colormap/foliage.png": "textures/colormap/foliage.png",
  "assets/minecraft/textures/colormap/grass.png": "textures/colormap/grass.png",
  "assets/minecraft/textures/colormap/dry_foliage.png": "textures/colormap/dry_foliage.png",
  "assets/minecraft/textures/environment/end_sky.png": "textures/environment/end_sky.png",
  "assets/minecraft/textures/environment/moon_phases.png": "textures/environment/moon_phases.png",
  "assets/minecraft/textures/environment/sun.png": "textures/environment/sun.png",
  "assets/minecraft/textures/environment/rain.png": "textures/environment/weather.png",
  "assets/minecraft/textures/misc/pumpkinblur.png": "textures/misc/pumpkinblur.png",
};

// Many-to-one Bedrock -> Java aliases (preserved across `pnpm run update-mappings` without clobbering java_to_bedrock)
const AUTHORITATIVE_B2J_ONLY_OVERRIDES: Record<string, string> = {
  "textures/blocks/leaves_oak.png": "assets/minecraft/textures/block/oak_leaves.png",
  "textures/blocks/leaves_spruce.png": "assets/minecraft/textures/block/spruce_leaves.png",
  "textures/blocks/leaves_birch.png": "assets/minecraft/textures/block/birch_leaves.png",
  "textures/blocks/leaves_jungle.png": "assets/minecraft/textures/block/jungle_leaves.png",
  "textures/blocks/leaves_acacia.png": "assets/minecraft/textures/block/acacia_leaves.png",
  "textures/blocks/leaves_big_oak.png": "assets/minecraft/textures/block/dark_oak_leaves.png",
  "textures/blocks/azalea_leaves_opaque.png": "assets/minecraft/textures/block/azalea_leaves.png",
  "textures/blocks/azalea_leaves_flowers.png": "assets/minecraft/textures/block/flowering_azalea_leaves.png",
  "textures/blocks/cherry_leaves_opaque.png": "assets/minecraft/textures/block/cherry_leaves.png",
  "textures/blocks/pale_oak_leaves_opaque.png": "assets/minecraft/textures/block/pale_oak_leaves.png",
  "textures/blocks/grass_side.png": "assets/minecraft/textures/block/grass_block_side.png",
  "textures/blocks/grass_block_snow.png": "assets/minecraft/textures/block/grass_block_snow.png",
  "textures/blocks/grass_carried.png": "assets/minecraft/textures/block/grass_block_top.png",
  "textures/blocks/seagrass_doubletall_bottom_a.png": "assets/minecraft/textures/block/tall_seagrass_bottom.png",
  "textures/blocks/seagrass_doubletall_bottom_b.png": "assets/minecraft/textures/block/tall_seagrass_bottom.png",
  "textures/blocks/seagrass_doubletall_top_a.png": "assets/minecraft/textures/block/tall_seagrass_top.png",
  "textures/blocks/seagrass_doubletall_top_b.png": "assets/minecraft/textures/block/tall_seagrass_top.png",
  "textures/blocks/kelp_a.png": "assets/minecraft/textures/block/kelp_plant.png",
  "textures/blocks/kelp_b.png": "assets/minecraft/textures/block/kelp_plant.png",
  "textures/blocks/kelp_c.png": "assets/minecraft/textures/block/kelp_plant.png",
  "textures/blocks/kelp_d.png": "assets/minecraft/textures/block/kelp_plant.png",
  "textures/blocks/kelp_top.png": "assets/minecraft/textures/block/kelp.png",
  "textures/blocks/kelp_top_bulb.png": "assets/minecraft/textures/block/kelp.png",
  "textures/blocks/bamboo_leaf.png": "assets/minecraft/textures/block/bamboo_large_leaves.png",
  "textures/blocks/bamboo_sapling.png": "assets/minecraft/textures/block/bamboo_stage0.png",
  "textures/blocks/trip_wire.png": "assets/minecraft/textures/block/tripwire.png",
  "textures/blocks/trip_wire_source.png": "assets/minecraft/textures/block/tripwire_hook.png",
  "textures/blocks/redstone_dust_cross.png": "assets/minecraft/textures/block/redstone_dust_dot.png",
  "textures/blocks/warped_door_lower.png": "assets/minecraft/textures/block/warped_door_bottom.png",
  "textures/blocks/warped_door_top.png": "assets/minecraft/textures/block/warped_door_top.png",
  "textures/blocks/crimson_door_lower.png": "assets/minecraft/textures/block/crimson_door_bottom.png",
  "textures/blocks/crimson_door_top.png": "assets/minecraft/textures/block/crimson_door_top.png",
  "textures/entity/piglin/zombie_piglin.png": "assets/minecraft/textures/entity/piglin/zombified_piglin.png",
  "textures/entity/bat_v2.png": "assets/minecraft/textures/entity/bat.png",
  "textures/entity/cat/siamese.png": "assets/minecraft/textures/entity/cat/siamese.png",
  "textures/entity/cat/blackcat.png": "assets/minecraft/textures/entity/cat/all_black.png",
  "textures/entity/zombie_villager2/zombie-villager.png": "assets/minecraft/textures/entity/zombie_villager/zombie_villager.png",
  "textures/items/boat_dark_oak.png": "assets/minecraft/textures/item/dark_oak_boat.png",
  "textures/items/boat.png": "assets/minecraft/textures/item/oak_boat.png",
};

function applyTextureOverrides(content: any, isFallback = false) {
  if (!content.java_to_bedrock) content.java_to_bedrock = {};
  if (!content.bedrock_to_java) content.bedrock_to_java = {};

  delete content.java_to_bedrock['assets/minecraft/textures/block/grass_block_side_overlay.png'];
  delete content.java_to_bedrock['assets/minecraft/textures/blocks/grass_side_overlay.png'];
  delete content.java_to_bedrock['assets/textures/block/grass_block_side_overlay.png'];
  delete content.java_to_bedrock['assets/textures/blocks/grass_side_overlay.png'];
  delete content.java_to_bedrock['assets/minecraft/textures/block/conduit.png'];
  delete content.java_to_bedrock['assets/textures/block/conduit.png'];

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
  for (const [bedrockPath, javaFull] of Object.entries(AUTHORITATIVE_B2J_ONLY_OVERRIDES)) {
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
