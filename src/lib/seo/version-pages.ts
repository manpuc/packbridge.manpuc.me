import fs from 'node:fs';
import path from 'node:path';
import type { Language } from '@/lib/i18n/config';

export type BasePairKey =
  | '26.3.0_to_1.26.60'
  | '1.21.4_to_1.21.50'
  | '1.20.4_to_1.20.80'
  | '1.16.5_to_1.16.200';

export type PairDirection = 'java-to-bedrock' | 'bedrock-to-java';

export interface VersionPageSpec {
  /** Base pair key matching mapping JSON filename without .json */
  basePairKey: BasePairKey;
  /** Mapping file name in src/lib/pack/mappings/ */
  mappingFile: `${BasePairKey}.json`;
  /** Conversion direction */
  direction: PairDirection;
  /** URL slug for source version (e.g. '1.20.4') */
  slugFrom: string;
  /** URL slug for target version (e.g. '1.20.80') */
  slugTo: string;
  /** Combined URL param: `${slugFrom}-to-${slugTo}` */
  pairSlug: string;
  /** Java display version string (e.g. '1.21.4', '26.3.0') */
  javaDisplayVersion: string;
  /** Bedrock display version string (e.g. '1.21.50', '1.26.60') */
  bedrockDisplayVersion: string;
  /** Internal Java version ID in versions.ts (preserves analytics & pack_format buckets) */
  javaVersionId: string;
  /** Internal Bedrock version ID in versions.ts */
  bedrockVersionId: string;
  /** Display metadata for the facts table */
  javaPackFormat: number;
  bedrockMinEngineVersion: [number, number, number];
  /** Priority for sitemap & ordering */
  priority: number;
}

export interface MappingCounts {
  textures: number;
  sounds: number;
  lang: number;
  total: number;
}

interface BasePairConfig {
  basePairKey: BasePairKey;
  javaSlug: string;
  bedrockSlug: string;
  javaVersionId: string;
  bedrockVersionId: string;
  javaPackFormat: number;
  bedrockMinEngineVersion: [number, number, number];
}

const BASE_PAIRS: BasePairConfig[] = [
  {
    basePairKey: '26.3.0_to_1.26.60',
    javaSlug: '26.3',
    bedrockSlug: '26.6',
    javaVersionId: '26.3.0',
    bedrockVersionId: '1.26.60',
    javaPackFormat: 95,
    bedrockMinEngineVersion: [1, 26, 60],
  },
  {
    basePairKey: '1.21.4_to_1.21.50',
    javaSlug: '1.21.4',
    bedrockSlug: '1.21.5',
    javaVersionId: '1.21.4',
    bedrockVersionId: '1.21.50',
    javaPackFormat: 46,
    bedrockMinEngineVersion: [1, 21, 5],
  },
  {
    basePairKey: '1.20.4_to_1.20.80',
    javaSlug: '1.20.4',
    bedrockSlug: '1.20.8',
    javaVersionId: '1.20.3',
    bedrockVersionId: '1.20.80',
    javaPackFormat: 22,
    bedrockMinEngineVersion: [1, 20, 8],
  },
  {
    basePairKey: '1.16.5_to_1.16.200',
    javaSlug: '1.16.5',
    bedrockSlug: '1.16.2',
    javaVersionId: '1.16.2',
    bedrockVersionId: '1.16.0',
    javaPackFormat: 6,
    bedrockMinEngineVersion: [1, 16, 2],
  },
];

export const VERSION_PAGES: VersionPageSpec[] = BASE_PAIRS.flatMap((pair): VersionPageSpec[] => [
  {
    basePairKey: pair.basePairKey,
    mappingFile: `${pair.basePairKey}.json`,
    direction: 'java-to-bedrock',
    slugFrom: pair.javaSlug,
    slugTo: pair.bedrockSlug,
    pairSlug: `${pair.javaSlug}-to-${pair.bedrockSlug}`,
    javaDisplayVersion: pair.javaSlug,
    bedrockDisplayVersion: pair.bedrockSlug,
    javaVersionId: pair.javaVersionId,
    bedrockVersionId: pair.bedrockVersionId,
    javaPackFormat: pair.javaPackFormat,
    bedrockMinEngineVersion: pair.bedrockMinEngineVersion,
    priority: 0.8,
  },
  {
    basePairKey: pair.basePairKey,
    mappingFile: `${pair.basePairKey}.json`,
    direction: 'bedrock-to-java',
    slugFrom: pair.bedrockSlug,
    slugTo: pair.javaSlug,
    pairSlug: `${pair.bedrockSlug}-to-${pair.javaSlug}`,
    javaDisplayVersion: pair.javaSlug,
    bedrockDisplayVersion: pair.bedrockSlug,
    javaVersionId: pair.javaVersionId,
    bedrockVersionId: pair.bedrockVersionId,
    javaPackFormat: pair.javaPackFormat,
    bedrockMinEngineVersion: pair.bedrockMinEngineVersion,
    priority: 0.8,
  },
]);

export function getAllVersionPages(): VersionPageSpec[] {
  return VERSION_PAGES;
}

export function getVersionPage(direction: string, pairSlug: string): VersionPageSpec | undefined {
  return VERSION_PAGES.find(p => p.direction === direction && p.pairSlug === pairSlug);
}

const countsCache = new Map<string, MappingCounts>();

/**
 * Build-time helper to read mapping JSON counts via node:fs without bundling JSON into client JS.
 */
export function getMappingCounts(spec: VersionPageSpec): MappingCounts {
  const cacheKey = `${spec.mappingFile}:${spec.direction}`;
  const cached = countsCache.get(cacheKey);
  if (cached) return cached;

  const filePath = path.resolve(process.cwd(), 'src/lib/pack/mappings', spec.mappingFile);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, Record<string, string>>;

  const isJ2B = spec.direction === 'java-to-bedrock';
  const textures = Object.keys(data[isJ2B ? 'java_to_bedrock' : 'bedrock_to_java'] ?? {}).length;
  const sounds = Object.keys(data[isJ2B ? 'sounds_java_to_bedrock' : 'sounds_bedrock_to_java'] ?? {}).length;
  const lang = Object.keys(data[isJ2B ? 'lang_java_to_bedrock' : 'lang_bedrock_to_java'] ?? {}).length;

  const result: MappingCounts = {
    textures,
    sounds,
    lang,
    total: textures + sounds + lang,
  };
  countsCache.set(cacheKey, result);
  return result;
}

export function getRelatedVersionPages(spec: VersionPageSpec): {
  reversePair: VersionPageSpec | undefined;
  sameDirectionPairs: VersionPageSpec[];
} {
  const reversePair = VERSION_PAGES.find(
    p => p.basePairKey === spec.basePairKey && p.direction !== spec.direction
  );
  const sameDirectionPairs = VERSION_PAGES.filter(
    p => p.direction === spec.direction && p.basePairKey !== spec.basePairKey
  );
  return { reversePair, sameDirectionPairs };
}

export function getVersionPageHref(lang: Language, spec: VersionPageSpec): string {
  const prefix = lang === 'ja' ? '' : `/${lang}`;
  return `${prefix}/convert/${spec.direction}/${spec.pairSlug}`;
}

export function getConvertHubHref(lang: Language): string {
  return lang === 'ja' ? '/convert' : `/${lang}/convert`;
}

