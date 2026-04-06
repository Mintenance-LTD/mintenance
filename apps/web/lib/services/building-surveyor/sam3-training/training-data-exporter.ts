/**
 * Export SAM3-enhanced YOLO training data to disk.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { loadClassNames } from '../yolo-class-names';
import { convertSAM3ToYOLO } from './format-converters';
import type { YOLOTrainingExport, TrainingDataExportOptions } from '../training-data-types';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_IMAGE_WIDTH = 640;
const DEFAULT_IMAGE_HEIGHT = 640;

/**
 * Export SAM3-enhanced YOLO training data
 */
export async function exportEnhancedTrainingData(
  options: TrainingDataExportOptions
): Promise<YOLOTrainingExport> {
  try {
    const {
      includeYOLOCorrections = true,
      includeSAM3Masks = true,
      includePseudoLabels = true,
      minConfidence = 0.5,
      onlyHumanVerified = false,
      maxSamples,
      outputDirectory,
    } = options;

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const imagesDir = path.join(outputDirectory, 'images');
    const labelsDir = path.join(outputDirectory, 'labels');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(labelsDir, { recursive: true });

    const exportId = `export-${Date.now()}`;
    const imagePaths: string[] = [];
    const labelPaths: string[] = [];
    const classDistribution: Record<string, number> = {};
    const sources = {
      yoloCorrections: 0,
      sam3Masks: 0,
      pseudoLabels: 0,
      baseDataset: 0,
    };

    let totalConfidence = 0;
    let humanVerifiedCount = 0;
    let sam3EnhancedCount = 0;
    let totalSamples = 0;

    const classNames = loadClassNames();

    // 1. Query and export approved YOLO corrections
    if (includeYOLOCorrections) {
      const { data: corrections } = await serverSupabase
        .from('yolo_corrections')
        .select('id, image_url, corrected_labels, confidence, human_verified')
        .eq('status', 'approved')
        .eq('used_in_training', false)
        .gte('confidence', minConfidence)
        .limit(maxSamples || 1000);

      for (const correction of corrections || []) {
        if (onlyHumanVerified && !correction.human_verified) continue;

        const filename = `correction_${correction.id}`;
        const labelPath = path.join(labelsDir, `${filename}.txt`);

        if (correction.corrected_labels) {
          fs.writeFileSync(labelPath, correction.corrected_labels);
          labelPaths.push(labelPath);
          if (correction.image_url) imagePaths.push(correction.image_url);
          sources.yoloCorrections++;
          totalSamples++;
          totalConfidence += correction.confidence || 0;
          if (correction.human_verified) humanVerifiedCount++;

          const lines = correction.corrected_labels.split('\n').filter(Boolean);
          for (const line of lines) {
            const classId = parseInt(line.split(' ')[0], 10);
            const className = classNames[classId] || `class_${classId}`;
            classDistribution[className] = (classDistribution[className] || 0) + 1;
          }
        }
      }
    }

    // 2. Query and export SAM3 masks (convert boxes to YOLO format)
    if (includeSAM3Masks) {
      const { data: masks } = await serverSupabase
        .from('sam3_training_masks')
        .select('id, image_url, boxes, scores, damage_type, segmentation_quality, human_verified')
        .eq('used_in_training', false)
        .in('segmentation_quality', ['excellent', 'good'])
        .limit(maxSamples || 1000);

      for (const mask of masks || []) {
        if (onlyHumanVerified && !mask.human_verified) continue;
        if (!mask.boxes || mask.boxes.length === 0) continue;

        const filename = `sam3_${mask.id}`;
        const labelPath = path.join(labelsDir, `${filename}.txt`);

        const segData: Record<string, { masks: number[][][]; boxes: number[][]; scores: number[]; numInstances: number }> = {
          [mask.damage_type]: {
            masks: [],
            boxes: mask.boxes,
            scores: mask.scores || [],
            numInstances: mask.boxes.length,
          },
        };
        const yoloLabels = convertSAM3ToYOLO(segData, DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT);

        if (yoloLabels) {
          fs.writeFileSync(labelPath, yoloLabels);
          labelPaths.push(labelPath);
          if (mask.image_url) imagePaths.push(mask.image_url);
          sources.sam3Masks++;
          totalSamples++;
          sam3EnhancedCount++;
          const avgScore = mask.scores?.length
            ? mask.scores.reduce((a: number, b: number) => a + b, 0) / mask.scores.length
            : 0;
          totalConfidence += avgScore;
          if (mask.human_verified) humanVerifiedCount++;
          classDistribution[mask.damage_type] = (classDistribution[mask.damage_type] || 0) + mask.boxes.length;
        }
      }
    }

    // 3. Query and export approved pseudo-labels
    if (includePseudoLabels) {
      const { data: pseudoLabels } = await serverSupabase
        .from('sam3_pseudo_labels')
        .select('id, image_url, yolo_labels, quality_score, damage_types_detected')
        .eq('used_in_training', false)
        .eq('passes_quality_threshold', true)
        .gte('quality_score', minConfidence)
        .limit(maxSamples || 1000);

      for (const label of pseudoLabels || []) {
        if (!label.yolo_labels) continue;

        const filename = `pseudo_${label.id}`;
        const labelPath = path.join(labelsDir, `${filename}.txt`);

        fs.writeFileSync(labelPath, label.yolo_labels);
        labelPaths.push(labelPath);
        if (label.image_url) imagePaths.push(label.image_url);
        sources.pseudoLabels++;
        totalSamples++;
        totalConfidence += label.quality_score || 0;

        for (const dtype of label.damage_types_detected || []) {
          classDistribution[dtype] = (classDistribution[dtype] || 0) + 1;
        }
      }
    }

    // 4. Write data.yaml for YOLO training
    const dataYamlContent = [
      `path: ${outputDirectory}`,
      `train: images`,
      `val: images`,
      `nc: ${classNames.length}`,
      `names: [${classNames.map(n => `'${n}'`).join(', ')}]`,
    ].join('\n');
    fs.writeFileSync(path.join(outputDirectory, 'data.yaml'), dataYamlContent);

    logger.info('Training data export completed', {
      service: 'SAM3TrainingDataService',
      exportId,
      totalSamples,
    });

    return {
      exportId,
      exportDate: new Date(),
      totalSamples,
      classDistribution,
      sources,
      files: {
        images: imagePaths,
        labels: labelPaths,
        dataYaml: path.join(outputDirectory, 'data.yaml'),
      },
      qualityMetrics: {
        averageConfidence: totalSamples > 0 ? totalConfidence / totalSamples : 0,
        humanVerifiedRatio: totalSamples > 0 ? humanVerifiedCount / totalSamples : 0,
        sam3EnhancedRatio: totalSamples > 0 ? sam3EnhancedCount / totalSamples : 0,
      },
    };
  } catch (error) {
    logger.error('Failed to export training data', error, {
      service: 'SAM3TrainingDataService',
    });
    throw error;
  }
}
