import type { ConversionOptions, PackReport } from './types';

export class WorkerPool {
  private poolSize: number;
  private workers: Worker[] = [];

  constructor(poolSize?: number) {
    this.poolSize = poolSize || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4);
  }

  public getHardwareConcurrency(): number {
    return this.poolSize;
  }
}
