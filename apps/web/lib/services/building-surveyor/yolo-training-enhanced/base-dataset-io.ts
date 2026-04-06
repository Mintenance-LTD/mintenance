/**
 * Base dataset scanning and copying
 */

import { logger } from '@mintenance/shared';
import { existsSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import type { BaseDatasetPaths } from './types';

const SERVICE = 'YOLOTrainingDataEnhanced';

/**
 * Get actual base dataset paths by scanning the directory
 */
export function getBaseDatasetPaths(basePath: string): BaseDatasetPaths {
  // Check if base dataset directory exists
  if (!existsSync(basePath)) {
    logger.warn('Base dataset directory not found', {
      service: SERVICE,
      basePath,
    });

    return {
      trainImages: [],
      trainLabels: [],
      valImages: [],
      valLabels: [],
      testImages: [],
      testLabels: [],
    };
  }

  try {
    // Read actual files from directories
    const trainImagesDir = join(basePath, 'train', 'images');
    const trainLabelsDir = join(basePath, 'train', 'labels');
    const valImagesDir = join(basePath, 'valid', 'images');
    const valLabelsDir = join(basePath, 'valid', 'labels');
    const testImagesDir = join(basePath, 'test', 'images');
    const testLabelsDir = join(basePath, 'test', 'labels');

    const trainImages = existsSync(trainImagesDir)
      ? readdirSync(trainImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      : [];
    const trainLabels = existsSync(trainLabelsDir)
      ? readdirSync(trainLabelsDir).filter(f => f.endsWith('.txt'))
      : [];
    const valImages = existsSync(valImagesDir)
      ? readdirSync(valImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      : [];
    const valLabels = existsSync(valLabelsDir)
      ? readdirSync(valLabelsDir).filter(f => f.endsWith('.txt'))
      : [];
    const testImages = existsSync(testImagesDir)
      ? readdirSync(testImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      : [];
    const testLabels = existsSync(testLabelsDir)
      ? readdirSync(testLabelsDir).filter(f => f.endsWith('.txt'))
      : [];

    logger.info('Loaded base dataset paths', {
      service: SERVICE,
      basePath,
      trainImages: trainImages.length,
      trainLabels: trainLabels.length,
      valImages: valImages.length,
      valLabels: valLabels.length,
      testImages: testImages.length,
      testLabels: testLabels.length,
    });

    return {
      trainImages,
      trainLabels,
      valImages,
      valLabels,
      testImages,
      testLabels,
    };
  } catch (error) {
    logger.error('Failed to read base dataset', {
      service: SERVICE,
      basePath,
      error,
    });

    return {
      trainImages: [],
      trainLabels: [],
      valImages: [],
      valLabels: [],
      testImages: [],
      testLabels: [],
    };
  }
}

/**
 * Copy base dataset files to output directory
 */
export function copyBaseDataset(
  baseDatasetPath: string,
  outputDir: string,
  baseDataset: BaseDatasetPaths
): void {
  // Copy train files
  baseDataset.trainImages.forEach(img => {
    const src = join(baseDatasetPath, 'train', 'images', img);
    const dest = join(outputDir, 'train', 'images', `base_${img}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });

  baseDataset.trainLabels.forEach(lbl => {
    const src = join(baseDatasetPath, 'train', 'labels', lbl);
    const dest = join(outputDir, 'train', 'labels', `base_${lbl}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });

  // Copy val files
  baseDataset.valImages.forEach(img => {
    const src = join(baseDatasetPath, 'valid', 'images', img);
    const dest = join(outputDir, 'val', 'images', `base_${img}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });

  baseDataset.valLabels.forEach(lbl => {
    const src = join(baseDatasetPath, 'valid', 'labels', lbl);
    const dest = join(outputDir, 'val', 'labels', `base_${lbl}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });

  // Copy test files
  baseDataset.testImages.forEach(img => {
    const src = join(baseDatasetPath, 'test', 'images', img);
    const dest = join(outputDir, 'test', 'images', `base_${img}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });

  baseDataset.testLabels.forEach(lbl => {
    const src = join(baseDatasetPath, 'test', 'labels', lbl);
    const dest = join(outputDir, 'test', 'labels', `base_${lbl}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  });
}
