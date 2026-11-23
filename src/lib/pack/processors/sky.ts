import { strFromU8 } from 'fflate';
import { decodeImageToRgbaSync, type DecodedRgbaImage } from './pbr';
import { encodeRgbaToPngSync } from './tga';

const MAX_SKY_DIMENSION = 8192;

interface SkyboxTileSpec {
  col: number;
  row: number;
  rotate180: boolean;
}

// Verified against MCPatcher SkyRenderer.java & swim_porter cubemap.go
const SKYBOX_TILE_SPEC: readonly SkyboxTileSpec[] = [
  { col: 2, row: 0, rotate180: false }, // cubemap_0 (back / north)
  { col: 0, row: 1, rotate180: false }, // cubemap_1 (left / west)
  { col: 1, row: 1, rotate180: false }, // cubemap_2 (front / south)
  { col: 2, row: 1, rotate180: false }, // cubemap_3 (right / east)
  { col: 1, row: 0, rotate180: true },  // cubemap_4 (top / zenith)
  { col: 0, row: 0, rotate180: true },  // cubemap_5 (bottom / nadir)
];

export function isPanoramaPath(path: string): boolean {
  return (
    /^assets\/minecraft\/textures\/gui\/title\/background\/(panorama_[0-5]|panorama_overlay)\.png$/.test(path) ||
    /^textures\/ui\/(panorama_[0-5]|panorama_overlay)\.(png|tga)$/.test(path)
  );
}

export function isJavaOverworldSkyPath(path: string): boolean {
  return /^assets\/minecraft\/(optifine|mcpatcher)\/sky\/world0\/.+\.(properties|png)$/i.test(path);
}

export function getBedrockCubemapIndex(path: string): number | null {
  const m = path.match(/^textures\/environment\/overworld_cubemap\/cubemap_([0-5])\.(png|tga)$/i);
  return m ? Number(m[1]) : null;
}

export function migrateJavaSkyPath(path: string, targetPackFormat: number): string {
  if (targetPackFormat >= 4) {
    return path.replace(/^assets\/minecraft\/mcpatcher\/sky\//i, 'assets/minecraft/optifine/sky/');
  }
  return path.replace(/^assets\/minecraft\/optifine\/sky\//i, 'assets/minecraft/mcpatcher/sky/');
}

export function migrateJavaSkyProperties(content: string, targetPackFormat: number): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*source\s*=\s*)(.+?)(\s*)$/i);
      if (!m) return line;
      let val = m[2];
      val = targetPackFormat >= 4
        ? val.replace(/mcpatcher\//gi, 'optifine/').toLowerCase()
        : val.replace(/optifine\//gi, 'mcpatcher/');
      return `${m[1]}${val}${m[3]}`;
    })
    .join('\n');
}

async function decodeSkyImage(bytes: Uint8Array): Promise<DecodedRgbaImage | null> {
  const syncDecoded = decodeImageToRgbaSync(bytes);
  if (syncDecoded) return syncDecoded;

  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return null;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as any], { type: 'image/png' }));
    if (bitmap.width <= 0 || bitmap.height <= 0 || bitmap.width > MAX_SKY_DIMENSION || bitmap.height > MAX_SKY_DIMENSION) {
      return null;
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: bitmap.width, height: bitmap.height, rgba: new Uint8Array(imgData.data) };
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

export function sliceOptiFineSkyToBedrockCubemap(img: DecodedRgbaImage): Record<string, Uint8Array> | null {
  if (img.width < 3 || img.height < 2 || img.width > MAX_SKY_DIMENSION || img.height > MAX_SKY_DIMENSION) {
    return null;
  }
  if (Math.abs(img.width * 2 - img.height * 3) > Math.max(3, Math.round(img.height * 0.02))) {
    return null;
  }

  const tileW = Math.floor(img.width / 3);
  const tileH = Math.floor(img.height / 2);
  const faceSize = Math.min(tileW, tileH);
  if (faceSize <= 0) return null;

  const out: Record<string, Uint8Array> = {};
  for (let i = 0; i < SKYBOX_TILE_SPEC.length; i++) {
    const spec = SKYBOX_TILE_SPEC[i];
    const startX = spec.col * tileW;
    const startY = spec.row * tileH;
    const faceRgba = new Uint8Array(faceSize * faceSize * 4);

    for (let y = 0; y < faceSize; y++) {
      const sy = startY + (spec.rotate180 ? faceSize - 1 - y : y);
      for (let x = 0; x < faceSize; x++) {
        const sx = startX + (spec.rotate180 ? faceSize - 1 - x : x);
        const sIdx = (sy * img.width + sx) * 4;
        const dIdx = (y * faceSize + x) * 4;
        faceRgba[dIdx] = img.rgba[sIdx];
        faceRgba[dIdx + 1] = img.rgba[sIdx + 1];
        faceRgba[dIdx + 2] = img.rgba[sIdx + 2];
        faceRgba[dIdx + 3] = img.rgba[sIdx + 3];
      }
    }

    out[`textures/environment/overworld_cubemap/cubemap_${i}.png`] = encodeRgbaToPngSync(faceSize, faceSize, faceRgba);
  }

  return out;
}

function parseHhMmMinutes(val?: string): number | null {
  if (!val) return null;
  const m = val.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 24 || mm < 0 || mm > 59) return null;
  return (hh * 60 + mm) % 1440;
}

function isNoonActive(startFadeIn: number | null, endFadeOut: number | null): boolean {
  if (startFadeIn === null || endFadeOut === null) return true;
  const noon = 720;
  if (startFadeIn <= endFadeOut) {
    return noon >= startFadeIn && noon <= endFadeOut;
  }
  return noon >= startFadeIn || noon <= endFadeOut;
}

function resolveSkySourceCandidates(propRelPath: string, sourceVal?: string): string[] {
  const lastSlash = propRelPath.lastIndexOf('/');
  const dir = lastSlash !== -1 ? propRelPath.slice(0, lastSlash) : 'assets/minecraft/optifine/sky/world0';
  const fileName = lastSlash !== -1 ? propRelPath.slice(lastSlash + 1) : propRelPath;
  const propStem = fileName.replace(/\.properties$/i, '');
  const root = propRelPath.toLowerCase().includes('/mcpatcher/') ? 'mcpatcher' : 'optifine';
  const otherRoot = root === 'mcpatcher' ? 'optifine' : 'mcpatcher';

  const withPng = (p: string) => (p.toLowerCase().endsWith('.png') ? p : `${p}.png`);

  if (!sourceVal || !sourceVal.trim()) {
    return [`${dir}/${propStem}.png`];
  }

  const raw = sourceVal.trim().replace(/\\/g, '/');
  if (raw.startsWith('./')) {
    return [withPng(`${dir}/${raw.slice(2)}`)];
  }
  if (raw.startsWith('~/')) {
    const rest = raw.slice(2);
    return [
      withPng(`assets/minecraft/${root}/${rest}`),
      withPng(`assets/minecraft/${otherRoot}/${rest}`),
    ];
  }
  const nsMatch = raw.match(/^([a-z0-9_.-]+):(.+)$/i);
  if (nsMatch) {
    return [withPng(`assets/${nsMatch[1]}/${nsMatch[2]}`)];
  }
  if (raw.includes('/')) {
    return [withPng(`assets/minecraft/${raw}`), withPng(`${dir}/${raw}`)];
  }
  return [withPng(`${dir}/${raw}`)];
}

export async function convertJavaSkyToBedrockCubemap(
  skyFiles: Map<string, { sourcePath: string; bytes: Uint8Array }>,
  readPackFile: (relPath: string) => Uint8Array | null
): Promise<{
  files: Record<string, Uint8Array>;
  selectedSourcePath: string;
  selectedRelPath: string;
  selectedPropertiesRelPath?: string;
} | null> {
  // shortcut: Bedrock only supports one static overworld cubemap, so we pick the primary daytime/all-day OptiFine 3x2 layer; upgrade if Bedrock adds multi-layer skybox definitions
  interface SkyCandidate {
    relPath: string;
    sourcePath: string;
    bytes: Uint8Array;
    score: number;
    propertiesRelPath?: string;
  }

  const candidates: SkyCandidate[] = [];
  const seenKey = new Set<string>();

  for (const [relPath, entry] of skyFiles.entries()) {
    if (!relPath.toLowerCase().endsWith('.properties')) continue;
    if (/(?:^|\/)(sun|moon_phases)\.properties$/i.test(relPath)) continue;

    const props: Record<string, string> = {};
    for (const rawLine of strFromU8(entry.bytes).split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('!')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      props[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }

    const weather = props.weather?.toLowerCase();
    const weatherScore = !weather || weather.split(/\s+/).includes('clear') ? 100 : 0;
    const noonScore = isNoonActive(parseHhMmMinutes(props.startFadeIn), parseHhMmMinutes(props.endFadeOut)) ? 50 : 0;
    const blend = props.blend?.toLowerCase();
    const blendScore = blend === 'replace' || blend === 'alpha' ? 10 : 0;
    const rootScore = relPath.toLowerCase().includes('/optifine/') ? 5 : 0;
    const score = 1000 + weatherScore + noonScore + blendScore + rootScore;

    for (const candRel of resolveSkySourceCandidates(relPath, props.source)) {
      const fromSky = skyFiles.get(candRel);
      const bytes = fromSky?.bytes ?? readPackFile(candRel);
      if (!bytes) continue;
      const dedupKey = `${candRel}::${relPath}`;
      if (seenKey.has(dedupKey)) continue;
      seenKey.add(dedupKey);
      candidates.push({
        relPath: candRel,
        sourcePath: fromSky?.sourcePath ?? candRel,
        bytes,
        score,
        propertiesRelPath: relPath,
      });
      break;
    }
  }

  const fallbackPriority = ['cloud1', 'day', 'sky', 'skybox', 'sky1', 'sky0', 'cloud2', 'starfield', 'night'];
  for (const [relPath, entry] of skyFiles.entries()) {
    if (!relPath.toLowerCase().endsWith('.png')) continue;
    const base = (relPath.split('/').pop() || '').toLowerCase();
    let bonus = 0;
    for (let i = 0; i < fallbackPriority.length; i++) {
      if (base.includes(fallbackPriority[i])) {
        bonus = (fallbackPriority.length - i) * 5;
        break;
      }
    }
    candidates.push({
      relPath,
      sourcePath: entry.sourcePath,
      bytes: entry.bytes,
      score: 100 + bonus + (relPath.toLowerCase().includes('/optifine/') ? 2 : 0),
    });
  }

  candidates.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.relPath.localeCompare(b.relPath)));

  for (const cand of candidates) {
    const decoded = await decodeSkyImage(cand.bytes);
    if (!decoded) continue;
    const sliced = sliceOptiFineSkyToBedrockCubemap(decoded);
    if (sliced) {
      return {
        files: sliced,
        selectedSourcePath: cand.sourcePath,
        selectedRelPath: cand.relPath,
        selectedPropertiesRelPath: cand.propertiesRelPath,
      };
    }
  }

  return null;
}

export async function composeBedrockCubemapToOptiFineSky(
  faces: Map<number, Uint8Array>,
  targetPackFormat: number
): Promise<{
  pngPath: string;
  pngBytes: Uint8Array;
  propertiesPath: string;
  propertiesContent: string;
} | null> {
  const decodedFaces = new Map<number, DecodedRgbaImage>();
  let maxSide = 0;

  for (const [idx, bytes] of faces.entries()) {
    if (idx < 0 || idx > 5) continue;
    const decoded = await decodeSkyImage(bytes);
    if (!decoded) continue;
    decodedFaces.set(idx, decoded);
    maxSide = Math.max(maxSide, decoded.width, decoded.height);
  }

  if (decodedFaces.size === 0 || maxSide <= 0) return null;

  const faceSize = Math.min(Math.floor(MAX_SKY_DIMENSION / 3), maxSide);
  const outW = faceSize * 3;
  const outH = faceSize * 2;
  const outRgba = new Uint8Array(outW * outH * 4);

  for (const [idx, src] of decodedFaces.entries()) {
    const spec = SKYBOX_TILE_SPEC[idx];
    const dstX0 = spec.col * faceSize;
    const dstY0 = spec.row * faceSize;

    for (let y = 0; y < faceSize; y++) {
      const ty = spec.rotate180 ? faceSize - 1 - y : y;
      const sy = Math.min(src.height - 1, Math.floor((ty * src.height) / faceSize));
      for (let x = 0; x < faceSize; x++) {
        const tx = spec.rotate180 ? faceSize - 1 - x : x;
        const sx = Math.min(src.width - 1, Math.floor((tx * src.width) / faceSize));
        const sIdx = (sy * src.width + sx) * 4;
        const dIdx = ((dstY0 + y) * outW + (dstX0 + x)) * 4;
        outRgba[dIdx] = src.rgba[sIdx];
        outRgba[dIdx + 1] = src.rgba[sIdx + 1];
        outRgba[dIdx + 2] = src.rgba[sIdx + 2];
        outRgba[dIdx + 3] = src.rgba[sIdx + 3];
      }
    }
  }

  const root = targetPackFormat <= 3 ? 'mcpatcher' : 'optifine';
  return {
    pngPath: `assets/minecraft/${root}/sky/world0/sky1.png`,
    pngBytes: encodeRgbaToPngSync(outW, outH, outRgba),
    propertiesPath: `assets/minecraft/${root}/sky/world0/sky1.properties`,
    propertiesContent: 'source=./sky1.png\nblend=alpha\nrotate=false\n',
  };
}
