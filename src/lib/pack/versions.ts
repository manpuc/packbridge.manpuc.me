export interface JavaVersion {
  id: string;
  name: string;
  packFormat: number;
}

export interface BedrockVersion {
  id: string;
  name: string;
  minEngineVersion: [number, number, number];
}

export const JAVA_VERSIONS: JavaVersion[] = [
  { id: '1.26.0', name: '1.26.x', packFormat: 64 },
  { id: '1.25.0', name: '1.25.x', packFormat: 58 },
  { id: '1.24.0', name: '1.24.x', packFormat: 54 },
  { id: '1.23.0', name: '1.23.x', packFormat: 52 },
  { id: '1.22.0', name: '1.22.x', packFormat: 50 },
  { id: '1.21.4', name: '1.21.4+', packFormat: 48 },
  { id: '1.21.2', name: '1.21.2 - 1.21.3', packFormat: 46 },
  { id: '1.21.0', name: '1.21.0 - 1.21.1', packFormat: 34 },
  { id: '1.20.5', name: '1.20.5 - 1.20.6', packFormat: 32 },
  { id: '1.20.3', name: '1.20.3 - 1.20.4', packFormat: 22 },
  { id: '1.20.2', name: '1.20.2', packFormat: 18 },
  { id: '1.20.0', name: '1.20.0 - 1.20.1', packFormat: 15 },
  { id: '1.19.4', name: '1.19.4', packFormat: 13 },
  { id: '1.19.0', name: '1.19.0 - 1.19.3', packFormat: 12 },
  { id: '1.18.2', name: '1.18.2', packFormat: 9 },
  { id: '1.18.0', name: '1.18.0 - 1.18.1', packFormat: 8 },
  { id: '1.17.0', name: '1.17.x', packFormat: 7 },
  { id: '1.16.2', name: '1.16.2 - 1.16.5', packFormat: 6 },
  { id: '1.16.0', name: '1.16.0 - 1.16.1', packFormat: 5 },
  { id: '1.15.0', name: '1.15.x', packFormat: 5 },
  { id: '1.14.0', name: '1.14.x', packFormat: 4 },
  { id: '1.13.0', name: '1.13.x', packFormat: 4 },
  { id: '1.12.2', name: '1.12.x', packFormat: 3 },
  { id: '1.11.0', name: '1.11.x', packFormat: 3 },
  { id: '1.10.0', name: '1.10.x', packFormat: 2 },
  { id: '1.9.0', name: '1.9.x', packFormat: 2 },
  { id: '1.8.0', name: '1.8.x', packFormat: 1 },
];

export const BEDROCK_VERSIONS: BedrockVersion[] = [
  { id: '1.26.0', name: '1.26.0+', minEngineVersion: [1, 26, 0] },
  { id: '1.25.0', name: '1.25.0+', minEngineVersion: [1, 25, 0] },
  { id: '1.24.0', name: '1.24.0+', minEngineVersion: [1, 24, 0] },
  { id: '1.23.0', name: '1.23.0+', minEngineVersion: [1, 23, 0] },
  { id: '1.22.0', name: '1.22.0+', minEngineVersion: [1, 22, 0] },
  { id: '1.21.50', name: '1.21.50+', minEngineVersion: [1, 21, 50] },
  { id: '1.21.0', name: '1.21.0', minEngineVersion: [1, 21, 0] },
  { id: '1.20.80', name: '1.20.80', minEngineVersion: [1, 20, 80] },
  { id: '1.20.50', name: '1.20.50', minEngineVersion: [1, 20, 50] },
  { id: '1.20.0', name: '1.20.0', minEngineVersion: [1, 20, 0] },
  { id: '1.19.0', name: '1.19.0', minEngineVersion: [1, 19, 0] },
  { id: '1.18.0', name: '1.18.0', minEngineVersion: [1, 18, 0] },
  { id: '1.17.0', name: '1.17.0', minEngineVersion: [1, 17, 0] },
  { id: '1.16.0', name: '1.16.0', minEngineVersion: [1, 16, 0] },
  { id: '1.14.0', name: '1.14.0', minEngineVersion: [1, 14, 0] },
  { id: '1.12.0', name: '1.12.0', minEngineVersion: [1, 12, 0] },
];

export function getJavaVersionByPackFormat(format: number): string | null {
  const match = JAVA_VERSIONS.find(v => v.packFormat === format);
  return match ? match.id : null;
}

export function getBedrockVersionByEngineVersion(version: number[]): string | null {
  if (!version || version.length < 3) return null;
  const match = BEDROCK_VERSIONS.find(v => v.minEngineVersion[0] === version[0] && v.minEngineVersion[1] === version[1] && v.minEngineVersion[2] === version[2]);
  return match ? match.id : null;
}
