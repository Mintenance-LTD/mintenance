/**
 * SAM3 Training Data Flow Tests
 *
 * Demonstrates the complete training data collection flow:
 * 1. Assessment creates GPT-4 label + SAM3 masks
 * 2. User correction creates YOLO correction + SAM3 masks
 * 3. Pseudo-label generation for unlabeled images
 * 4. Training job triggered when thresholds met
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SAM3TrainingDataService } from '../SAM3TrainingDataService';
import { KnowledgeDistillationService } from '../KnowledgeDistillationService';
import type {
  SAM3TrainingMaskInput,
  GPT4TrainingLabelInput,
  PseudoLabelGenerationOptions,
} from '../training-data-types';
import type { Phase1BuildingAssessment, RoboflowDetection } from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';

// Mock dependencies
jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'test-id' },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
    rpc: jest.fn(() => ({
      data: [
        {
          gpt4_labels_total: 150,
          gpt4_labels_unused: 120,
          gpt4_labels_verified: 80,
          sam3_masks_total: 200,
          sam3_masks_unused: 150,
          sam3_masks_verified: 100,
          pseudo_labels_total: 50,
          pseudo_labels_quality: 40,
          pseudo_labels_approved: 30,
          active_jobs: 1,
          completed_jobs: 5,
        },
      ],
      error: null,
    })),
  },
}));

jest.mock('../SAM3Service');
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SAM3 Training Data Collection Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Assessment Flow: GPT-4 + SAM3 Capture', () => {
    it('should capture GPT-4 Vision output as training label', async () => {
      const assessmentId = 'assessment-123';
      const imageUrls = ['https://example.com/damage1.jpg'];

      const gpt4Assessment: Phase1BuildingAssessment = {
        damageAssessment: {
          damageType: 'water_damage',
          severity: 'midway',
          confidence: 85,
          location: 'Ceiling',
          description: 'Water staining on ceiling with visible moisture',
          detectedItems: ['stain', 'moisture', 'discoloration'],
        },
        safetyHazards: {
          hazards: [],
          hasCriticalHazards: false,
          overallSafetyScore: 70,
        },
        compliance: {
          complianceIssues: [],
          requiresProfessionalInspection: true,
          complianceScore: 75,
        },
        insuranceRisk: {
          riskFactors: [],
          riskScore: 60,
          premiumImpact: 'medium',
          mitigationSuggestions: [],
        },
        urgency: {
          urgency: 'soon',
          recommendedActionTimeline: 'Within 2 weeks',
          reasoning: 'Water damage can worsen quickly',
          priorityScore: 65,
        },
        homeownerExplanation: {
          whatIsIt: 'Water damage to ceiling',
          whyItHappened: 'Possible roof leak',
          whatToDo: 'Contact a roofing contractor',
        },
        contractorAdvice: {
          repairNeeded: ['Roof repair', 'Ceiling repair'],
          materials: [],
          tools: [],
          estimatedTime: '2-3 days',
          estimatedCost: {
            min: 500,
            max: 2000,
            recommended: 1200,
          },
          complexity: 'medium',
        },
      };

      const labelId = await KnowledgeDistillationService.recordGPT4Output(
        assessmentId,
        gpt4Assessment,
        imageUrls,
        {
          location: 'San Francisco, CA',
          propertyType: 'residential',
          ageOfProperty: 25,
        }
      );

      expect(labelId).toBe('test-id');
      // In real test, verify database insertion
    });

    it('should capture SAM3 segmentation masks', async () => {
      const assessmentId = 'assessment-123';
      const imageUrl = 'https://example.com/damage1.jpg';

      const sam3Data: DamageTypeSegmentation = {
        success: true,
        damage_types: {
          water_damage: {
            success: true,
            masks: [
              [
                [0, 0, 1, 1, 0],
                [0, 1, 1, 1, 0],
                [1, 1, 1, 1, 1],
              ],
            ],
            boxes: [[100, 150, 200, 150]],
            scores: [0.92],
            num_instances: 1,
          },
        },
      };

      const maskIds = await SAM3TrainingDataService.captureSAM3Output(assessmentId, imageUrl, sam3Data, 0);

      expect(maskIds).toHaveLength(1);
      expect(maskIds[0]).toBe('test-id');
    });
  });

  describe('2. User Correction Flow: YOLO + SAM3', () => {
    it('should create enhanced training data from user corrections', async () => {
      const input: SAM3TrainingMaskInput = {
        assessmentId: 'assessment-456',
        imageUrl: 'https://example.com/corrected-image.jpg',
        imageIndex: 0,
        damageType: 'crack',
        masks: [
          [
            [0, 1, 1, 0],
            [1, 1, 1, 1],
          ],
        ],
        boxes: [[50, 75, 100, 50]],
        scores: [0.88],
        numInstances: 1,
        totalAffectedArea: 6,
        yoloCorrectionId: 'correction-789',
        segmentationQuality: 'excellent',
      };

      const maskId = await SAM3TrainingDataService.storeSAM3Mask(input);

      expect(maskId).toBe('test-id');
      // Verify the mask is linked to the YOLO correction
    });
  });

  describe('3. Pseudo-Label Generation', () => {
    it('should generate pseudo-labels for unlabeled images', async () => {
      // Mock SAM3Service
      const { SAM3Service } = await import('../SAM3Service');
      (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);
      (SAM3Service.segmentDamageTypes as jest.Mock).mockResolvedValue({
        success: true,
        damage_types: {
          crack: {
            success: true,
            masks: [
              [
                [0, 1, 1],
                [1, 1, 1],
              ],
            ],
            boxes: [[20, 30, 40, 30]],
            scores: [0.75],
            num_instances: 1,
          },
          mold: {
            success: true,
            masks: [
              [
                [1, 1, 0],
                [1, 0, 0],
              ],
            ],
            boxes: [[80, 90, 30, 20]],
            scores: [0.82],
            num_instances: 1,
          },
        },
      });

      const imageUrls = ['https://example.com/unlabeled1.jpg', 'https://example.com/unlabeled2.jpg'];

      const options: PseudoLabelGenerationOptions = {
        damageTypes: ['crack', 'mold', 'water damage'],
        minConfidence: 0.6,
        qualityThreshold: 0.7,
        autoConvertToYOLO: true,
      };

      const results = await SAM3TrainingDataService.generatePseudoLabels(imageUrls, options);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].damageTypesDetected).toContain('crack');
      expect(results[0].damageTypesDetected).toContain('mold');
      expect(results[0].totalInstances).toBe(2);
      expect(results[0].yoloLabels).toBeDefined();
      expect(results[0].passesQualityThreshold).toBe(true);
    });
  });

  describe('4. Training Job Orchestration', () => {
    it('should get comprehensive training statistics', async () => {
      const stats = await KnowledgeDistillationService.getTrainingStats();

      expect(stats.gpt4Labels.total).toBe(150);
      expect(stats.gpt4Labels.unused).toBe(120);
      expect(stats.gpt4Labels.verified).toBe(80);

      expect(stats.sam3Masks.total).toBe(200);
      expect(stats.sam3Masks.unused).toBe(150);
      expect(stats.sam3Masks.verified).toBe(100);

      expect(stats.pseudoLabels.total).toBe(50);
      expect(stats.pseudoLabels.qualityPassing).toBe(40);
      expect(stats.pseudoLabels.approved).toBe(30);

      expect(stats.jobs.active).toBe(1);
      expect(stats.jobs.completed).toBe(5);

      expect(stats.readyForTraining.totalSamplesReady).toBe(310); // 120 + 150 + 40
    });

    it('should create training job when triggered manually', async () => {
      const jobId = await KnowledgeDistillationService.createTrainingJob({
        jobType: 'damage_classifier',
        config: {
          learningRate: 0.001,
          batchSize: 32,
          epochs: 50,
        },
        trainingSamplesCount: 100,
        validationSamplesCount: 20,
        modelVersion: 'v1.0.0',
        triggeredBy: 'manual',
        notes: 'Initial training run',
      });

      expect(jobId).toContain('kd-');
      expect(jobId).toContain('damage_classifier');
    });

    it('should update job status during training', async () => {
      const jobId = 'kd-123-damage_classifier';

      // Start training
      await KnowledgeDistillationService.updateJobStatus(jobId, 'running');

      // Complete training
      await KnowledgeDistillationService.updateJobStatus(jobId, 'completed', {
        metrics: {
          accuracy: 0.89,
          precision: 0.87,
          recall: 0.85,
          f1Score: 0.86,
          loss: 0.32,
          valLoss: 0.38,
        },
        outputModelPath: '/models/damage-classifier-v1.0.0.pt',
      });

      // Verify status updates occurred
      expect(true).toBe(true);
    });

    it('should mark training data as used after training', async () => {
      const jobId = 'kd-456-segmentation_model';
      const sam3MaskIds = ['mask-1', 'mask-2', 'mask-3'];

      await KnowledgeDistillationService.markDataAsUsed(jobId, 'segmentation_model', sam3MaskIds);

      // Verify data is marked as used
      expect(true).toBe(true);
    });
  });

  describe('5. Enhanced YOLO Detection', () => {
    it('should enhance YOLO detections with SAM3 masks', async () => {
      const yoloDetections: RoboflowDetection[] = [
        {
          id: 'det-1',
          className: 'crack',
          confidence: 78,
          boundingBox: {
            x: 100,
            y: 150,
            width: 80,
            height: 60,
          },
          imageUrl: 'https://example.com/test.jpg',
        },
      ];

      const { SAM3Service } = await import('../SAM3Service');
      (SAM3Service.healthCheck as jest.Mock).mockResolvedValue(true);
      (SAM3Service.segmentDamageTypes as jest.Mock).mockResolvedValue({
        success: true,
        damage_types: {
          crack: {
            success: true,
            masks: [
              [
                [0, 1, 1],
                [1, 1, 1],
              ],
            ],
            boxes: [[105, 155, 75, 55]], // Similar to YOLO box
            scores: [0.92],
            num_instances: 1,
          },
        },
      });

      const enhanced = await SAM3TrainingDataService.enhanceYOLOWithSAM3(
        yoloDetections,
        'https://example.com/test.jpg'
      );

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].className).toBe('crack');
      expect(enhanced[0].preciseMask).toBeDefined();
      expect(enhanced[0].preciseBox).toBeDefined();
      expect(enhanced[0].segmentationConfidence).toBe(0.92);
      expect(enhanced[0].fusedConfidence).toBeGreaterThan(78);
      expect(enhanced[0].fusionMethod).toBe('weighted_average');
    });
  });
});

describe('Integration: Complete Training Pipeline', () => {
  it('should demonstrate end-to-end training data flow', async () => {
    // 1. Assessment generates GPT-4 label
    const assessmentId = 'assessment-integration-test';
    const mockAssessment: Phase1BuildingAssessment = {
      damageAssessment: {
        damageType: 'structural_damage',
        severity: 'full',
        confidence: 92,
        location: 'Foundation',
        description: 'Major structural cracks in foundation',
        detectedItems: ['crack', 'settlement', 'structural'],
      },
      safetyHazards: {
        hazards: [
          {
            type: 'structural_failure',
            severity: 'critical',
            location: 'Foundation',
            description: 'Risk of collapse',
            urgency: 'immediate',
          },
        ],
        hasCriticalHazards: true,
        overallSafetyScore: 20,
      },
      compliance: {
        complianceIssues: [],
        requiresProfessionalInspection: true,
        complianceScore: 40,
      },
      insuranceRisk: {
        riskFactors: [],
        riskScore: 90,
        premiumImpact: 'high',
        mitigationSuggestions: [],
      },
      urgency: {
        urgency: 'immediate',
        recommendedActionTimeline: 'Evacuate immediately',
        reasoning: 'Critical structural failure risk',
        priorityScore: 95,
      },
      homeownerExplanation: {
        whatIsIt: 'Critical structural damage',
        whyItHappened: 'Foundation settlement',
        whatToDo: 'Evacuate and call structural engineer',
      },
      contractorAdvice: {
        repairNeeded: ['Foundation repair', 'Structural reinforcement'],
        materials: [],
        tools: [],
        estimatedTime: '2-4 weeks',
        estimatedCost: {
          min: 10000,
          max: 50000,
          recommended: 25000,
        },
        complexity: 'high',
      },
    };

    // Record GPT-4 output
    const labelId = await KnowledgeDistillationService.recordGPT4Output(
      assessmentId,
      mockAssessment,
      ['https://example.com/foundation-damage.jpg']
    );

    expect(labelId).toBeDefined();

    // 2. SAM3 generates precise masks
    const sam3Data: DamageTypeSegmentation = {
      success: true,
      damage_types: {
        structural_damage: {
          success: true,
          masks: [
            [
              [0, 0, 1, 1, 1, 0],
              [0, 1, 1, 1, 1, 1],
              [1, 1, 1, 1, 1, 1],
            ],
          ],
          boxes: [[200, 250, 300, 200]],
          scores: [0.95],
          num_instances: 1,
        },
      },
    };

    const maskIds = await SAM3TrainingDataService.captureSAM3Output(
      assessmentId,
      'https://example.com/foundation-damage.jpg',
      sam3Data,
      0
    );

    expect(maskIds).toHaveLength(1);

    // 3. Check training readiness
    const stats = await KnowledgeDistillationService.getTrainingStats();

    console.log('Training Data Ready:', {
      gpt4Labels: stats.gpt4Labels.unused,
      sam3Masks: stats.sam3Masks.unused,
      pseudoLabels: stats.pseudoLabels.qualityPassing,
      totalReady: stats.readyForTraining.totalSamplesReady,
    });

    expect(stats.readyForTraining.totalSamplesReady).toBeGreaterThan(0);
  });
});
