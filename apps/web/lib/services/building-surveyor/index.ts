/**
 * Building Surveyor Service - Refactored Entry Point
 * 
 * This is the new simplified interface to the Building Surveyor service.
 * The service has been refactored into smaller, more maintainable components:
 * 
 * - **Configuration**: Centralized config management
 * - **Feature Extraction**: Shared utilities for both learned and handcrafted features
 * - **Orchestration**: Flow control and coordination
 * - **Prompt Building**: GPT-4 Vision prompt construction
 * 
 * For backward compatibility, this file re-exports the main assessment function.
 */

export { AssessmentOrchestrator } from './orchestration/AssessmentOrchestrator';
export { FeatureExtractionService } from './orchestration/FeatureExtractionService';
export { PromptBuilder } from './orchestration/PromptBuilder';
export { getConfig, loadBuildingSurveyorConfig, validateConfig, resetConfig } from './config/BuildingSurveyorConfig';
export { extractHandcraftedFeatures } from './utils/FeatureExtractionUtils';

// Re-export types
export type * from './types';

// Export SAM 3 service
export { SAM3Service } from './SAM3Service';
export type {
  SAM3SegmentationRequest,
  SAM3SegmentationResponse,
  DamageTypeSegmentation,
} from './SAM3Service';

/**
 * Main assessment function (backward compatible)
 */
import { AssessmentOrchestrator } from './orchestration/AssessmentOrchestrator';
import type { AssessmentContext, Phase1BuildingAssessment } from './types';

export class BuildingSurveyorService {
    /**
     * Assess building damage from photos using GPT-4 Vision
     * 
     * This is the main entry point for building damage assessment.
     * It orchestrates the entire assessment pipeline including:
     * - Image validation
     * - External detector services (Roboflow, Google Vision)
     * - Feature extraction (learned or handcrafted)
     * - Memory-based adjustments
     * - GPT-4 Vision analysis
     * - Specialized analyses (safety, compliance, insurance)
     * 
     * @param imageUrls - Array of image URLs to analyze
     * @param context - Optional property and issue context
     * @returns Complete building damage assessment
     */
    static async assessDamage(
        imageUrls: string[],
        context?: AssessmentContext
    ): Promise<Phase1BuildingAssessment> {
        return AssessmentOrchestrator.assessDamage(imageUrls, context);
    }

    /**
     * Trigger self-modification when accuracy drops
     * 
     * This allows the service to adapt and improve over time
     * 
     * @param accuracyDrop - How much accuracy has dropped (0-1)
     */
    static async triggerSelfModification(accuracyDrop: number): Promise<void> {
        return AssessmentOrchestrator.triggerSelfModification(accuracyDrop);
    }
}
