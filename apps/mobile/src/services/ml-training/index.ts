/**
 * ML Training Pipeline - Modular Machine Learning System
 * Central export barrel for all ML training components
 * Refactored from monolithic MLTrainingPipeline.ts
 */

// Core modular components (refactored structure)
export { DataPreparation } from './DataPreparation';
export { TrainingOrchestrator } from './TrainingOrchestrator';
export { ValidationService } from './ValidationService';
export { ModelDeployment } from './ModelDeployment';

// Export types and interfaces
export type { TrainingData } from './DataPreparation';
export type { TrainingConfig } from './TrainingOrchestrator';
export type { ModelPerformance, BiasMetrics, ValidationResults } from './ValidationService';
export type { ModelInfo, TrainingReport, ABTestResult } from './ModelDeployment';

// Main service orchestrator (if exists)
export { MLTrainingPipelineService, mlTrainingPipelineService } from './MLTrainingPipelineService';

// Additional components
export { MLTrainingRepository } from './MLTrainingRepository';
export { ModelTrainingEngine } from './ModelTrainingEngine';
export { BiasDetectionService } from './BiasDetectionService';
export { ModelValidationService } from './ModelValidationService';

// Legacy compatibility export
export { mlTrainingPipelineService as MLTrainingPipeline } from './MLTrainingPipelineService';