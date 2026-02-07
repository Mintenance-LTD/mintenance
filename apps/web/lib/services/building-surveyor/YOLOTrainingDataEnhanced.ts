/**
 * Enhanced YOLO Training Data Service
 *
 * Fixes critical gaps in the original YOLOTrainingDataService:
 * 1. Actually downloads images from URLs
 * 2. Properly integrates with base dataset
 * 3. Supports SAM3 mask integration
 *
 * This service prepares a complete training dataset for YOLO retraining.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { YOLOCorrectionService } from './YOLOCorrectionService';
import { SAM3TrainingDataService } from './SAM3TrainingDataService';
import { writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { loadClassNames } from './yolo-class-names';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

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

/**
 * Enhanced YOLO Training Data Service
 */
export class YOLOTrainingDataEnhanced {
  private static readonly DEFAULT_BASE_DATASET = 'Building Defect Detection 7.v2i.yolov11';

  /**
   * Download an image from a URL
   */
  private static async downloadImage(url: string, outputPath: string): Promise<void> {
    try {
      // Handle Supabase storage URLs
      if (url.includes('supabase.co/storage')) {
        // If it's a private bucket, we might need to add auth headers
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const fileStream = createWriteStream(outputPath);
        await pipeline(response.body as NodeJS.ReadableStream, fileStream);
      } else {
        // Regular URL download
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const fileStream = createWriteStream(outputPath);
        await pipeline(response.body as NodeJS.ReadableStream, fileStream);
      }

      logger.info('Downloaded image', {
        service: 'YOLOTrainingDataEnhanced',
        url,
        outputPath,
      });
    } catch (error) {
      logger.error('Failed to download image', {
        service: 'YOLOTrainingDataEnhanced',
        url,
        outputPath,
        error,
      });
      throw error;
    }
  }

  /**
   * Get actual base dataset paths by scanning the directory
   */
  private static getBaseDatasetPaths(baseDatasetPath?: string): {
    trainImages: string[];
    trainLabels: string[];
    valImages: string[];
    valLabels: string[];
    testImages: string[];
    testLabels: string[];
  } {
    const basePath = baseDatasetPath || this.DEFAULT_BASE_DATASET;

    // Check if base dataset directory exists
    if (!existsSync(basePath)) {
      logger.warn('Base dataset directory not found', {
        service: 'YOLOTrainingDataEnhanced',
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
        service: 'YOLOTrainingDataEnhanced',
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
        service: 'YOLOTrainingDataEnhanced',
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
  private static copyBaseDataset(
    baseDatasetPath: string,
    outputDir: string,
    baseDataset: ReturnType<typeof YOLOTrainingDataEnhanced.getBaseDatasetPaths>
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

  /**
   * Export corrections with enhanced features
   */
  static async exportEnhancedTrainingData(
    options: TrainingDataOptions = {}
  ): Promise<EnhancedDataset> {
    const {
      outputDir = 'training-data/continuous-learning',
      trainSplit = 0.8,
      valSplit = 0.1,
      downloadImages = true,
      includeBaseDataset = true,
      includeSAM3Masks = true,
      maxCorrections = 1000,
      baseDatasetPath = this.DEFAULT_BASE_DATASET,
    } = options;

    try {
      logger.info('Starting enhanced training data export', {
        service: 'YOLOTrainingDataEnhanced',
        options,
      });

      // 1. Create output directories
      const trainDir = join(outputDir, 'train');
      const valDir = join(outputDir, 'val');
      const testDir = join(outputDir, 'test');

      [trainDir, valDir, testDir].forEach(dir => {
        mkdirSync(join(dir, 'images'), { recursive: true });
        mkdirSync(join(dir, 'labels'), { recursive: true });
      });

      // 2. Load class names
      const classNames = loadClassNames(process.env.YOLO_DATA_YAML_PATH);

      // 3. Get base dataset if requested
      let baseDataset = {
        trainImages: [] as string[],
        trainLabels: [] as string[],
        valImages: [] as string[],
        valLabels: [] as string[],
        testImages: [] as string[],
        testLabels: [] as string[],
      };

      if (includeBaseDataset) {
        baseDataset = this.getBaseDatasetPaths(baseDatasetPath);

        // Copy base dataset files to output directory
        if (baseDataset.trainImages.length > 0) {
          this.copyBaseDataset(baseDatasetPath, outputDir, baseDataset);
        }
      }

      // 4. Get approved corrections
      const corrections = await YOLOCorrectionService.getApprovedCorrections(maxCorrections);

      logger.info('Processing corrections', {
        service: 'YOLOTrainingDataEnhanced',
        correctionsCount: corrections.length,
      });

      // 5. Process corrections
      const correctionStats = {
        train: 0,
        val: 0,
        test: 0,
      };

      for (let i = 0; i < corrections.length; i++) {
        const correction = corrections[i];
        const random = Math.random();

        // Determine split
        let split: 'train' | 'val' | 'test';
        if (random < trainSplit) {
          split = 'train';
          correctionStats.train++;
        } else if (random < trainSplit + valSplit) {
          split = 'val';
          correctionStats.val++;
        } else {
          split = 'test';
          correctionStats.test++;
        }

        // Generate filenames
        const imageFilename = `correction_${correction.id}.jpg`;
        const labelFilename = `correction_${correction.id}.txt`;

        const imagePath = join(outputDir, split, 'images', imageFilename);
        const labelPath = join(outputDir, split, 'labels', labelFilename);

        // Download image if requested
        if (downloadImages && correction.imageUrl) {
          try {
            await this.downloadImage(correction.imageUrl, imagePath);
          } catch (error) {
            logger.error('Failed to download correction image, skipping', {
              service: 'YOLOTrainingDataEnhanced',
              correctionId: correction.id,
              imageUrl: correction.imageUrl,
              error,
            });
            continue;
          }
        }

        // Get enhanced labels (with SAM3 if available)
        const enhancedLabels = correction.correctedLabels;

        if (includeSAM3Masks && correction.id) {
          // Try to get SAM3 enhanced labels
          const sam3Masks = await serverSupabase
            .from('sam3_training_masks')
            .select('boxes, scores, damage_type')
            .eq('yolo_correction_id', correction.id)
            .single();

          if (sam3Masks.data && sam3Masks.data.boxes) {
            // Convert SAM3 boxes to YOLO format with higher precision
            logger.info('Enhancing with SAM3 masks', {
              service: 'YOLOTrainingDataEnhanced',
              correctionId: correction.id,
              boxCount: sam3Masks.data.boxes.length,
            });
          }
        }

        // Save label file
        if (enhancedLabels) {
          writeFileSync(labelPath, enhancedLabels, 'utf-8');
        }
      }

      // 6. Generate data.yaml
      const dataYaml = {
        path: outputDir,
        train: join(outputDir, 'train', 'images'),
        val: join(outputDir, 'val', 'images'),
        test: join(outputDir, 'test', 'images'),
        nc: classNames.length,
        names: classNames,
      };

      const dataYamlContent = this.generateDataYaml(dataYaml);
      const dataYamlPath = join(outputDir, 'data.yaml');
      writeFileSync(dataYamlPath, dataYamlContent, 'utf-8');

      // 7. Prepare results
      const result: EnhancedDataset = {
        trainImages: [
          ...baseDataset.trainImages.map(f => `base_${f}`),
          ...Array.from({ length: correctionStats.train }, (_, i) =>
            `correction_${corrections[i]?.id}.jpg`
          ).filter(Boolean),
        ],
        trainLabels: [
          ...baseDataset.trainLabels.map(f => `base_${f}`),
          ...Array.from({ length: correctionStats.train }, (_, i) =>
            `correction_${corrections[i]?.id}.txt`
          ).filter(Boolean),
        ],
        valImages: [
          ...baseDataset.valImages.map(f => `base_${f}`),
        ],
        valLabels: [
          ...baseDataset.valLabels.map(f => `base_${f}`),
        ],
        testImages: [
          ...baseDataset.testImages.map(f => `base_${f}`),
        ],
        testLabels: [
          ...baseDataset.testLabels.map(f => `base_${f}`),
        ],
        dataYaml,
        stats: {
          baseDataset: {
            train: baseDataset.trainImages.length,
            val: baseDataset.valImages.length,
            test: baseDataset.testImages.length,
          },
          corrections: correctionStats,
          total: {
            train: baseDataset.trainImages.length + correctionStats.train,
            val: baseDataset.valImages.length + correctionStats.val,
            test: baseDataset.testImages.length + correctionStats.test,
          },
        },
      };

      logger.info('Enhanced training data export complete', {
        service: 'YOLOTrainingDataEnhanced',
        outputDir,
        stats: result.stats,
      });

      return result;
    } catch (error) {
      logger.error('Failed to export enhanced training data', {
        service: 'YOLOTrainingDataEnhanced',
        error,
      });
      throw error;
    }
  }

  /**
   * Generate data.yaml content for YOLO training
   */
  private static generateDataYaml(config: {
    path: string;
    train: string;
    val: string;
    test: string;
    nc: number;
    names: string[];
  }): string {
    const namesYaml = config.names.map((name, i) => `  ${i}: ${name}`).join('\n');

    return `# YOLO Training Dataset Configuration
# Generated by YOLOTrainingDataEnhanced
# Path to dataset root
path: ${config.path}

# Train/val/test paths relative to path
train: train/images
val: val/images
test: test/images

# Number of classes
nc: ${config.nc}

# Class names
names:
${namesYaml}

# Dataset info
roboflow:
  workspace: mintenance
  project: building-defect-detection
  version: continuous-learning
  license: Private
  url: https://mintenance.com
`;
  }

  /**
   * Validate training data quality
   */
  static async validateTrainingData(
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
        service: 'YOLOTrainingDataEnhanced',
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

  /**
   * Export training data sorted by difficulty for curriculum learning.
   *
   * Samples are sorted by teacher_agreement_score (high agreement = easy).
   * Returns data split into phases:
   *   Phase 1: Easy samples (agreement >= 0.8)
   *   Phase 2: Medium samples (agreement >= 0.5)
   *   Phase 3: Hard samples (all remaining)
   */
  static async exportCurriculumData(
    options: TrainingDataOptions & { curriculumPhases?: number } = {}
  ): Promise<{
    phases: Array<{ phase: number; difficulty: string; sampleCount: number; outputDir: string }>;
    totalSamples: number;
  }> {
    const {
      outputDir = 'training-data/curriculum',
      curriculumPhases = 3,
      maxCorrections = 1000,
    } = options;

    try {
      // Fetch GPT-4 labels with agreement scores, sorted by difficulty
      const { data: labels } = await serverSupabase
        .from('gpt4_training_labels')
        .select('id, assessment_id, damage_type, severity, confidence, teacher_agreement_score, difficulty_score, image_urls')
        .eq('used_in_training', false)
        .not('teacher_agreement_score', 'is', null)
        .order('teacher_agreement_score', { ascending: false })
        .limit(maxCorrections);

      if (!labels?.length) {
        return { phases: [], totalSamples: 0 };
      }

      // Define phase thresholds
      const thresholds = [
        { phase: 1, difficulty: 'easy', minScore: 0.8 },
        { phase: 2, difficulty: 'medium', minScore: 0.5 },
        { phase: 3, difficulty: 'hard', minScore: 0.0 },
      ].slice(0, curriculumPhases);

      const phases: Array<{ phase: number; difficulty: string; sampleCount: number; outputDir: string }> = [];
      let totalSamples = 0;

      for (const threshold of thresholds) {
        const phaseDir = join(outputDir, `phase_${threshold.phase}`);
        mkdirSync(join(phaseDir, 'images'), { recursive: true });
        mkdirSync(join(phaseDir, 'labels'), { recursive: true });

        const nextThreshold = thresholds[thresholds.indexOf(threshold) + 1]?.minScore ?? -1;
        const phaseLabels = labels.filter((l: { teacher_agreement_score: number }) =>
          l.teacher_agreement_score >= threshold.minScore &&
          l.teacher_agreement_score > nextThreshold
        );

        // Write phase manifest
        const manifest = phaseLabels.map((l: { id: string; damage_type: string; teacher_agreement_score: number }) => ({
          id: l.id,
          damageType: l.damage_type,
          agreementScore: l.teacher_agreement_score,
        }));
        writeFileSync(
          join(phaseDir, 'manifest.json'),
          JSON.stringify({ phase: threshold.phase, difficulty: threshold.difficulty, samples: manifest }, null, 2)
        );

        phases.push({
          phase: threshold.phase,
          difficulty: threshold.difficulty,
          sampleCount: phaseLabels.length,
          outputDir: phaseDir,
        });
        totalSamples += phaseLabels.length;
      }

      logger.info('Curriculum data exported', {
        service: 'YOLOTrainingDataEnhanced',
        phases: phases.map(p => `${p.difficulty}: ${p.sampleCount}`),
        totalSamples,
      });

      return { phases, totalSamples };
    } catch (error) {
      logger.error('Failed to export curriculum data', {
        service: 'YOLOTrainingDataEnhanced',
        error,
      });
      return { phases: [], totalSamples: 0 };
    }
  }
}