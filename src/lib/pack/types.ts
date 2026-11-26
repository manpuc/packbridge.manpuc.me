export type PackType = 'java' | 'bedrock';

export interface ConversionResult {
  filename: string;
  status: 'converted' | 'skipped' | 'error';
  warning?: boolean;
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
  sourceJavaVersionId?: string;
  sourceBedrockVersionId?: string;
  enableGuiConversion: boolean;
  enableModernGuiSprites?: boolean;
  enableAudioReencode: boolean;
  enableModelConversion?: boolean;
  enablePbrConversion?: boolean;
}
