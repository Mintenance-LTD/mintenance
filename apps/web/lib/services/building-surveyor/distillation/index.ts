/**
 * Teacher-Student VLM Distillation Module
 *
 * Barrel exports for all distillation services.
 */

export { StudentShadowService } from './StudentShadowService';
export { ExperienceBufferService } from './ExperienceBufferService';
export { TrainingDataExporter } from './TrainingDataExporter';
export { StudentRoutingGate } from './StudentRoutingGate';
export { SafetyRecallGate } from './SafetyRecallGate';
export { CalibrationFeedbackService } from './CalibrationFeedbackService';
export type * from './types';
