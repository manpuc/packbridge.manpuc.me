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

export type ConversionDirection = 'java-to-bedrock' | 'bedrock-to-java';

export interface ConversionOptions {
  direction: ConversionDirection;
  javaVersionId?: string;
  bedrockVersionId?: string;
}
