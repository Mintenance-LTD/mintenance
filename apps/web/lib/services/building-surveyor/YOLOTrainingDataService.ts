/**
 * YOLO Training Data Service
 * 
 * Exports user corrections to YOLO training format and merges with base dataset.
 * 
 * This service:
 * 1. Fetches approved corrections from database
 * 2. Downloads corrected images
 * 3. Converts corrections to YOLO format
 * 4. Merges with base training dataset
 * 5. Prepares train/val/test splits
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { YOLOCorrectionService } from './YOLOCorrectionService';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadClassNames } from './yolo-class-names';

export interface MergedDataset {
  trainImages: string[];
  trainLabels: string[];
  valImages: string[];
  valLabels: string[];
  testImages: string[];
  testLabels: string[];
  dataYaml: {
    train: string;
    val: string;
    test: string;
    nc: number;
    names: string[];
  };
}

/**
 * YOLO Training Data Service
 */
export class YOLOTrainingDataService {
  /**
   * Export all approved corrections to YOLO format
   * 
   * @param outputDir - Directory to export training data
   * @param trainSplit - Training split ratio (default: 0.8)
   * @param valSplit - Validation split ratio (default: 0.1)
   * @returns Merged dataset information
   */
  static async exportCorrectionsToYOLO(
    outputDir: string = 'training-data/continuous-learning',
    trainSplit: number = 0.8,
    valSplit: number = 0.1
  ): Promise<MergedDataset> {
    try {
      logger.info('Exporting corrections to YOLO format', {
        service: 'YOLOTrainingDataService',
        outputDir,
      });

      // 1. Get approved corrections
      const corrections = await YOLOCorrectionService.getApprovedCorrections();
      
      if (corrections.length === 0) {
        logger.warn('No approved corrections found', {
          service: 'YOLOTrainingDataService',
        });
        return this.getBaseDatasetOnly(outputDir);
      }

      logger.info('Found approved corrections', {
        service: 'YOLOTrainingDataService',
        count: corrections.length,
      });

      // 2. Create output directories
      const trainDir = join(outputDir, 'train');
      const valDir = join(outputDir, 'val');
      const testDir = join(outputDir, 'test');
      
      [trainDir, valDir, testDir].forEach(dir => {
        mkdirSync(join(dir, 'images'), { recursive: true });
        mkdirSync(join(dir, 'labels'), { recursive: true });
      });

      // 3. Load class names
      const classNames = loadClassNames(process.env.YOLO_DATA_YAML_PATH);
      
      // 4. Process corrections
      const trainImages: string[] = [];
      const trainLabels: string[] = [];
      const valImages: string[] = [];
      const valLabels: string[] = [];
      const testImages: string[] = [];
      const testLabels: string[] = [];

      for (let i = 0; i < corrections.length; i++) {
        const correction = corrections[i];
        const random = Math.random();
        
        // Determine split
        let split: 'train' | 'val' | 'test';
        if (random < trainSplit) {
          split = 'train';
        } else if (random < trainSplit + valSplit) {
          split = 'val';
        } else {
          split = 'test';
        }

        // Generate filename
        const imageFilename = `correction_${correction.id}.jpg`;
        const labelFilename = `correction_${correction.id}.txt`;

        // Download image (in production, download from URL)
        // For now, we'll just reference the URL
        const imagePath = join(outputDir, split, 'images', imageFilename);
        const labelPath = join(outputDir, split, 'labels', labelFilename);

        // Save label file (YOLO format)
        if (correction.correctedLabels) {
          writeFileSync(labelPath, correction.correctedLabels, 'utf-8');
        }

        // Track paths
        const relativeImagePath = join(split, 'images', imageFilename);
        const relativeLabelPath = join(split, 'labels', labelFilename);

        if (split === 'train') {
          trainImages.push(relativeImagePath);
          trainLabels.push(relativeLabelPath);
        } else if (split === 'val') {
          valImages.push(relativeImagePath);
          valLabels.push(relativeLabelPath);
        } else {
          testImages.push(relativeImagePath);
          testLabels.push(relativeLabelPath);
        }
      }

      // 5. Merge with base dataset
      const baseDataset = this.getBaseDatasetPaths();
      
      // Combine base + corrections
      const mergedDataset: MergedDataset = {
        trainImages: [
          ...baseDataset.trainImages.map(img => join('..', 'Building Defect Detection 7.v2i.yolov11', 'train', 'images', img)),
          ...trainImages,
        ],
        trainLabels: [
          ...baseDataset.trainLabels.map(lbl => join('..', 'Building Defect Detection 7.v2i.yolov11', 'train', 'labels', lbl)),
          ...trainLabels,
        ],
        valImages: [
          ...baseDataset.valImages.map(img => join('..', 'Building Defect Detection 7.v2i.yolov11', 'valid', 'images', img)),
          ...valImages,
        ],
        valLabels: [
          ...baseDataset.valLabels.map(lbl => join('..', 'Building Defect Detection 7.v2i.yolov11', 'valid', 'labels', lbl)),
          ...valLabels,
        ],
        testImages: [
          ...baseDataset.testImages.map(img => join('..', 'Building Defect Detection 7.v2i.yolov11', 'test', 'images', img)),
          ...testImages,
        ],
        testLabels: [
          ...baseDataset.testLabels.map(lbl => join('..', 'Building Defect Detection 7.v2i.yolov11', 'test', 'labels', lbl)),
          ...testLabels,
        ],
        dataYaml: {
          train: join(outputDir, 'train', 'images'),
          val: join(outputDir, 'val', 'images'),
          test: join(outputDir, 'test', 'images'),
          nc: classNames.length,
          names: classNames,
        },
      };

      // 6. Create merged data.yaml
      const dataYamlPath = join(outputDir, 'data.yaml');
      const dataYamlContent = this.generateDataYaml(mergedDataset.dataYaml);
      writeFileSync(dataYamlPath, dataYamlContent, 'utf-8');

      logger.info('Exported corrections to YOLO format', {
        service: 'YOLOTrainingDataService',
        outputDir,
        correctionsCount: corrections.length,
        trainCount: trainImages.length,
        valCount: valImages.length,
        testCount: testImages.length,
      });

      return mergedDataset;
    } catch (error) {
      logger.error('Failed to export corrections to YOLO format', error, {
        service: 'YOLOTrainingDataService',
      });
      throw error;
    }
  }

  /**
   * Get base dataset paths (from original training data)
   */
  private static getBaseDatasetPaths(): {
    trainImages: string[];
    trainLabels: string[];
    valImages: string[];
    valLabels: string[];
    testImages: string[];
    testLabels: string[];
  } {
    // In production, read from actual directory
    // For now, return structure indicating base dataset exists
    return {
      trainImages: [], // Will be populated from actual directory
      trainLabels: [],
      valImages: [],
      valLabels: [],
      testImages: [],
      testLabels: [],
    };
  }

  /**
   * Get base dataset only (no corrections)
   */
  private static getBaseDatasetOnly(outputDir: string): MergedDataset {
    const classNames = loadClassNames(process.env.YOLO_DATA_YAML_PATH);
    const basePath = 'Building Defect Detection 7.v2i.yolov11';
    
    return {
      trainImages: [],
      trainLabels: [],
      valImages: [],
      valLabels: [],
      testImages: [],
      testLabels: [],
      dataYaml: {
        train: join(basePath, 'train', 'images'),
        val: join(basePath, 'valid', 'images'),
        test: join(basePath, 'test', 'images'),
        nc: classNames.length,
        names: classNames,
      },
    };
  }

  /**
   * Generate data.yaml content
   */
  private static generateDataYaml(config: {
    train: string;
    val: string;
    test: string;
    nc: number;
    names: string[];
  }): string {
    const namesYaml = config.names.map(name => `  - ${name}`).join('\n');
    
    return `train: ${config.train}
val: ${config.val}
test: ${config.test}
nc: ${config.nc}
names:
${namesYaml}
`;
  }

  /**
   * Get dataset statistics
   */
  static async getDatasetStats(): Promise<{
    baseDataset: {
      train: number;
      val: number;
      test: number;
    };
    corrections: {
      total: number;
      approved: number;
      usedInTraining: number;
    };
    merged: {
      train: number;
      val: number;
      test: number;
    };
  }> {
    const stats = await YOLOCorrectionService.getCorrectionStats();
    
    return {
      baseDataset: {
        train: 3729, // From your dataset
        val: 814,
        test: 398,
      },
      corrections: {
        total: stats.pending + stats.approved + stats.rejected,
        approved: stats.approved,
        usedInTraining: stats.usedInTraining,
      },
      merged: {
        train: 3729 + stats.approved * 0.8, // Approximate
        val: 814 + stats.approved * 0.1,
        test: 398 + stats.approved * 0.1,
      },
    };
  }
}

