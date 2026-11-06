/**
 * Bidirectional 3D Custom Model & Entity Geometry Converter
 * - Java Edition Block/Item JSON models (`assets/minecraft/models/block|item/*.json`)
 *   and OptiFine CEM / Entity Model Features (`assets/minecraft/optifine/cem/*.jem`, `assets/minecraft/mcpatcher/cem/*.jem`)
 * - Bedrock Edition Geometry (`models/entity/*.geo.json`, `models/*.json` across format_version 1.8.0 - 1.16.0+)
 */

interface JavaElementRotation {
  origin: [number, number, number];
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
  from: [number, number, number];
  to: [number, number, number];
  rotation?: JavaElementRotation;
  shade?: boolean;
  faces?: Record<string, JavaFace>;
}

interface JavaModel {
  parent?: string;
  ambientocclusion?: boolean;
  textures?: Record<string, string>;
  elements?: JavaElement[];
}

export function javaToBedrockGeometry(
  modelJson: string,
  modelIdentifier: string
): string | null {
  try {
    const data = JSON.parse(modelJson);

    // 1. Handle OptiFine CEM (.jem) files if passed
    if (Array.isArray(data.models)) {
      const textureSize = Array.isArray(data.textureSize) ? data.textureSize : [64, 64];
      const bones = data.models
        .filter((m: any) => m && typeof m === 'object')
        .map((m: any, idx: number) => {
          const boneName = String(m.part || m.id || `bone_${idx}`);
          const pivot: [number, number, number] = Array.isArray(m.translate) && m.translate.length === 3
            ? [-Number(m.translate[0] || 0), Number(m.translate[1] || 0), Number(m.translate[2] || 0)]
            : [0, 0, 0];
          const cubes = Array.isArray(m.boxes)
            ? m.boxes
                .filter((b: any) => Array.isArray(b?.coordinates) && b.coordinates.length >= 6)
                .map((b: any) => {
                  const [x, y, z, w, h, d] = b.coordinates.map((n: any) => Number(n) || 0);
                  const cube: any = {
                    origin: [x, y, z],
                    size: [Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)],
                  };
                  if (Array.isArray(b.textureOffset) && b.textureOffset.length >= 2) {
                    cube.uv = [Number(b.textureOffset[0]) || 0, Number(b.textureOffset[1]) || 0];
                  }
                  if (typeof b.sizeAdd === 'number' && b.sizeAdd !== 0) {
                    cube.inflate = b.sizeAdd;
                  }
                  return cube;
                })
            : [];
          const bone: any = {
            name: boneName,
            pivot,
          };
          if (Array.isArray(m.rotate) && m.rotate.length === 3) {
            bone.rotation = [-Number(m.rotate[0] || 0), -Number(m.rotate[1] || 0), Number(m.rotate[2] || 0)];
          }
          if (cubes.length > 0) bone.cubes = cubes;
          return bone;
        });

      if (bones.length === 0) return null;

      const bedrockGeo = {
        format_version: "1.12.0",
        "minecraft:geometry": [
          {
            description: {
              identifier: `geometry.${modelIdentifier.replace(/[^a-zA-Z0-9_]/g, '_')}`,
              texture_width: Number(textureSize[0]) || 64,
              texture_height: Number(textureSize[1]) || 64,
              visible_bounds_width: 3,
              visible_bounds_height: 3,
              visible_bounds_offset: [0, 1, 0]
            },
            bones
          }
        ]
      };
      return JSON.stringify(bedrockGeo, null, 2);
    }

    // 2. Standard Java Block/Item JSON Model
    const jModel = data as JavaModel;
    if (!jModel.elements || !Array.isArray(jModel.elements) || jModel.elements.length === 0) {
      return null;
    }

    const cubes = jModel.elements.map((el) => {
      // Java model coords are [0, 16] centered around [8, 8, 8]
      // In Bedrock, coordinates are centered around [0, 0, 0] with origin at -8
      const origin: [number, number, number] = [
        el.from[0] - 8,
        el.from[1],
        el.from[2] - 8
      ];
      const size: [number, number, number] = [
        Math.max(0.01, el.to[0] - el.from[0]),
        Math.max(0.01, el.to[1] - el.from[1]),
        Math.max(0.01, el.to[2] - el.from[2])
      ];

      const cube: any = {
        origin,
        size
      };

      if (el.rotation) {
        const pivot: [number, number, number] = [
          el.rotation.origin[0] - 8,
          el.rotation.origin[1],
          el.rotation.origin[2] - 8
        ];
        cube.pivot = pivot;
        cube.rotation = [
          el.rotation.axis === 'x' ? -el.rotation.angle : 0,
          el.rotation.axis === 'y' ? -el.rotation.angle : 0,
          el.rotation.axis === 'z' ? el.rotation.angle : 0
        ];
      }

      // Convert faces UV if present
      if (el.faces) {
        cube.uv = {};
        for (const [faceName, faceData] of Object.entries(el.faces)) {
          if (faceData.uv) {
            cube.uv[faceName] = {
              uv: [faceData.uv[0], faceData.uv[1]],
              uv_size: [faceData.uv[2] - faceData.uv[0], faceData.uv[3] - faceData.uv[1]]
            };
          }
        }
      }

      return cube;
    });

    const bedrockGeo = {
      format_version: "1.12.0",
      "minecraft:geometry": [
        {
          description: {
            identifier: `geometry.${modelIdentifier.replace(/[^a-zA-Z0-9_]/g, '_')}`,
            texture_width: 16,
            texture_height: 16,
            visible_bounds_width: 2,
            visible_bounds_height: 2,
            visible_bounds_offset: [0, 0.5, 0]
          },
          bones: [
            {
              name: "root",
              pivot: [0, 0, 0],
              cubes
            }
          ]
        }
      ]
    };

    return JSON.stringify(bedrockGeo, null, 2);
  } catch {
    return null;
  }
}

interface ExtractedBedrockGeometry {
  identifier: string;
  textureWidth: number;
  textureHeight: number;
  bones: any[];
}

function extractBedrockGeometries(rawData: any): ExtractedBedrockGeometry[] {
  const results: ExtractedBedrockGeometry[] = [];
  if (!rawData || typeof rawData !== 'object') return results;

  // Format 1.12.0 / 1.16.0+: `"minecraft:geometry": [ { description: {...}, bones: [...] } ]`
  if (Array.isArray(rawData['minecraft:geometry'])) {
    for (const geo of rawData['minecraft:geometry']) {
      if (!geo || typeof geo !== 'object' || !Array.isArray(geo.bones)) continue;
      const desc = geo.description || {};
      results.push({
        identifier: String(desc.identifier || 'geometry.custom'),
        textureWidth: Number(desc.texture_width) || 64,
        textureHeight: Number(desc.texture_height) || 64,
        bones: geo.bones
      });
    }
  }

  // Format 1.8.0 / 1.10.0: `"geometry.mob_name": { texturewidth: 64, textureheight: 64, bones: [...] }`
  for (const [key, val] of Object.entries(rawData)) {
    if (key.startsWith('geometry.') && val && typeof val === 'object' && Array.isArray((val as any).bones)) {
      const g = val as any;
      results.push({
        identifier: key,
        textureWidth: Number(g.texturewidth ?? g.texture_width) || 64,
        textureHeight: Number(g.textureheight ?? g.texture_height) || 64,
        bones: g.bones
      });
    }
  }

  return results;
}

function snapJavaAngle(angle: number): { angle: number; axis: 'x' | 'y' | 'z' } | null {
  // Java block/item model elements only allow rotations in increments of 22.5 degrees in [-45, 45]
  const clamped = Math.max(-45, Math.min(45, Math.round(angle / 22.5) * 22.5));
  if (Math.abs(clamped) < 0.01) return null;
  return { angle: clamped, axis: 'x' };
}

/**
 * Converts a Bedrock `.geo.json` or `models/*.json` file into either:
 * 1. A standard Java block/item JSON model (`assets/minecraft/models/block|item/<name>.json`)
 *    when the file represents a block/item model (`block_*`, `item_*`).
 * 2. An OptiFine CEM / Entity Model Features `.jem` file (`assets/minecraft/optifine/cem/<entity>.jem`,
 *    or `assets/minecraft/mcpatcher/cem/<entity>.jem` for legacy `pack_format <= 3`).
 */
export function bedrockToJavaModel(
  geoJsonStr: string,
  relativePath: string,
  targetPackFormat = 46
): { outputPath: string; content: string } | null {
  try {
    const cleaned = geoJsonStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const rawData = JSON.parse(cleaned);
    const geometries = extractBedrockGeometries(rawData);
    if (geometries.length === 0) return null;

    const primary = geometries[0];
    const fileName = relativePath.split('/').pop() || 'custom.geo.json';
    const baseName = fileName
      .replace(/\.geo\.json$/i, '')
      .replace(/\.json$/i, '')
      .toLowerCase();

    const isBlockOrItem =
      baseName.startsWith('block_') ||
      baseName.startsWith('item_') ||
      primary.identifier.startsWith('geometry.block_') ||
      primary.identifier.startsWith('geometry.item_');

    if (isBlockOrItem) {
      const isItem = baseName.startsWith('item_') || primary.identifier.startsWith('geometry.item_');
      const cleanName = baseName.replace(/^(block_|item_)/, '').replace(/[^a-z0-9_.-]/g, '_');
      if (!cleanName) return null;
      const elements: JavaElement[] = [];
      const clampCoord = (v: number) => Math.max(-16, Math.min(32, Number.isFinite(v) ? v : 0));
      const clampUv = (v: number) => Math.max(0, Math.min(16, Number.isFinite(v) ? v : 0));
      const scaleU = 16 / Math.max(1, primary.textureWidth || 16);
      const scaleV = 16 / Math.max(1, primary.textureHeight || 16);

      for (const bone of primary.bones) {
        if (!bone || !Array.isArray(bone.cubes)) continue;
        for (const cube of bone.cubes) {
          if (!Array.isArray(cube.origin) || !Array.isArray(cube.size)) continue;
          const rawFrom: [number, number, number] = [
            Number(cube.origin[0] || 0) + 8,
            Number(cube.origin[1] || 0),
            Number(cube.origin[2] || 0) + 8
          ];
          const rawTo: [number, number, number] = [
            rawFrom[0] + Number(cube.size[0] || 0),
            rawFrom[1] + Number(cube.size[1] || 0),
            rawFrom[2] + Number(cube.size[2] || 0)
          ];
          const from: [number, number, number] = [
            clampCoord(Math.min(rawFrom[0], rawTo[0])),
            clampCoord(Math.min(rawFrom[1], rawTo[1])),
            clampCoord(Math.min(rawFrom[2], rawTo[2]))
          ];
          const to: [number, number, number] = [
            clampCoord(Math.max(rawFrom[0], rawTo[0])),
            clampCoord(Math.max(rawFrom[1], rawTo[1])),
            clampCoord(Math.max(rawFrom[2], rawTo[2]))
          ];

          const el: JavaElement = { from, to };

          const rot = Array.isArray(cube.rotation) ? cube.rotation : Array.isArray(bone.rotation) ? bone.rotation : null;
          const piv = Array.isArray(cube.pivot) ? cube.pivot : Array.isArray(bone.pivot) ? bone.pivot : null;
          if (rot && piv) {
            const rx = -Number(rot[0] || 0);
            const ry = -Number(rot[1] || 0);
            const rz = Number(rot[2] || 0);
            const axis: 'x' | 'y' | 'z' =
              Math.abs(rx) >= Math.abs(ry) && Math.abs(rx) >= Math.abs(rz) ? 'x' :
              Math.abs(ry) >= Math.abs(rz) ? 'y' : 'z';
            const rawAngle = axis === 'x' ? rx : axis === 'y' ? ry : rz;
            const snapped = snapJavaAngle(rawAngle);
            if (snapped) {
              el.rotation = {
                origin: [Number(piv[0] || 0) + 8, Number(piv[1] || 0), Number(piv[2] || 0) + 8],
                axis,
                angle: snapped.angle
              };
            }
          }

          const faces: Record<string, JavaFace> = {};
          const faceNames = ['north', 'east', 'south', 'west', 'up', 'down'];
          if (cube.uv && typeof cube.uv === 'object' && !Array.isArray(cube.uv)) {
            for (const f of faceNames) {
              const fData = cube.uv[f];
              if (fData && Array.isArray(fData.uv)) {
                const u0 = Number(fData.uv[0] || 0) * scaleU;
                const v0 = Number(fData.uv[1] || 0) * scaleV;
                const us = (Array.isArray(fData.uv_size) ? Number(fData.uv_size[0] || 0) : 16) * scaleU;
                const vs = (Array.isArray(fData.uv_size) ? Number(fData.uv_size[1] || 0) : 16) * scaleV;
                faces[f] = {
                  uv: [clampUv(u0), clampUv(v0), clampUv(u0 + us), clampUv(v0 + vs)],
                  texture: '#0'
                };
              } else {
                faces[f] = { texture: '#0' };
              }
            }
          } else {
            for (const f of faceNames) {
              faces[f] = { texture: '#0' };
            }
          }
          el.faces = faces;
          elements.push(el);
        }
      }

      if (elements.length === 0) return null;

      const texFolder = targetPackFormat <= 3 ? (isItem ? 'items' : 'blocks') : (isItem ? 'item' : 'block');
      const javaModel: JavaModel = {
        ambientocclusion: true,
        textures: {
          '0': `minecraft:${texFolder}/${cleanName}`,
          particle: `minecraft:${texFolder}/${cleanName}`
        },
        elements
      };

      return {
        outputPath: `assets/minecraft/models/${isItem ? 'item' : 'block'}/${cleanName}.json`,
        content: JSON.stringify(javaModel, null, 2)
      };
    }

    // Entity geometry -> OptiFine CEM / EMF (.jem)
    const entityName = baseName
      .replace(/^geometry\./, '')
      .replace(/[^a-z0-9_]/g, '_');

    const models = primary.bones
      .filter((b: any) => b && typeof b === 'object')
      .map((bone: any) => {
        const pivot = Array.isArray(bone.pivot) ? bone.pivot : [0, 0, 0];
        const partEntry: any = {
          part: String(bone.name || 'root'),
          id: String(bone.name || 'root'),
          invertAxis: 'xy',
          translate: [-Number(pivot[0] || 0), -Number(pivot[1] || 0), Number(pivot[2] || 0)]
        };

        if (Array.isArray(bone.rotation) && bone.rotation.length === 3) {
          partEntry.rotate = [
            -Number(bone.rotation[0] || 0),
            -Number(bone.rotation[1] || 0),
            Number(bone.rotation[2] || 0)
          ];
        }

        if (Array.isArray(bone.cubes) && bone.cubes.length > 0) {
          partEntry.boxes = bone.cubes
            .filter((c: any) => Array.isArray(c?.origin) && Array.isArray(c?.size))
            .map((c: any) => {
              const box: any = {
                coordinates: [
                  Number(c.origin[0] || 0),
                  Number(c.origin[1] || 0),
                  Number(c.origin[2] || 0),
                  Number(c.size[0] || 0),
                  Number(c.size[1] || 0),
                  Number(c.size[2] || 0)
                ]
              };
              if (Array.isArray(c.uv) && c.uv.length >= 2) {
                box.textureOffset = [Number(c.uv[0] || 0), Number(c.uv[1] || 0)];
              }
              if (typeof c.inflate === 'number' && c.inflate !== 0) {
                box.sizeAdd = c.inflate;
              }
              return box;
            });
        }

        return partEntry;
      });

    if (models.length === 0) return null;

    const jemData = {
      credit: 'Converted by PackBridge',
      textureSize: [primary.textureWidth, primary.textureHeight],
      models
    };

    const cemFolder = targetPackFormat <= 3 ? 'assets/minecraft/mcpatcher/cem' : 'assets/minecraft/optifine/cem';
    return {
      outputPath: `${cemFolder}/${entityName}.jem`,
      content: JSON.stringify(jemData, null, 2)
    };
  } catch {
    return null;
  }
}

export function isBedrockModelPath(relativePath: string): boolean {
  if (!relativePath.startsWith('models/') || !relativePath.endsWith('.json')) return false;
  return true;
}

export function isJavaModelPath(relativePath: string): boolean {
  if (relativePath.startsWith('assets/minecraft/models/') && relativePath.endsWith('.json')) return true;
  if ((relativePath.startsWith('assets/minecraft/optifine/cem/') || relativePath.startsWith('assets/minecraft/mcpatcher/cem/')) && relativePath.endsWith('.jem')) {
    return true;
  }
  return false;
}
