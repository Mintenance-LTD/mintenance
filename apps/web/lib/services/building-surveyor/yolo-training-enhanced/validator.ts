/**
 * Training data validation
 */

import { logger } from '@mintenance/shared';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SERVICE = 'YOLOTrainingDataEnhanced';

/**
 * Validate training data quality
 */
export async function validateTrainingData(
  datasetPath: string
): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    totalImages: number;
    totalLabels: number;
    imagesWithoutLabels: string[];
    labelsWithoutImages: string[];
    corruptedImages: string[];
    invalidLabels: string[];
  };
}> {
  const issues: string[] = [];
  const stats = {
    totalImages: 0,
    totalLabels: 0,
    imagesWithoutLabels: [] as string[],
    labelsWithoutImages: [] as string[],
    corruptedImages: [] as string[],
    invalidLabels: [] as string[],
  };

  try {
    // Check train/val/test directories
    const splits = ['train', 'val', 'test'];

    for (const split of splits) {
      const imagesDir = join(datasetPath, split, 'images');
      const labelsDir = join(datasetPath, split, 'labels');

      if (!existsSync(imagesDir)) {
        issues.push(`Missing images directory: ${imagesDir}`);
        continue;
      }

      if (!existsSync(labelsDir)) {
        issues.push(`Missing labels directory: ${labelsDir}`);
        continue;
      }

      const images = readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      const labels = readdirSync(labelsDir).filter(f => f.endsWith('.txt'));

      stats.totalImages += images.length;
      stats.totalLabels += labels.length;

      // Check for matching image-label pairs
      images.forEach(img => {
        const labelName = img.replace(/\.(jpg|jpeg|png)$/i, '.txt');
        if (!labels.includes(labelName)) {
          stats.imagesWithoutLabels.push(join(split, 'images', img));
        }
      });

      labels.forEach(lbl => {
        const imageName = lbl.replace('.txt', '');
        const hasImage = images.some(img =>
          img.replace(/\.(jpg|jpeg|png)$/i, '') === imageName
        );
        if (!hasImage) {
          stats.labelsWithoutImages.push(join(split, 'labels', lbl));
        }
      });
    }

    // Check data.yaml exists
    const dataYamlPath = join(datasetPath, 'data.yaml');
    if (!existsSync(dataYamlPath)) {
      issues.push('Missing data.yaml configuration file');
    }

    const valid = issues.length === 0 &&
      stats.imagesWithoutLabels.length === 0 &&
      stats.labelsWithoutImages.length === 0;

    return {
      valid,
      issues,
      stats,
    };
  } catch (error) {
    logger.error('Failed to validate training data', {
      service: SERVICE,
      datasetPath,
      error,
    });

    return {
      valid: false,
      issues: ['Failed to validate dataset: ' + error],
      stats,
    };
  }
}
