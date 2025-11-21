/**
 * Assessment Orchestrator
 * 
 * Handles the flow control and orchestration of building damage assessments.
 * Coordinates between detection services, feature extraction, memory systems,
 * and GPT-4 Vision analysis.
 */

import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { MonitoringService } from '../../monitoring/MonitoringService';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { SafetyAnalysisService } from '../SafetyAnalysisService';
import { ComplianceService } from '../ComplianceService';
import { InsuranceRiskService } from '../InsuranceRiskService';
import { FeatureExtractionService } from './FeatureExtractionService';
import { PromptBuilder } from './PromptBuilder';
import { getConfig } from '../config/BuildingSurveyorConfig';
import { SAM3Service } from '../SAM3Service';
import type {
    AssessmentContext,
    Phase1BuildingAssessment,
    RoboflowDetection,
    VisionAnalysisSummary,
    SAM3SegmentationData,
} from '../types';
import type { ContinuumMemoryConfig, MemoryQueryResult } from '../../ml-engine/memory/types';

// Simple URL validation utility
async function validateURLs(urls: string[], strict: boolean = false): Promise<{
    valid: string[];
    invalid: Array<{ url: string; error: string }>;
}> {
    const valid: string[] = [];
    const invalid: Array<{ url: string; error: string }> = [];

    for (const url of urls) {
        try {
            new URL(url);
            valid.push(url);
        } catch (error) {
            invalid.push({ url, error: 'Invalid URL format' });
        }
    }

    return { valid, invalid };
}

// Placeholder for ImageAnalysisService - import from actual location if available
const ImageAnalysisService = {
    async analyzePropertyImages(imageUrls: string[]) {
        // Placeholder - replace with actual implementation
        return null;
    }
};

export class AssessmentOrchestrator {
    private static readonly AGENT_NAME = 'building-surveyor';
    private static memorySystemInitialized = false;

    /**
     * Initialize the orchestrator and its dependencies
     */
    static async initialize(): Promise<void> {
        await this.initializeMemorySystem();
        await FeatureExtractionService.initialize();
    }

    /**
     * Initialize continuum memory system for building surveyor
     */
    private static async initializeMemorySystem(): Promise<void> {
        if (this.memorySystemInitialized) return;

        const config = getConfig();

        try {
            const memoryConfig: ContinuumMemoryConfig = {
                agentName: this.AGENT_NAME,
                defaultChunkSize: 10,
                defaultLearningRate: 0.001,
                levels: [
                    {
                        level: 0,
                        frequency: 1,
                        chunkSize: 10,
                        learningRate: 0.01,
                        mlpConfig: {
                            inputSize: 40,
                            hiddenSizes: [64, 32],
                            outputSize: 5,
                            activation: 'relu',
                        },
                    },
                    {
                        level: 1,
                        frequency: 16,
                        chunkSize: 100,
                        learningRate: 0.005,
                        mlpConfig: {
                            inputSize: 40,
                            hiddenSizes: [128, 64],
                            outputSize: 5,
                            activation: 'relu',
                        },
                    },
                    {
                        level: 2,
                        frequency: 1000000,
                        chunkSize: 1000,
                        learningRate: 0.001,
                        mlpConfig: {
                            inputSize: 40,
                            hiddenSizes: [256, 128, 64],
                            outputSize: 5,
                            activation: 'relu',
                        },
                    },
                ],
            };

            const memorySystem = await memoryManager.getOrCreateMemorySystem(memoryConfig);

            if (config.useTitans) {
                memorySystem.enableTitans(true);
                logger.info('Titans enabled for building surveyor', {
                    agentName: this.AGENT_NAME,
                });
            }

            this.memorySystemInitialized = true;

            logger.info('AssessmentOrchestrator memory system initialized', {
                agentName: this.AGENT_NAME,
                levels: memoryConfig.levels.length,
                useLearnedFeatures: config.useLearnedFeatures,
                useTitans: config.useTitans,
            });
        } catch (error) {
            logger.error('Failed to initialize memory system', error, {
                service: 'AssessmentOrchestrator',
            });
        }
    }

    /**
     * Run a task with timeout
     */
    private static async runWithTimeout<T>(
        task: () => Promise<T>,
        timeoutMs: number,
        taskName: string
    ): Promise<{ success: boolean; data?: T; error?: any; timedOut: boolean; durationMs: number }> {
        const startTime = Date.now();

        try {
            const result = await Promise.race([
                task(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`${taskName} timeout`)), timeoutMs)
                ),
            ]);

            return {
                success: true,
                data: result,
                timedOut: false,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            const isTimeout = error instanceof Error && error.message.includes('timeout');
            return {
                success: false,
                error,
                timedOut: isTimeout,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Convert vision analysis to summary format
     */
    private static toVisionSummary(analysis: any): VisionAnalysisSummary | null {
        if (!analysis) return null;

        return {
            provider: 'google-vision',
            confidence: analysis.confidence || 50,
            labels: analysis.labels || [],
            objects: analysis.objects || [],
            detectedFeatures: analysis.detectedFeatures || [],
            suggestedCategories: analysis.suggestedCategories || [],
        };
    }

    /**
     * Record a metric
     */
    private static recordMetric(metric: string, payload: Record<string, unknown>): void {
        MonitoringService.record(metric, {
            agentName: this.AGENT_NAME,
            ...payload,
        });
    }

    /**
     * Orchestrate a complete building damage assessment
     */
    static async assessDamage(
        imageUrls: string[],
        context?: AssessmentContext
    ): Promise<Phase1BuildingAssessment> {
        const startedAt = Date.now();
        const config = getConfig();

        try {
            await this.initialize();

            if (!config.openaiApiKey) {
                logger.warn('OpenAI API key not configured', {
                    service: 'AssessmentOrchestrator',
                });
                throw new Error('AI assessment service is not configured');
            }

            if (!imageUrls || imageUrls.length === 0) {
                throw new Error('At least one image is required for assessment');
            }

            const urlValidation = await validateURLs(imageUrls, true);
            if (urlValidation.invalid.length > 0) {
                logger.warn('Invalid image URLs rejected for building assessment', {
                    service: 'AssessmentOrchestrator',
                    invalidUrls: urlValidation.invalid,
                });
                throw new Error(`Invalid image URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}`);
            }

            const validatedImageUrls = urlValidation.valid;

            const [roboflowResult, visionResult] = await Promise.all([
                this.runWithTimeout(
                    () => RoboflowDetectionService.detect(validatedImageUrls),
                    config.detectorTimeoutMs,
                    'roboflow-detect',
                ),
                this.runWithTimeout(
                    () => ImageAnalysisService.analyzePropertyImages(validatedImageUrls),
                    config.visionTimeoutMs,
                    'vision-analyze',
                ),
            ]);

            const roboflowDetections =
                roboflowResult.success && Array.isArray(roboflowResult.data)
                    ? roboflowResult.data
                    : [];
            const visionAnalysis = visionResult.success
                ? this.toVisionSummary(visionResult.data ?? null)
                : null;

            if (!roboflowResult.success) {
                logger.warn('Roboflow detection unavailable', {
                    service: 'AssessmentOrchestrator',
                    timedOut: roboflowResult.timedOut,
                });
            }

            if (!visionResult.success) {
                logger.warn('Google Vision analysis unavailable', {
                    service: 'AssessmentOrchestrator',
                    timedOut: visionResult.timedOut,
                });
            }

            this.recordMetric('detector.roboflow', {
                success: roboflowResult.success,
                durationMs: roboflowResult.durationMs,
                timedOut: roboflowResult.timedOut,
                detectionCount: roboflowDetections.length,
            });

            this.recordMetric('detector.vision', {
                success: visionResult.success,
                durationMs: visionResult.durationMs,
                timedOut: visionResult.timedOut,
                detectedLabels: visionAnalysis?.labels.length ?? 0,
            });

            const features = await FeatureExtractionService.extractFeatures(
                validatedImageUrls,
                context,
                undefined,
                roboflowDetections,
                visionAnalysis,
            );

            let memoryAdjustments: number[] = [0, 0, 0, 0, 0];
            try {
                const memorySystem = memoryManager.getMemorySystem(this.AGENT_NAME);

                let processedFeatures = features;
                if (config.useTitans && memorySystem) {
                    processedFeatures = await memorySystem.processWithTitans(features);
                }

                const memoryResults: MemoryQueryResult[] = [];
                for (let level = 0; level < 3; level++) {
                    const result = await memoryManager.query(this.AGENT_NAME, processedFeatures.slice(0, 40), level);
                    if (result.values && result.values.length === 5) {
                        memoryResults.push(result);
                    }
                }

                if (memoryResults.length > 0) {
                    let totalWeight = 0;
                    const combined = [0, 0, 0, 0, 0];
                    for (const result of memoryResults) {
                        const weight = result.confidence;
                        totalWeight += weight;
                        for (let i = 0; i < 5; i++) {
                            combined[i] += result.values[i] * weight;
                        }
                    }
                    if (totalWeight > 0) {
                        for (let i = 0; i < 5; i++) {
                            memoryAdjustments[i] = combined[i] / totalWeight;
                        }
                    }
                }
            } catch (memoryError) {
                logger.warn('Memory query failed, continuing without adjustments', {
                    service: 'AssessmentOrchestrator',
                    error: memoryError,
                });
            }

            const messages = PromptBuilder.buildMessages(
                validatedImageUrls,
                context,
                roboflowDetections,
                visionAnalysis
            );

            const gptStart = Date.now();
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages,
                    max_tokens: 2000,
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `OpenAI API error: ${response.status}`;
                
                // Try to parse OpenAI error response for better error messages
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error) {
                        const openaiError = errorData.error;
                        errorMessage = `OpenAI API error: ${response.status} - ${openaiError.message || openaiError.type || 'Unknown error'}`;
                        
                        // Include error code if available (e.g., invalid_api_key)
                        if (openaiError.code) {
                            errorMessage += ` (code: ${openaiError.code})`;
                        }
                    }
                } catch {
                    // If parsing fails, use the raw error text
                    errorMessage = `OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`;
                }
                
                logger.error('OpenAI API error', {
                    service: 'AssessmentOrchestrator',
                    status: response.status,
                    error: errorText,
                });
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const gptDuration = Date.now() - gptStart;

            this.recordMetric('gpt.vision', {
                success: true,
                durationMs: gptDuration,
                tokensUsed: data.usage?.total_tokens || 0,
            });

            const aiContent = data.choices?.[0]?.message?.content;
            if (!aiContent) {
                throw new Error('No content in GPT-4 Vision response');
            }

            const aiAssessment = JSON.parse(aiContent);

            // Optionally enhance with SAM 3 precise segmentation
            let sam3Segmentation: SAM3SegmentationData | undefined;
            if (
                process.env.ENABLE_SAM3_SEGMENTATION === 'true' &&
                validatedImageUrls.length > 0
            ) {
                try {
                    const isSAM3Available = await SAM3Service.healthCheck();
                    if (isSAM3Available) {
                        const sam3Start = Date.now();
                        
                        // Get damage type from AI assessment for targeted segmentation
                        const damageType = aiAssessment.damageType || aiAssessment.damageAssessment?.damageType || 'damage';
                        
                        // Segment the primary image
                        const sam3Result = await SAM3Service.segmentDamageTypes(
                            validatedImageUrls[0],
                            [damageType]
                        );
                        
                        if (sam3Result?.success && sam3Result.damage_types[damageType]) {
                            const damageSegmentation = sam3Result.damage_types[damageType];
                            
                            if (damageSegmentation.num_instances > 0) {
                                // Calculate affected area from masks
                                const affectedArea = damageSegmentation.masks.reduce(
                                    (total, mask) => {
                                        const maskArea = mask.flat().filter(pixel => pixel > 0).length;
                                        return total + maskArea;
                                    },
                                    0
                                );
                                
                                sam3Segmentation = {
                                    preciseMasks: damageSegmentation.masks,
                                    preciseBoxes: damageSegmentation.boxes,
                                    affectedArea,
                                    segmentationConfidence: damageSegmentation.scores[0] || aiAssessment.confidence,
                                    masks: damageSegmentation.masks.map((mask, idx) => ({
                                        mask,
                                        box: damageSegmentation.boxes[idx],
                                        score: damageSegmentation.scores[idx],
                                    })),
                                };
                                
                                const sam3Duration = Date.now() - sam3Start;
                                this.recordMetric('segmentation.sam3', {
                                    success: true,
                                    durationMs: sam3Duration,
                                    numInstances: damageSegmentation.num_instances,
                                    affectedArea,
                                });
                                
                                logger.info('SAM 3 segmentation completed', {
                                    service: 'AssessmentOrchestrator',
                                    damageType,
                                    numInstances: damageSegmentation.num_instances,
                                    affectedArea,
                                });
                            }
                        }
                    }
                } catch (sam3Error) {
                    // Fallback to GPT-4 only if SAM 3 fails
                    logger.warn('SAM 3 segmentation failed, using GPT-4 only', {
                        service: 'AssessmentOrchestrator',
                        error: sam3Error,
                    });
                    this.recordMetric('segmentation.sam3', {
                        success: false,
                        error: sam3Error instanceof Error ? sam3Error.message : 'Unknown error',
                    });
                }
            }

            const assessment = await this.buildFinalAssessment(
                aiAssessment,
                context,
                roboflowDetections,
                visionAnalysis,
                sam3Segmentation
            );

            const totalDuration = Date.now() - startedAt;
            this.recordMetric('assessment.complete', {
                success: true,
                durationMs: totalDuration,
                imageCount: validatedImageUrls.length,
                detectionCount: roboflowDetections.length,
                hasSAM3Segmentation: !!sam3Segmentation,
            });

            logger.info('Building damage assessment completed', {
                service: 'AssessmentOrchestrator',
                durationMs: totalDuration,
                damageType: assessment.damageAssessment.damageType,
                severity: assessment.damageAssessment.severity,
                urgency: assessment.urgency.urgency,
                hasSAM3Segmentation: !!sam3Segmentation,
            });

            return assessment;
        } catch (error) {
            const totalDuration = Date.now() - startedAt;
            this.recordMetric('assessment.error', {
                success: false,
                durationMs: totalDuration,
                error: error instanceof Error ? error.message : 'unknown',
            });

            logger.error('Building damage assessment failed', error, {
                service: 'AssessmentOrchestrator',
                durationMs: totalDuration,
            });

            throw error;
        }
    }

    /**
     * Build final assessment with all specialized analyses
     */
    private static async buildFinalAssessment(
        aiAssessment: any,
        context?: AssessmentContext,
        roboflowDetections?: RoboflowDetection[],
        visionAnalysis?: VisionAnalysisSummary | null,
        sam3Segmentation?: SAM3SegmentationData
    ): Promise<Phase1BuildingAssessment> {
        const safetyAnalysis = SafetyAnalysisService.analyze(
            aiAssessment.safetyHazards || [],
            aiAssessment.damageType,
            aiAssessment.severity
        );

        const complianceAnalysis = ComplianceService.analyze(
            aiAssessment.complianceIssues || [],
            aiAssessment.damageType,
            context
        );

        const insuranceRisk = InsuranceRiskService.assess(
            aiAssessment.riskFactors || [],
            aiAssessment.damageType,
            aiAssessment.severity,
            context
        );

        return {
            damageAssessment: {
                damageType: aiAssessment.damageType || 'unknown_damage',
                severity: aiAssessment.severity || 'early',
                confidence: aiAssessment.confidence || 50,
                location: aiAssessment.location || 'Unknown',
                description: aiAssessment.description || 'No description available',
                detectedItems: aiAssessment.detectedItems || [],
            },
            safetyHazards: safetyAnalysis,
            compliance: complianceAnalysis,
            insuranceRisk,
            urgency: {
                urgency: aiAssessment.urgency || 'monitor',
                recommendedActionTimeline: aiAssessment.recommendedActionTimeline || 'Monitor for changes',
                estimatedTimeToWorsen: aiAssessment.estimatedTimeToWorsen,
                reasoning: aiAssessment.urgencyReasoning || 'Standard assessment',
                priorityScore: this.calculatePriorityScore(
                    aiAssessment.urgency || 'monitor',
                    aiAssessment.severity || 'early',
                    safetyAnalysis.overallSafetyScore
                ),
            },
            homeownerExplanation: aiAssessment.homeownerExplanation || {
                whatIsIt: 'Building damage detected',
                whyItHappened: 'Cause unknown',
                whatToDo: 'Consult a professional',
            },
            contractorAdvice: aiAssessment.contractorAdvice || {
                repairNeeded: [],
                materials: [],
                tools: [],
                estimatedTime: 'Unknown',
                estimatedCost: {
                    min: 0,
                    max: 0,
                    recommended: 0,
                },
                complexity: 'medium',
            },
            evidence: {
                roboflowDetections,
                visionAnalysis,
                ...(sam3Segmentation && { sam3Segmentation }),
            },
        };
    }

    /**
     * Calculate priority score based on urgency, severity, and safety
     */
    private static calculatePriorityScore(
        urgency: string,
        severity: string,
        safetyScore: number
    ): number {
        const urgencyScores: Record<string, number> = {
            immediate: 100,
            urgent: 80,
            soon: 60,
            planned: 40,
            monitor: 20,
        };

        const severityScores: Record<string, number> = {
            full: 100,
            midway: 60,
            early: 30,
        };

        const urgencyScore = urgencyScores[urgency] || 50;
        const severityScore = severityScores[severity] || 50;

        return Math.round(
            urgencyScore * 0.4 +
            severityScore * 0.3 +
            (100 - safetyScore) * 0.3
        );
    }

    /**
     * Trigger self-modification when accuracy drops
     */
    static async triggerSelfModification(accuracyDrop: number): Promise<void> {
        logger.info('AssessmentOrchestrator self-modification triggered', {
            agentName: this.AGENT_NAME,
            accuracyDrop,
        });
    }
}
