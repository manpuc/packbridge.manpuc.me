/**
 * Converts Minecraft Java Edition JSON models (elements/cubes)
 * into Bedrock Edition geometry format (format_version 1.12.0)
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
    const data: JavaModel = JSON.parse(modelJson);
    if (!data.elements || !Array.isArray(data.elements) || data.elements.length === 0) {
      return null;
    }

    const cubes = data.elements.map((el) => {
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
      [`minecraft:geometry`]: [
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
