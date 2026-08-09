export type PackType = 'java' | 'bedrock';

export interface ConversionResult {
  filename: string;
  status: 'converted' | 'skipped' | 'error';
  reason?: string;
  outputPath?: string;
}

export interface PackReport {
  totalFiles: number;
  convertedCount: number;
  skippedCount: number;
  errorCount: number;
  details: ConversionResult[];
}

export type ConversionDirection = 'java-to-bedrock' | 'bedrock-to-java' | 'java-to-java' | 'bedrock-to-bedrock';

export interface ConversionOptions {
  direction: ConversionDirection;
  javaVersionId?: string;
  bedrockVersionId?: string;
  enableGuiConversion: boolean;
  enableAnimationConversion: boolean;
  enableLanguageConversion: boolean;
  enableSoundConversion: boolean;
}
