/**
 * Types for YOLOTrainingDataEnhanced
 */

export interface EnhancedDataset {
  trainImages: string[];
  trainLabels: string[];
  valImages: string[];
  valLabels: string[];
  testImages: string[];
  testLabels: string[];
  dataYaml: {
    path: string;
    train: string;
    val: string;
    test: string;
    nc: number;
    names: string[];
  };
  stats: {
    baseDataset: {
      train: number;
      val: number;
      test: number;
    };
    corrections: {
      train: number;
      val: number;
      test: number;
    };
    total: {
      train: number;
      val: number;
      test: number;
    };
  };
}

export interface TrainingDataOptions {
  outputDir?: string;
  trainSplit?: number;
  valSplit?: number;
  downloadImages?: boolean;
  includeBaseDataset?: boolean;
  includeSAM3Masks?: boolean;
  maxCorrections?: number;
  baseDatasetPath?: string;
}

export interface BaseDatasetPaths {
  trainImages: string[];
  trainLabels: string[];
  valImages: string[];
  valLabels: string[];
  testImages: string[];
  testLabels: string[];
}
