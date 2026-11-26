/**
 * Bidirectional 3D Custom Model & Entity Geometry Converter
 * - Java Edition Block/Item JSON models (`assets/minecraft/models/block|item/*.json`)
 *   and OptiFine CEM / Entity Model Features (`assets/minecraft/optifine/cem/*.jem|.jpm`, `assets/minecraft/mcpatcher/cem/*.jem|.jpm`)
 * - Bedrock Edition Geometry (`models/entity/*.geo.json`, `models/blocks/*.geo.json`, `models/*.json` across format_version 1.8.0 - 1.21.0+)
 */

import { parseJsonc } from './sounds';
import { isUnsafeObjectKey } from '../security';
import { compareBedrockVersion, type BedrockSemver } from './gui';

const VALID_FACES = ['north', 'east', 'south', 'west', 'up', 'down'] as const;
type FaceName = (typeof VALID_FACES)[number];

const MAX_MODEL_DEPTH = 32;
const MAX_CUBES_PER_MODEL = 4096;
const MAX_GEOMETRIES_PER_FILE = 256;

type Vec3 = [number, number, number];

interface JavaElementRotation {
  origin: Vec3;
  axis: 'x' | 'y' | 'z';
  angle: number;
  rescale?: boolean;
}

interface JavaFace {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: string;
  rotation?: number;
  tintindex?: number;
}

interface JavaElement {
  from: Vec3;
  to: Vec3;
  rotation?: JavaElementRotation;
  shade?: boolean;
  faces?: Partial<Record<FaceName, JavaFace>>;
}

interface JavaModel {
  parent?: string;
  ambientocclusion?: boolean;
  texture_size?: [number, number];
  textures?: Record<string, string>;
  elements?: JavaElement[];
}

export interface JavaToBedrockOptions {
  targetBedrockMinEngine?: BedrockSemver;
  resolveParent?: (parentRef: string) => string | null;
  resolveJpm?: (jpmRef: string) => string | null;
}

export interface JavaToBedrockResult {
  content: string;
  warning?: string;
}

export interface ExtractedBedrockGeometry {
  identifier: string;
  baseIdentifier: string;
  parentIdentifier?: string;
  textureWidth: number;
  textureHeight: number;
  bones: any[];
  versionRank: number;
}

export interface BedrockToJavaOutput {
  outputPath: string;
  content: string;
  warning?: string;
}

export interface BedrockToJavaOptions {
  targetPackFormat?: number;
  externalGeometries?: Map<string, ExtractedBedrockGeometry>;
}

function round4(n: number): number {
  if (!Number.isFinite(n) || Math.abs(n) < 1e-9) return 0;
  const r = Math.round(n * 10000) / 10000;
  return Math.abs(r) < 1e-9 ? 0 : r;
}

function toFinite(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toVec3(v: unknown, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!Array.isArray(v) || v.length < 3) return [...fallback];
  return [toFinite(v[0], fallback[0]), toFinite(v[1], fallback[1]), toFinite(v[2], fallback[2])];
}

function isNonZeroVec3(v: Vec3): boolean {
  return Math.abs(v[0]) > 1e-4 || Math.abs(v[1]) > 1e-4 || Math.abs(v[2]) > 1e-4;
}

function sanitizeIdentifierSegment(s: string): string {
  const clean = s.replace(/[^a-zA-Z0-9_]/g, '_');
  return clean || 'custom';
}

function sanitizeRelativeModelPath(rel: string): string {
  return rel
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..' && !isUnsafeObjectKey(seg))
    .map((seg) => seg.toLowerCase().replace(/[^a-z0-9_.-]/g, '_'))
    .join('/');
}

const BEDROCK_TO_CEM_BONE: Record<string, string> = {
  rightArm: 'right_arm',
  leftArm: 'left_arm',
  rightLeg: 'right_leg',
  leftLeg: 'left_leg',
  rightItem: 'right_item',
  leftItem: 'left_item',
  rightWing: 'right_wing',
  leftWing: 'left_wing',
  rightEar: 'right_ear',
  leftEar: 'left_ear',
  rightSleeve: 'right_sleeve',
  leftSleeve: 'left_sleeve',
  rightPants: 'right_pants',
  leftPants: 'left_pants',
  frontLeftLeg: 'front_left_leg',
  frontRightLeg: 'front_right_leg',
  backLeftLeg: 'back_left_leg',
  backRightLeg: 'back_right_leg',
};

const CEM_TO_BEDROCK_BONE: Record<string, string> = Object.fromEntries(
  Object.entries(BEDROCK_TO_CEM_BONE).map(([b, c]) => [c, b])
);

function mapBedrockBoneToCemPart(name: string): string {
  if (Object.hasOwn(BEDROCK_TO_CEM_BONE, name)) {
    return BEDROCK_TO_CEM_BONE[name];
  }
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function mapCemPartToBedrockBone(name: string): string {
  if (Object.hasOwn(CEM_TO_BEDROCK_BONE, name)) {
    return CEM_TO_BEDROCK_BONE[name];
  }
  return name;
}

function resolveEntityAlias(rawName: string, targetPackFormat: number): string {
  const aliases: Record<string, string> = {
    villager_v2: 'villager',
    zombie_villager_v2: 'zombie_villager',
    horse_v2: 'horse',
    horse_v3: 'horse',
    evocation_illager: 'evoker',
    lavaslime: 'magma_cube',
    irongolem: 'iron_golem',
    snowgolem: 'snow_golem',
    polarbear: 'polar_bear',
    witherboss: 'wither',
    dragon: 'ender_dragon',
  };
  if (rawName === 'pigzombie') {
    return targetPackFormat <= 5 ? 'zombie_pigman' : 'zombified_piglin';
  }
  return Object.hasOwn(aliases, rawName) ? aliases[rawName] : rawName;
}

function parseVersionRank(identifier: string): number {
  const m = identifier.match(/\.v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 10000 + (Number(m[2]) || 0) * 100 + (Number(m[3]) || 0);
}

function normalizeBoxBounds(rawCoords: number[]): { origin: Vec3; size: Vec3 } {
  const x = toFinite(rawCoords[0]);
  const y = toFinite(rawCoords[1]);
  const z = toFinite(rawCoords[2]);
  const w = toFinite(rawCoords[3]);
  const h = toFinite(rawCoords[4]);
  const d = toFinite(rawCoords[5]);
  return {
    origin: [w < 0 ? x + w : x, h < 0 ? y + h : y, d < 0 ? z + d : z],
    size: [Math.abs(w), Math.abs(h), Math.abs(d)],
  };
}

function computeVisibleBounds(aabbs: Array<{ min: Vec3; max: Vec3 }>): {
  visible_bounds_width: number;
  visible_bounds_height: number;
  visible_bounds_offset: Vec3;
} {
  if (aabbs.length === 0) {
    return {
      visible_bounds_width: 2,
      visible_bounds_height: 2,
      visible_bounds_offset: [0, 0.5, 0],
    };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const box of aabbs) {
    if (box.min[0] < minX) minX = box.min[0];
    if (box.min[1] < minY) minY = box.min[1];
    if (box.min[2] < minZ) minZ = box.min[2];
    if (box.max[0] > maxX) maxX = box.max[0];
    if (box.max[1] > maxY) maxY = box.max[1];
    if (box.max[2] > maxZ) maxZ = box.max[2];
  }
  const widthBlocks = Math.max(1, Math.ceil(Math.max(maxX - minX, maxZ - minZ) / 16));
  const heightBlocks = Math.max(1, Math.ceil((maxY - minY) / 16));
  const centerYBlocks = round4((minY + maxY) / 32);
  return {
    visible_bounds_width: widthBlocks,
    visible_bounds_height: heightBlocks,
    visible_bounds_offset: [0, centerYBlocks, 0],
  };
}

function resolveJavaTextureVar(
  rawTex: string,
  textures: Record<string, string> | undefined
): string {
  let current = rawTex.trim();
  const visited = new Set<string>();
  let depth = 0;
  while (current.startsWith('#') && textures && depth < MAX_MODEL_DEPTH) {
    const key = current.slice(1);
    if (!key || isUnsafeObjectKey(key) || visited.has(key) || !Object.hasOwn(textures, key)) {
      break;
    }
    visited.add(key);
    const next = textures[key];
    if (typeof next !== 'string' || !next.trim()) break;
    current = next.trim();
    depth++;
  }
  return current;
}

function convertCemToBedrock(
  data: any,
  modelIdentifier: string,
  options?: JavaToBedrockOptions
): JavaToBedrockResult | null {
  const textureSize = Array.isArray(data.textureSize) ? data.textureSize : [64, 64];
  const texW = Math.max(1, toFinite(textureSize[0], 64));
  const texH = Math.max(1, toFinite(textureSize[1], 64));

  const warnings = new Set<string>();
  if (Array.isArray(data.animations) && data.animations.length > 0) {
    warnings.add('CEM animations cannot be converted statically');
  }

  const bones: any[] = [];
  const usedBoneNames = new Set<string>();
  const allAabbs: Array<{ min: Vec3; max: Vec3 }> = [];
  let cubeCount = 0;

  const allocBoneName = (raw: string): string => {
    const base = sanitizeIdentifierSegment(raw);
    if (!usedBoneNames.has(base)) {
      usedBoneNames.add(base);
      return base;
    }
    let idx = 2;
    while (usedBoneNames.has(`${base}_${idx}`)) idx++;
    const unique = `${base}_${idx}`;
    usedBoneNames.add(unique);
    return unique;
  };

  const mergeJpmIntoNode = (node: any, visitedJpm: Set<string>, depth: number): any => {
    if (typeof node.model !== 'string' || !options?.resolveJpm || depth >= MAX_MODEL_DEPTH) {
      return node;
    }
    const jpmKey = node.model.trim();
    if (!jpmKey || visitedJpm.has(jpmKey)) return node;
    const jpmRaw = options.resolveJpm(jpmKey);
    if (!jpmRaw) return node;
    try {
      const jpmData = parseJsonc(jpmRaw) as any;
      if (!jpmData || typeof jpmData !== 'object') return node;
      const nextVisited = new Set(visitedJpm);
      nextVisited.add(jpmKey);
      const mergedJpm = mergeJpmIntoNode(jpmData, nextVisited, depth + 1);
      return {
        ...mergedJpm,
        ...node,
        boxes: Array.isArray(node.boxes) ? node.boxes : mergedJpm.boxes,
        submodels: Array.isArray(node.submodels) ? node.submodels : mergedJpm.submodels,
        submodel: node.submodel ?? mergedJpm.submodel,
        invertAxis: node.invertAxis ?? mergedJpm.invertAxis,
        translate: node.translate ?? mergedJpm.translate,
        rotate: node.rotate ?? mergedJpm.rotate,
        mirrorTexture: node.mirrorTexture ?? mergedJpm.mirrorTexture,
      };
    } catch {
      warnings.add('Failed to parse referenced CEM part (.jpm)');
      return node;
    }
  };

  const walkNode = (
    rawNode: any,
    idx: number,
    isRoot: boolean,
    parentPivot: Vec3,
    parentBoneName: string | null,
    depth: number
  ) => {
    if (!rawNode || typeof rawNode !== 'object' || depth > MAX_MODEL_DEPTH) return;
    const node = mergeJpmIntoNode(rawNode, new Set<string>(), depth);

    if (Array.isArray(node.animations) && node.animations.length > 0) {
      warnings.add('CEM animations cannot be converted statically');
    }

    const rawName = isRoot
      ? mapCemPartToBedrockBone(String(node.part || node.id || `bone_${idx}`))
      : String(node.id || node.part || `sub_${idx}`);
    const boneName = allocBoneName(rawName);

    const invStr = String(node.invertAxis ?? '').toLowerCase();
    const invX = invStr.includes('x');
    const invY = invStr.includes('y');
    const invZ = invStr.includes('z');

    const rawT = toVec3(node.translate);
    const tx = invX ? -rawT[0] : rawT[0];
    const ty = invY ? -rawT[1] : rawT[1];
    const tz = invZ ? -rawT[2] : rawT[2];

    const pivot: Vec3 = isRoot
      ? [round4(-tx), round4(ty), round4(-tz)]
      : [round4(parentPivot[0] + tx), round4(parentPivot[1] - ty), round4(parentPivot[2] + tz)];

    const bone: any = {
      name: boneName,
      pivot,
    };
    if (!isRoot && parentBoneName) {
      bone.parent = parentBoneName;
    }

    if (Array.isArray(node.rotate) && node.rotate.length >= 3) {
      const r = toVec3(node.rotate);
      const rot: Vec3 = [
        round4(invX ? -r[0] : r[0]),
        round4(invY ? -r[1] : r[1]),
        round4(invZ ? -r[2] : r[2]),
      ];
      if (isNonZeroVec3(rot)) {
        bone.rotation = rot;
      }
    }

    const mirrorU = typeof node.mirrorTexture === 'string' && node.mirrorTexture.toLowerCase().includes('u');
    if (mirrorU) {
      bone.mirror = true;
    }

    const cubes: any[] = [];
    if (Array.isArray(node.boxes)) {
      for (const b of node.boxes) {
        if (cubeCount >= MAX_CUBES_PER_MODEL) break;
        if (!b || !Array.isArray(b.coordinates) || b.coordinates.length < 6) continue;
        cubeCount++;

        const { origin: boxMin, size } = normalizeBoxBounds(b.coordinates);
        const [x, y, z] = boxMin;
        const [w, h, d] = size;

        const jx = invX ? -x - w : x;
        const jy = invY ? -y - h : y;
        const jz = invZ ? -z - d : z;

        const origin: Vec3 = [
          round4(pivot[0] + jx),
          round4(pivot[1] - jy - h),
          round4(pivot[2] + jz),
        ];

        const cube: any = {
          origin,
          size: [round4(w), round4(h), round4(d)],
        };

        allAabbs.push({
          min: origin,
          max: [origin[0] + size[0], origin[1] + size[1], origin[2] + size[2]],
        });

        const sizeAdd =
          typeof b.sizeAdd === 'number' && Number.isFinite(b.sizeAdd)
            ? b.sizeAdd
            : b.coordinates.length >= 7 && Number.isFinite(Number(b.coordinates[6]))
            ? Number(b.coordinates[6])
            : 0;
        if (sizeAdd !== 0) {
          cube.inflate = round4(sizeAdd);
        }

        // Per-face CEM UVs take precedence over box textureOffset
        const faceKeyPairs: Array<[FaceName, string, string?]> = [
          ['north', 'uvNorth', 'uvFront'],
          ['south', 'uvSouth', 'uvBack'],
          ['east', 'uvEast', 'uvRight'],
          ['west', 'uvWest', 'uvLeft'],
          ['up', 'uvUp'],
          ['down', 'uvDown'],
        ];
        const perFaceUv: Record<string, any> = Object.create(null);
        let hasPerFace = false;
        for (const [faceName, primaryKey, aliasKey] of faceKeyPairs) {
          const rawFace = Array.isArray(b[primaryKey])
            ? b[primaryKey]
            : aliasKey && Array.isArray(b[aliasKey])
            ? b[aliasKey]
            : null;
          if (rawFace && rawFace.length >= 4) {
            hasPerFace = true;
            const u1 = toFinite(rawFace[0]);
            const v1 = toFinite(rawFace[1]);
            const u2 = toFinite(rawFace[2]);
            const v2 = toFinite(rawFace[3]);
            if (faceName === 'up' || faceName === 'down') {
              perFaceUv[faceName] = {
                uv: [round4(u2), round4(v2)],
                uv_size: [round4(u1 - u2), round4(v1 - v2)],
              };
            } else {
              perFaceUv[faceName] = {
                uv: [round4(u1), round4(v1)],
                uv_size: [round4(u2 - u1), round4(v2 - v1)],
              };
            }
          }
        }
        if (hasPerFace) {
          cube.uv = perFaceUv;
        } else if (Array.isArray(b.textureOffset) && b.textureOffset.length >= 2) {
          cube.uv = [round4(toFinite(b.textureOffset[0])), round4(toFinite(b.textureOffset[1]))];
        }

        cubes.push(cube);
      }
    }

    if (cubes.length > 0) bone.cubes = cubes;
    bones.push(bone);

    if (Array.isArray(node.submodels)) {
      node.submodels.forEach((sub: any, sIdx: number) =>
        walkNode(sub, sIdx, false, pivot, boneName, depth + 1)
      );
    }
    if (node.submodel && typeof node.submodel === 'object') {
      walkNode(node.submodel, 0, false, pivot, boneName, depth + 1);
    }
  };

  data.models.forEach((m: any, idx: number) => {
    walkNode(m, idx, true, [0, 0, 0], null, 0);
  });

  if (bones.length === 0) return null;

  const bounds = computeVisibleBounds(allAabbs);
  const bedrockGeo = {
    format_version: '1.12.0',
    'minecraft:geometry': [
      {
        description: {
          identifier: `geometry.${sanitizeIdentifierSegment(modelIdentifier)}`,
          texture_width: texW,
          texture_height: texH,
          ...bounds,
        },
        bones,
      },
    ],
  };

  return {
    content: JSON.stringify(bedrockGeo, null, 2),
    ...(warnings.size > 0 ? { warning: Array.from(warnings).join('; ') } : {}),
  };
}

function resolveJavaParentChain(
  initialModel: JavaModel,
  resolveParent?: (parentRef: string) => string | null
): JavaModel {
  if (!initialModel.parent || !resolveParent) return initialModel;

  const chain: JavaModel[] = [initialModel];
  const visited = new Set<string>();
  let current: JavaModel = initialModel;

  while (current.parent && chain.length < MAX_MODEL_DEPTH) {
    const ref = current.parent.trim();
    if (!ref || visited.has(ref)) break;
    visited.add(ref);
    const parentRaw = resolveParent(ref);
    if (!parentRaw) break;
    try {
      const parentParsed = parseJsonc(parentRaw) as JavaModel;
      if (!parentParsed || typeof parentParsed !== 'object') break;
      chain.push(parentParsed);
      current = parentParsed;
    } catch {
      break;
    }
  }

  // Merge from root ancestor down to child
  const merged: JavaModel = {};
  const mergedTextures: Record<string, string> = Object.create(null);
  let hasTextures = false;

  for (let i = chain.length - 1; i >= 0; i--) {
    const m = chain[i];
    if (Array.isArray(m.elements)) merged.elements = m.elements;
    if (Array.isArray(m.texture_size)) merged.texture_size = m.texture_size;
    if (m.textures && typeof m.textures === 'object') {
      for (const [k, v] of Object.entries(m.textures)) {
        if (!isUnsafeObjectKey(k) && typeof v === 'string') {
          mergedTextures[k] = v;
          hasTextures = true;
        }
      }
    }
  }
  if (hasTextures) merged.textures = mergedTextures;
  return merged;
}

export function javaToBedrockGeometryDetailed(
  modelJson: string,
  modelIdentifier: string,
  options?: JavaToBedrockOptions
): JavaToBedrockResult | null {
  try {
    const data = parseJsonc(modelJson) as any;
    if (!data || typeof data !== 'object') return null;

    // 1. OptiFine CEM (.jem)
    if (Array.isArray(data.models)) {
      return convertCemToBedrock(data, modelIdentifier, options);
    }

    // 2. Standard Java Block/Item JSON Model
    const jModel = resolveJavaParentChain(data as JavaModel, options?.resolveParent);
    if (!Array.isArray(jModel.elements) || jModel.elements.length === 0) {
      return null;
    }

    const texSize = Array.isArray(jModel.texture_size) ? jModel.texture_size : [16, 16];
    const texW = Math.max(1, toFinite(texSize[0], 16));
    const texH = Math.max(1, toFinite(texSize[1], 16));
    const scaleU = texW / 16;
    const scaleV = texH / 16;

    const supportsUvRotation =
      !options?.targetBedrockMinEngine ||
      compareBedrockVersion(options.targetBedrockMinEngine, [1, 21, 0]) >= 0;

    let usedUvRotation = false;
    const warnings = new Set<string>();
    const cubes: any[] = [];
    const allAabbs: Array<{ min: Vec3; max: Vec3 }> = [];

    for (const el of jModel.elements) {
      if (cubes.length >= MAX_CUBES_PER_MODEL) break;
      if (!el || !Array.isArray(el.from) || el.from.length < 3 || !Array.isArray(el.to) || el.to.length < 3) {
        continue;
      }

      const f = toVec3(el.from);
      const t = toVec3(el.to);
      const rawMin: Vec3 = [Math.min(f[0], t[0]), Math.min(f[1], t[1]), Math.min(f[2], t[2])];
      const rawMax: Vec3 = [Math.max(f[0], t[0]), Math.max(f[1], t[1]), Math.max(f[2], t[2])];

      const min: Vec3 = [...rawMin];
      const max: Vec3 = [...rawMax];

      const hasValidRotation =
        el.rotation &&
        Array.isArray(el.rotation.origin) &&
        el.rotation.origin.length >= 3 &&
        (el.rotation.axis === 'x' || el.rotation.axis === 'y' || el.rotation.axis === 'z') &&
        Number.isFinite(Number(el.rotation.angle));

      if (hasValidRotation && el.rotation!.rescale) {
        const angle = toFinite(el.rotation!.angle);
        if (Math.abs(angle) > 1e-4 && Math.abs(angle) < 89) {
          const factor = 1 / Math.cos((angle * Math.PI) / 180);
          const rotOrigin = toVec3(el.rotation!.origin);
          const axisIdx = el.rotation!.axis === 'x' ? 0 : el.rotation!.axis === 'y' ? 1 : 2;
          for (let i = 0; i < 3; i++) {
            if (i === axisIdx) continue;
            min[i] = rotOrigin[i] + (min[i] - rotOrigin[i]) * factor;
            max[i] = rotOrigin[i] + (max[i] - rotOrigin[i]) * factor;
          }
        }
      }

      // Exact X-flip from Java [0..16] to Bedrock centered [0,0,0]
      const origin: Vec3 = [round4(8 - max[0]), round4(min[1]), round4(min[2] - 8)];
      const size: Vec3 = [round4(max[0] - min[0]), round4(max[1] - min[1]), round4(max[2] - min[2])];

      allAabbs.push({
        min: origin,
        max: [origin[0] + size[0], origin[1] + size[1], origin[2] + size[2]],
      });

      const cube: any = { origin, size };

      if (hasValidRotation) {
        const angle = toFinite(el.rotation!.angle);
        if (Math.abs(angle) > 1e-4) {
          const rotOrigin = toVec3(el.rotation!.origin);
          cube.pivot = [round4(8 - rotOrigin[0]), round4(rotOrigin[1]), round4(rotOrigin[2] - 8)];
          cube.rotation = [
            el.rotation!.axis === 'x' ? round4(-angle) : 0,
            el.rotation!.axis === 'y' ? round4(-angle) : 0,
            el.rotation!.axis === 'z' ? round4(angle) : 0,
          ];
        }
      }

      if (el.faces && typeof el.faces === 'object') {
        const distinctMaterials = new Set<string>();
        for (const faceName of VALID_FACES) {
          const faceData = Object.hasOwn(el.faces, faceName) ? el.faces[faceName] : undefined;
          if (faceData && typeof faceData.texture === 'string') {
            distinctMaterials.add(resolveJavaTextureVar(faceData.texture, jModel.textures));
          }
        }
        const includeMaterialInstance = distinctMaterials.size > 1;

        const cubeUv: Record<string, any> = Object.create(null);
        let hasAnyFace = false;

        for (const faceName of VALID_FACES) {
          const faceData = Object.hasOwn(el.faces, faceName) ? el.faces[faceName] : undefined;
          if (!faceData || typeof faceData !== 'object') continue;
          hasAnyFace = true;

          let u1: number, v1: number, u2: number, v2: number;
          if (Array.isArray(faceData.uv) && faceData.uv.length >= 4) {
            u1 = toFinite(faceData.uv[0]);
            v1 = toFinite(faceData.uv[1]);
            u2 = toFinite(faceData.uv[2]);
            v2 = toFinite(faceData.uv[3]);
          } else {
            // Minecraft Java auto-UV from pre-rescale [rawMin, rawMax]
            switch (faceName) {
              case 'north':
                [u1, v1, u2, v2] = [16 - rawMax[0], 16 - rawMax[1], 16 - rawMin[0], 16 - rawMin[1]];
                break;
              case 'south':
                [u1, v1, u2, v2] = [rawMin[0], 16 - rawMax[1], rawMax[0], 16 - rawMin[1]];
                break;
              case 'east':
                [u1, v1, u2, v2] = [16 - rawMax[2], 16 - rawMax[1], 16 - rawMin[2], 16 - rawMin[1]];
                break;
              case 'west':
                [u1, v1, u2, v2] = [rawMin[2], 16 - rawMax[1], rawMax[2], 16 - rawMin[1]];
                break;
              case 'up':
                [u1, v1, u2, v2] = [rawMin[0], rawMin[2], rawMax[0], rawMax[2]];
                break;
              case 'down':
                [u1, v1, u2, v2] = [rawMin[0], 16 - rawMax[2], rawMax[0], 16 - rawMin[2]];
                break;
            }
          }

          u1 *= scaleU;
          u2 *= scaleU;
          v1 *= scaleV;
          v2 *= scaleV;

          let [bu1, bv1, bu2, bv2] =
            faceName === 'up' || faceName === 'down' ? [u2, v2, u1, v1] : [u1, v1, u2, v2];

          const faceOut: Record<string, any> = {};
          if (typeof faceData.rotation === 'number' && Number.isFinite(faceData.rotation)) {
            const rot = ((Math.round(faceData.rotation / 90) * 90) % 360 + 360) % 360;
            if (rot === 180 && !supportsUvRotation) {
              [bu1, bv1, bu2, bv2] = [bu2, bv2, bu1, bv1];
            } else if (rot !== 0) {
              if (supportsUvRotation) {
                faceOut.uv_rotation = rot;
                usedUvRotation = true;
              } else {
                warnings.add('90°/270° face UV rotation requires Bedrock 1.21.0+');
              }
            }
          }

          faceOut.uv = [round4(bu1), round4(bv1)];
          faceOut.uv_size = [round4(bu2 - bu1), round4(bv2 - bv1)];

          if (includeMaterialInstance && typeof faceData.texture === 'string') {
            const matKey = faceData.texture.trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
            if (matKey) faceOut.material_instance = matKey;
          }

          cubeUv[faceName] = faceOut;
        }

        if (hasAnyFace) {
          cube.uv = cubeUv;
        }
      }

      cubes.push(cube);
    }

    if (cubes.length === 0) return null;

    const bounds = computeVisibleBounds(allAabbs);
    const bedrockGeo = {
      format_version: usedUvRotation ? '1.21.0' : '1.12.0',
      'minecraft:geometry': [
        {
          description: {
            identifier: `geometry.${sanitizeIdentifierSegment(modelIdentifier)}`,
            texture_width: texW,
            texture_height: texH,
            ...bounds,
          },
          bones: [
            {
              name: 'root',
              pivot: [0, 0, 0],
              cubes,
            },
          ],
        },
      ],
    };

    return {
      content: JSON.stringify(bedrockGeo, null, 2),
      ...(warnings.size > 0 ? { warning: Array.from(warnings).join('; ') } : {}),
    };
  } catch {
    return null;
  }
}

export function javaToBedrockGeometry(
  modelJson: string,
  modelIdentifier: string,
  options?: JavaToBedrockOptions
): string | null {
  return javaToBedrockGeometryDetailed(modelJson, modelIdentifier, options)?.content ?? null;
}

export function extractBedrockGeometriesFromJson(geoJsonStr: string): ExtractedBedrockGeometry[] {
  const results: ExtractedBedrockGeometry[] = [];
  let rawData: any;
  try {
    rawData = parseJsonc(geoJsonStr);
  } catch {
    return results;
  }
  if (!rawData || typeof rawData !== 'object') return results;

  const pushGeo = (rawId: string, texW: number, texH: number, bones: any[]) => {
    if (results.length >= MAX_GEOMETRIES_PER_FILE) return;
    const colonIdx = rawId.indexOf(':');
    const baseIdentifier = colonIdx !== -1 ? rawId.slice(0, colonIdx) : rawId;
    const parentIdentifier = colonIdx !== -1 ? rawId.slice(colonIdx + 1) : undefined;
    results.push({
      identifier: rawId,
      baseIdentifier,
      ...(parentIdentifier ? { parentIdentifier } : {}),
      textureWidth: Math.max(1, texW),
      textureHeight: Math.max(1, texH),
      bones,
      versionRank: parseVersionRank(baseIdentifier),
    });
  };

  if (Array.isArray(rawData['minecraft:geometry'])) {
    for (const geo of rawData['minecraft:geometry']) {
      if (!geo || typeof geo !== 'object' || !Array.isArray(geo.bones)) continue;
      const desc = geo.description || {};
      pushGeo(
        String(desc.identifier || 'geometry.custom'),
        toFinite(desc.texture_width, 64),
        toFinite(desc.texture_height, 64),
        geo.bones
      );
    }
  }

  for (const [key, val] of Object.entries(rawData)) {
    if (isUnsafeObjectKey(key)) continue;
    if (key.startsWith('geometry.') && val && typeof val === 'object' && Array.isArray((val as any).bones)) {
      const g = val as any;
      pushGeo(
        key,
        toFinite(g.texturewidth ?? g.texture_width, 64),
        toFinite(g.textureheight ?? g.texture_height, 64),
        g.bones
      );
    }
  }

  return results;
}

function resolveBedrockGeoParent(
  geo: ExtractedBedrockGeometry,
  localMap: Map<string, ExtractedBedrockGeometry>,
  externalMap?: Map<string, ExtractedBedrockGeometry>
): ExtractedBedrockGeometry {
  if (!geo.parentIdentifier) return geo;

  const chain: ExtractedBedrockGeometry[] = [geo];
  const visited = new Set<string>([geo.baseIdentifier.toLowerCase()]);
  let current: ExtractedBedrockGeometry = geo;

  while (current.parentIdentifier && chain.length < MAX_MODEL_DEPTH) {
    const parentKey = current.parentIdentifier.toLowerCase();
    if (visited.has(parentKey)) break;
    visited.add(parentKey);
    const parent = localMap.get(parentKey) ?? externalMap?.get(parentKey);
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }

  if (chain.length === 1) return geo;

  const mergedBones: any[] = [];
  const boneIndexByName = new Map<string, number>();

  for (let i = chain.length - 1; i >= 0; i--) {
    for (const b of chain[i].bones) {
      if (!b || typeof b !== 'object') continue;
      const name = String(b.name || '');
      if (!name || isUnsafeObjectKey(name)) continue;
      const existingIdx = boneIndexByName.get(name);
      if (existingIdx !== undefined) {
        mergedBones[existingIdx] = {
          ...mergedBones[existingIdx],
          ...b,
          cubes: Array.isArray(b.cubes) ? b.cubes : mergedBones[existingIdx].cubes,
        };
      } else {
        boneIndexByName.set(name, mergedBones.length);
        mergedBones.push(b);
      }
    }
  }

  const root = chain[chain.length - 1];
  return {
    ...geo,
    textureWidth: geo.textureWidth || root.textureWidth,
    textureHeight: geo.textureHeight || root.textureHeight,
    bones: mergedBones,
  };
}

// --- Exact 90-degree rotation baking for Java Block/Item models ---

const FACE_PERM_X_90: Record<FaceName, FaceName> = {
  north: 'up',
  up: 'south',
  south: 'down',
  down: 'north',
  east: 'east',
  west: 'west',
};

const FACE_PERM_Y_90: Record<FaceName, FaceName> = {
  north: 'west',
  west: 'south',
  south: 'east',
  east: 'north',
  up: 'up',
  down: 'down',
};

const FACE_PERM_Z_90: Record<FaceName, FaceName> = {
  up: 'east',
  east: 'down',
  down: 'west',
  west: 'up',
  north: 'north',
  south: 'south',
};

function rotatePointAround90(p: Vec3, pivot: Vec3, axis: 'x' | 'y' | 'z', steps: number): Vec3 {
  let x = p[0] - pivot[0];
  let y = p[1] - pivot[1];
  let z = p[2] - pivot[2];
  for (let i = 0; i < steps; i++) {
    if (axis === 'x') {
      [y, z] = [-z, y];
    } else if (axis === 'y') {
      [x, z] = [z, -x];
    } else {
      [x, y] = [-y, x];
    }
  }
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

function bakeSingle90Rotation(
  from: Vec3,
  to: Vec3,
  faces: Partial<Record<FaceName, JavaFace>>,
  pivot: Vec3,
  axis: 'x' | 'y' | 'z',
  stepsCW90: number,
  residualRot?: JavaElementRotation
): {
  from: Vec3;
  to: Vec3;
  faces: Partial<Record<FaceName, JavaFace>>;
  residualRot?: JavaElementRotation;
} {
  const steps = ((stepsCW90 % 4) + 4) % 4;
  if (steps === 0) return { from, to, faces, residualRot };

  const p1 = rotatePointAround90(from, pivot, axis, steps);
  const p2 = rotatePointAround90(to, pivot, axis, steps);
  const newFrom: Vec3 = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.min(p1[2], p2[2])];
  const newTo: Vec3 = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1]), Math.max(p1[2], p2[2])];

  const perm = axis === 'x' ? FACE_PERM_X_90 : axis === 'y' ? FACE_PERM_Y_90 : FACE_PERM_Z_90;
  let newFaces: Partial<Record<FaceName, JavaFace>> = Object.create(null);
  let curFaces = faces;
  for (let s = 0; s < steps; s++) {
    const nextFaces: Partial<Record<FaceName, JavaFace>> = Object.create(null);
    for (const fName of VALID_FACES) {
      const fVal = curFaces[fName];
      if (!fVal) continue;
      nextFaces[perm[fName]] = { ...fVal };
    }
    curFaces = nextFaces;
  }
  newFaces = curFaces;

  let nextRes = residualRot;
  if (residualRot) {
    const newOrigin = rotatePointAround90(residualRot.origin, pivot, axis, steps);
    nextRes = { ...residualRot, origin: newOrigin };
  }

  return { from: newFrom, to: newTo, faces: newFaces, residualRot: nextRes };
}

function convertBedrockBlockToJava(
  geo: ExtractedBedrockGeometry,
  cleanSubPath: string,
  isItem: boolean,
  targetPackFormat: number
): BedrockToJavaOutput | null {
  const elements: JavaElement[] = [];
  const warnings = new Set<string>();
  const materials = new Map<string, string>();
  materials.set('0', '0');
  let nextMatIdx = 1;

  const allocMaterial = (matName?: string): string => {
    if (!matName) return '#0';
    const clean = matName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!clean) return '#0';
    if (!materials.has(clean)) {
      materials.set(clean, String(nextMatIdx++));
    }
    return `#${clean}`;
  };

  const scaleU = 16 / Math.max(1, geo.textureWidth || 16);
  const scaleV = 16 / Math.max(1, geo.textureHeight || 16);
  const clampUv = (v: number) => round4(Math.max(0, Math.min(16, Number.isFinite(v) ? v : 0)));

  const boneMap = new Map<string, any>();
  for (const b of geo.bones) {
    if (!b || typeof b !== 'object' || !b.name || isUnsafeObjectKey(String(b.name))) continue;
    boneMap.set(String(b.name), b);
  }

  const getBoneChain = (startBone: any): any[] => {
    const chain: any[] = [];
    const visited = new Set<string>();
    let cur: any = startBone;
    while (cur && chain.length < MAX_MODEL_DEPTH) {
      chain.push(cur);
      const pName = typeof cur.parent === 'string' ? cur.parent : '';
      if (!pName || isUnsafeObjectKey(pName) || visited.has(pName)) break;
      visited.add(pName);
      cur = boneMap.get(pName);
    }
    return chain; // [leafBone, parentBone, ..., rootBone]
  };

  for (const bone of geo.bones) {
    if (!bone || bone.neverRender === true || !Array.isArray(bone.cubes)) continue;
    if (bone.poly_mesh) {
      warnings.add('Bedrock poly_mesh is not supported in Java JSON models');
    }
    const boneInflate = toFinite(bone.inflate, 0);
    const boneMirror = Boolean(bone.mirror);
    const boneChain = getBoneChain(bone);

    for (const cube of bone.cubes) {
      if (elements.length >= MAX_CUBES_PER_MODEL) break;
      if (!cube || !Array.isArray(cube.origin) || !Array.isArray(cube.size)) continue;

      const inflate = toFinite(cube.inflate, boneInflate);
      const o = toVec3(cube.origin);
      const s = toVec3(cube.size);
      const ox = o[0] - inflate;
      const oy = o[1] - inflate;
      const oz = o[2] - inflate;
      const sx = Math.abs(s[0]) + 2 * inflate;
      const sy = Math.abs(s[1]) + 2 * inflate;
      const sz = Math.abs(s[2]) + 2 * inflate;

      let from: Vec3 = [8 - (ox + sx), oy, oz + 8];
      let to: Vec3 = [8 - ox, oy + sy, oz + sz + 8];
      let faces: Partial<Record<FaceName, JavaFace>> = Object.create(null);

      if (cube.uv && typeof cube.uv === 'object' && !Array.isArray(cube.uv)) {
        for (const f of VALID_FACES) {
          const fData = Object.hasOwn(cube.uv, f) ? cube.uv[f] : undefined;
          if (!fData || typeof fData !== 'object') continue;
          const texRef = allocMaterial(typeof fData.material_instance === 'string' ? fData.material_instance : undefined);
          const faceObj: JavaFace = { texture: texRef };

          if (Array.isArray(fData.uv) && fData.uv.length >= 2) {
            const u0 = toFinite(fData.uv[0]);
            const v0 = toFinite(fData.uv[1]);
            const defaultW = f === 'east' || f === 'west' ? Math.abs(s[2]) : Math.abs(s[0]);
            const defaultH = f === 'up' || f === 'down' ? Math.abs(s[2]) : Math.abs(s[1]);
            const us = Array.isArray(fData.uv_size) && fData.uv_size.length >= 2 ? toFinite(fData.uv_size[0], defaultW) : defaultW;
            const vs = Array.isArray(fData.uv_size) && fData.uv_size.length >= 2 ? toFinite(fData.uv_size[1], defaultH) : defaultH;

            if (f === 'up' || f === 'down') {
              faceObj.uv = [
                clampUv((u0 + us) * scaleU),
                clampUv((v0 + vs) * scaleV),
                clampUv(u0 * scaleU),
                clampUv(v0 * scaleV),
              ];
            } else {
              faceObj.uv = [
                clampUv(u0 * scaleU),
                clampUv(v0 * scaleV),
                clampUv((u0 + us) * scaleU),
                clampUv((v0 + vs) * scaleV),
              ];
            }
          }

          if (typeof fData.uv_rotation === 'number' && Number.isFinite(fData.uv_rotation)) {
            const rot = ((Math.round(fData.uv_rotation / 90) * 90) % 360 + 360) % 360;
            if (rot !== 0) faceObj.rotation = rot;
          }

          faces[f] = faceObj;
        }
      } else if (Array.isArray(cube.uv) && cube.uv.length >= 2) {
        const u = toFinite(cube.uv[0]);
        const v = toFinite(cube.uv[1]);
        const w = Math.abs(s[0]);
        const h = Math.abs(s[1]);
        const d = Math.abs(s[2]);
        const mirror = cube.mirror !== undefined ? Boolean(cube.mirror) : boneMirror;

        const rawBoxFaces: Record<FaceName, [number, number, number, number]> = {
          north: [u + d, v + d, u + d + w, v + d + h],
          south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
          east: [u, v + d, u + d, v + d + h],
          west: [u + d + w, v + d, u + 2 * d + w, v + d + h],
          up: [u + d + w, v + d, u + d, v],
          down: [u + d + 2 * w, v + d, u + d + w, v],
        };

        if (mirror) {
          const tmp = rawBoxFaces.east;
          rawBoxFaces.east = rawBoxFaces.west;
          rawBoxFaces.west = tmp;
        }

        for (const f of VALID_FACES) {
          let [u1, v1, u2, v2] = rawBoxFaces[f];
          if (mirror) {
            [u1, u2] = [u2, u1];
          }
          faces[f] = {
            uv: [clampUv(u1 * scaleU), clampUv(v1 * scaleV), clampUv(u2 * scaleU), clampUv(v2 * scaleV)],
            texture: '#0',
          };
        }
      } else {
        for (const f of VALID_FACES) {
          faces[f] = { texture: '#0' };
        }
      }

      // Collect transform steps from cube -> leafBone -> ... -> rootBone
      const rotSteps: Array<{ rot: Vec3; pivot: Vec3 }> = [];
      if (Array.isArray(cube.rotation) && cube.rotation.length >= 3) {
        const cr = toVec3(cube.rotation);
        if (isNonZeroVec3(cr)) {
          const cp = Array.isArray(cube.pivot) ? toVec3(cube.pivot) : Array.isArray(bone.pivot) ? toVec3(bone.pivot) : [0, 0, 0];
          rotSteps.push({
            rot: [-cr[0], -cr[1], cr[2]],
            pivot: [8 - cp[0], cp[1], cp[2] + 8],
          });
        }
      }
      for (const bNode of boneChain) {
        if (Array.isArray(bNode.rotation) && bNode.rotation.length >= 3) {
          const br = toVec3(bNode.rotation);
          if (isNonZeroVec3(br)) {
            const bp = Array.isArray(bNode.pivot) ? toVec3(bNode.pivot) : [0, 0, 0];
            rotSteps.push({
              rot: [-br[0], -br[1], br[2]],
              pivot: [8 - bp[0], bp[1], bp[2] + 8],
            });
          }
        }
      }

      let residualRot: JavaElementRotation | undefined;
      for (const step of rotSteps) {
        const axes: Array<['x' | 'y' | 'z', number]> = [
          ['x', step.rot[0]],
          ['y', step.rot[1]],
          ['z', step.rot[2]],
        ];
        const nonZeroAxes = axes.filter(([, a]) => Math.abs(a) > 1e-4);
        const allExact90 = nonZeroAxes.every(([, a]) => Math.abs(a - Math.round(a / 90) * 90) < 0.01);

        if (allExact90) {
          for (const [axis, a] of nonZeroAxes) {
            const steps = Math.round(a / 90);
            const baked = bakeSingle90Rotation(from, to, faces, step.pivot, axis, steps, residualRot);
            from = baked.from;
            to = baked.to;
            faces = baked.faces;
            residualRot = baked.residualRot;
          }
        } else {
          if (nonZeroAxes.length > 1) {
            warnings.add('Multi-axis rotation approximated to single axis');
          }
          nonZeroAxes.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
          const [domAxis, domAngle] = nonZeroAxes[0];
          const q90 = Math.round(domAngle / 90) * 90;
          const rem = domAngle - q90;
          if (q90 !== 0) {
            const baked = bakeSingle90Rotation(from, to, faces, step.pivot, domAxis, Math.round(q90 / 90), residualRot);
            from = baked.from;
            to = baked.to;
            faces = baked.faces;
            residualRot = baked.residualRot;
          }
          const snapped = Math.max(-45, Math.min(45, Math.round(rem / 22.5) * 22.5));
          if (Math.abs(rem - snapped) > 0.01) {
            warnings.add('Rotation angle snapped to Java 22.5° increment');
          }
          if (Math.abs(snapped) >= 0.01) {
            if (residualRot) {
              warnings.add('Multiple non-90° rotations approximated to single rotation');
            } else {
              residualRot = {
                origin: [round4(step.pivot[0]), round4(step.pivot[1]), round4(step.pivot[2])],
                axis: domAxis,
                angle: snapped,
              };
            }
          }
        }
      }

      let clamped = false;
      const clampCoord = (v: number): number => {
        if (!Number.isFinite(v)) return 0;
        if (v < -16) {
          clamped = true;
          return -16;
        }
        if (v > 32) {
          clamped = true;
          return 32;
        }
        return round4(v);
      };

      const finalFrom: Vec3 = [clampCoord(from[0]), clampCoord(from[1]), clampCoord(from[2])];
      const finalTo: Vec3 = [clampCoord(to[0]), clampCoord(to[1]), clampCoord(to[2])];
      if (clamped) {
        warnings.add('Clamped coordinates to Java [-16, 32] range');
      }

      const el: JavaElement = { from: finalFrom, to: finalTo, faces };
      if (residualRot) el.rotation = residualRot;
      elements.push(el);
    }
  }

  if (elements.length === 0) return null;

  const texFolder = targetPackFormat <= 3 ? (isItem ? 'items' : 'blocks') : isItem ? 'item' : 'block';
  const textures: Record<string, string> = {
    '0': `minecraft:${texFolder}/${cleanSubPath}`,
    particle: `minecraft:${texFolder}/${cleanSubPath}`,
  };
  for (const matKey of materials.keys()) {
    if (matKey !== '0' && !isUnsafeObjectKey(matKey)) {
      textures[matKey] = `minecraft:${texFolder}/${matKey}`;
    }
  }

  const javaModel: JavaModel = {
    ambientocclusion: true,
    textures,
    elements,
  };

  return {
    outputPath: `assets/minecraft/models/${isItem ? 'item' : 'block'}/${cleanSubPath}.json`,
    content: JSON.stringify(javaModel, null, 2),
    ...(warnings.size > 0 ? { warning: Array.from(warnings).join('; ') } : {}),
  };
}

function convertBedrockEntityToJem(
  geo: ExtractedBedrockGeometry,
  entityName: string,
  targetPackFormat: number
): BedrockToJavaOutput | null {
  const warnings = new Set<string>();

  interface BoneNode {
    bone: any;
    children: BoneNode[];
  }

  const nodeMap = new Map<string, BoneNode>();
  const orderedNodes: BoneNode[] = [];
  for (const b of geo.bones) {
    if (!b || typeof b !== 'object') continue;
    const name = String(b.name || `bone_${orderedNodes.length}`);
    if (isUnsafeObjectKey(name)) continue;
    const node: BoneNode = { bone: b, children: [] };
    if (!nodeMap.has(name)) nodeMap.set(name, node);
    orderedNodes.push(node);
  }

  const rootNodes: BoneNode[] = [];
  for (const node of orderedNodes) {
    const parentName = typeof node.bone.parent === 'string' ? node.bone.parent : '';
    const parentNode = parentName && !isUnsafeObjectKey(parentName) ? nodeMap.get(parentName) : undefined;
    if (parentNode && parentNode !== node) {
      // Guard against cycles
      let cur: BoneNode | undefined = parentNode;
      let cyclic = false;
      let steps = 0;
      while (cur && steps < MAX_MODEL_DEPTH) {
        if (cur === node) {
          cyclic = true;
          break;
        }
        const gp: string = typeof cur.bone.parent === 'string' ? cur.bone.parent : '';
        cur = gp && !isUnsafeObjectKey(gp) ? nodeMap.get(gp) : undefined;
        steps++;
      }
      if (!cyclic) {
        parentNode.children.push(node);
        continue;
      }
    }
    rootNodes.push(node);
  }

  let cubeCount = 0;

  const convertCubeToJemBox = (cube: any, refPivot: Vec3, boneInflate: number) => {
    const o = toVec3(cube.origin);
    const s = toVec3(cube.size);
    const w = Math.abs(s[0]);
    const h = Math.abs(s[1]);
    const d = Math.abs(s[2]);

    const box: any = {
      coordinates: [
        round4(refPivot[0] - (o[0] + w)),
        round4(o[1] - refPivot[1]),
        round4(o[2] - refPivot[2]),
        round4(w),
        round4(h),
        round4(d),
      ],
    };

    const inflate = toFinite(cube.inflate, boneInflate);
    if (inflate !== 0) {
      box.sizeAdd = round4(inflate);
    }

    if (Array.isArray(cube.uv) && cube.uv.length >= 2) {
      box.textureOffset = [round4(toFinite(cube.uv[0])), round4(toFinite(cube.uv[1]))];
    } else if (cube.uv && typeof cube.uv === 'object') {
      const faceKeys: Array<[FaceName, string]> = [
        ['north', 'uvNorth'],
        ['south', 'uvSouth'],
        ['east', 'uvEast'],
        ['west', 'uvWest'],
        ['up', 'uvUp'],
        ['down', 'uvDown'],
      ];
      for (const [fName, jemKey] of faceKeys) {
        const fData = Object.hasOwn(cube.uv, fName) ? cube.uv[fName] : undefined;
        if (!fData || !Array.isArray(fData.uv) || fData.uv.length < 2) continue;
        const u0 = toFinite(fData.uv[0]);
        const v0 = toFinite(fData.uv[1]);
        const defaultW = fName === 'east' || fName === 'west' ? d : w;
        const defaultH = fName === 'up' || fName === 'down' ? d : h;
        const us = Array.isArray(fData.uv_size) && fData.uv_size.length >= 2 ? toFinite(fData.uv_size[0], defaultW) : defaultW;
        const vs = Array.isArray(fData.uv_size) && fData.uv_size.length >= 2 ? toFinite(fData.uv_size[1], defaultH) : defaultH;

        if (fName === 'up' || fName === 'down') {
          box[jemKey] = [round4(u0 + us), round4(v0 + vs), round4(u0), round4(v0)];
        } else {
          box[jemKey] = [round4(u0), round4(v0), round4(u0 + us), round4(v0 + vs)];
        }
        if (typeof fData.uv_rotation === 'number' && fData.uv_rotation % 360 !== 0) {
          warnings.add('OptiFine CEM per-face UVs do not support 90°/270° rotation');
        }
      }
    }

    return box;
  };

  const buildJemNode = (node: BoneNode, isRoot: boolean, parentPivot: Vec3, depth: number): any | null => {
    if (depth > MAX_MODEL_DEPTH) return null;
    const bone = node.bone;
    if (bone.poly_mesh) {
      warnings.add('Bedrock poly_mesh is not supported in OptiFine CEM');
    }

    const boneName = String(bone.name || 'root');
    const pivot = toVec3(bone.pivot);
    const boneMirror = Boolean(bone.mirror);
    const boneInflate = toFinite(bone.inflate, 0);

    const entry: any = isRoot
      ? {
          part: mapBedrockBoneToCemPart(boneName),
          id: boneName,
          invertAxis: 'xy',
          translate: [round4(pivot[0]), round4(-pivot[1]), round4(-pivot[2])],
        }
      : {
          id: boneName,
          invertAxis: 'xy',
          translate: [
            round4(parentPivot[0] - pivot[0]),
            round4(pivot[1] - parentPivot[1]),
            round4(pivot[2] - parentPivot[2]),
          ],
        };

    if (Array.isArray(bone.rotation) && bone.rotation.length >= 3) {
      const r = toVec3(bone.rotation);
      if (isNonZeroVec3(r)) {
        entry.rotate = [round4(-r[0]), round4(-r[1]), round4(r[2])];
      }
    }
    if (boneMirror) {
      entry.mirrorTexture = 'u';
    }

    const directBoxes: any[] = [];
    const extraSubmodels: any[] = [];

    if (bone.neverRender !== true && Array.isArray(bone.cubes)) {
      bone.cubes.forEach((c: any, cIdx: number) => {
        if (cubeCount >= MAX_CUBES_PER_MODEL) return;
        if (!c || !Array.isArray(c.origin) || !Array.isArray(c.size)) return;
        cubeCount++;

        const hasCubeRot = Array.isArray(c.rotation) && c.rotation.length >= 3 && isNonZeroVec3(toVec3(c.rotation));
        const hasMirrorOverride = c.mirror !== undefined && Boolean(c.mirror) !== boneMirror;

        if (hasCubeRot || hasMirrorOverride) {
          const cPivot = Array.isArray(c.pivot) ? toVec3(c.pivot) : pivot;
          const sub: any = {
            id: `${boneName}_cube_${cIdx}`,
            invertAxis: 'xy',
            translate: [
              round4(pivot[0] - cPivot[0]),
              round4(cPivot[1] - pivot[1]),
              round4(cPivot[2] - pivot[2]),
            ],
            boxes: [convertCubeToJemBox(c, cPivot, boneInflate)],
          };
          if (hasCubeRot) {
            const cr = toVec3(c.rotation);
            sub.rotate = [round4(-cr[0]), round4(-cr[1]), round4(cr[2])];
          }
          if (Boolean(c.mirror ?? boneMirror)) {
            sub.mirrorTexture = 'u';
          }
          extraSubmodels.push(sub);
        } else {
          directBoxes.push(convertCubeToJemBox(c, pivot, boneInflate));
        }
      });
    }

    const childSubmodels: any[] = [];
    for (const child of node.children) {
      const builtChild = buildJemNode(child, false, pivot, depth + 1);
      if (builtChild) childSubmodels.push(builtChild);
    }

    if (bone.neverRender === true && childSubmodels.length === 0) {
      return null;
    }

    if (directBoxes.length > 0) entry.boxes = directBoxes;
    const allSubs = [...extraSubmodels, ...childSubmodels];
    if (allSubs.length > 0) entry.submodels = allSubs;

    return entry;
  };

  const models = rootNodes
    .map((n) => buildJemNode(n, true, [0, 0, 0], 0))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (models.length === 0) return null;

  const jemData = {
    credit: 'Converted by PackBridge',
    textureSize: [geo.textureWidth, geo.textureHeight],
    models,
  };

  const cemFolder = targetPackFormat <= 3 ? 'assets/minecraft/mcpatcher/cem' : 'assets/minecraft/optifine/cem';
  return {
    outputPath: `${cemFolder}/${entityName}.jem`,
    content: JSON.stringify(jemData, null, 2),
    ...(warnings.size > 0 ? { warning: Array.from(warnings).join('; ') } : {}),
  };
}

/**
 * Converts a Bedrock `.geo.json` or `models/*.json` file into one or more Java models:
 * - Standard Java block/item JSON (`assets/minecraft/models/block|item/<name>.json`)
 * - OptiFine CEM / Entity Model Features `.jem` (`assets/minecraft/optifine|mcpatcher/cem/<entity>.jem`)
 */
export function bedrockToJavaModels(
  geoJsonStr: string,
  relativePath: string,
  options?: BedrockToJavaOptions
): BedrockToJavaOutput[] {
  const targetPackFormat = options?.targetPackFormat ?? 46;
  const geometries = extractBedrockGeometriesFromJson(geoJsonStr);
  if (geometries.length === 0) return [];

  const localMap = new Map<string, ExtractedBedrockGeometry>();
  for (const g of geometries) {
    localMap.set(g.baseIdentifier.toLowerCase(), g);
    localMap.set(g.identifier.toLowerCase(), g);
  }

  const normalizedRel = sanitizeRelativeModelPath(relativePath);
  const relNoModels = normalizedRel.replace(/^models\//, '');
  const relNoExt = relNoModels.replace(/\.geo\.json$/i, '').replace(/\.json$/i, '');
  const fileBaseName = relNoExt.split('/').pop() || 'custom';
  const isMulti = geometries.length > 1;

  const bestByOutputPath = new Map<string, { rank: number; output: BedrockToJavaOutput }>();

  for (const rawGeo of geometries) {
    const geo = resolveBedrockGeoParent(rawGeo, localMap, options?.externalGeometries);
    const idLower = geo.baseIdentifier.toLowerCase();

    const isBlockOrItem =
      normalizedRel.startsWith('models/blocks/') ||
      normalizedRel.startsWith('models/items/') ||
      fileBaseName.startsWith('block_') ||
      fileBaseName.startsWith('item_') ||
      idLower.startsWith('geometry.block_') ||
      idLower.startsWith('geometry.item_');

    let result: BedrockToJavaOutput | null = null;
    if (isBlockOrItem) {
      const isItem =
        normalizedRel.startsWith('models/items/') ||
        fileBaseName.startsWith('item_') ||
        idLower.startsWith('geometry.item_');

      let subPath = relNoExt
        .replace(/^(?:blocks|items|entity)\//, '')
        .replace(/^(?:block_|item_)/, '');
      if (isMulti) {
        const fromId = idLower.replace(/^geometry\.(?:block_|item_)?/, '').replace(/[^a-z0-9_.-]/g, '_');
        if (fromId && fromId !== 'custom') subPath = fromId;
      }
      if (!subPath) continue;
      result = convertBedrockBlockToJava(geo, subPath, isItem, targetPackFormat);
    } else {
      let rawEntity = idLower.replace(/^geometry\./, '');
      rawEntity = rawEntity.replace(/\.v\d+(?:\.\d+)*$/i, '');
      rawEntity = rawEntity.replace(/\./g, '_').replace(/[^a-z0-9_]/g, '_');
      if (!rawEntity || rawEntity === 'custom' || rawEntity === 'unknown') {
        rawEntity = fileBaseName.replace(/^geometry\./, '').replace(/[^a-z0-9_]/g, '_') || 'custom';
      }
      const entityName = resolveEntityAlias(rawEntity, targetPackFormat);
      result = convertBedrockEntityToJem(geo, entityName, targetPackFormat);
    }

    if (!result) continue;
    const prev = bestByOutputPath.get(result.outputPath);
    if (!prev || geo.versionRank >= prev.rank) {
      bestByOutputPath.set(result.outputPath, { rank: geo.versionRank, output: result });
    }
  }

  return Array.from(bestByOutputPath.values()).map((v) => v.output);
}

export function bedrockToJavaModel(
  geoJsonStr: string,
  relativePath: string,
  targetPackFormat = 46
): { outputPath: string; content: string } | null {
  const outputs = bedrockToJavaModels(geoJsonStr, relativePath, { targetPackFormat });
  if (outputs.length === 0) return null;
  return { outputPath: outputs[0].outputPath, content: outputs[0].content };
}

export function isBedrockModelPath(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return lower.startsWith('models/') && lower.endsWith('.json');
}

export function isJavaCemPartPath(relativePath: string): boolean {
  return /^assets\/minecraft\/(?:optifine|mcpatcher)\/cem\/.+\.jpm$/i.test(relativePath);
}

export function isJavaModelPath(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  if (lower.startsWith('assets/minecraft/models/') && lower.endsWith('.json')) return true;
  if (
    (lower.startsWith('assets/minecraft/optifine/cem/') ||
      lower.startsWith('assets/minecraft/mcpatcher/cem/')) &&
    (lower.endsWith('.jem') || lower.endsWith('.jpm'))
  ) {
    return true;
  }
  return false;
}
