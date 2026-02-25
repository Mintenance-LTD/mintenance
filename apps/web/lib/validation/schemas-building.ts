/**
 * Building Surveyor & Maintenance Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitizer';

// Building Surveyor Schemas
export const buildingAssessRequestSchema = z.object({
  imageUrls: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image required')
    .max(4, 'Maximum 4 images allowed'),
  jobId: z.string().uuid('Invalid job ID').optional(),
  propertyId: z.string().uuid('Invalid property ID').optional(),
  domain: z.enum(['building', 'rail', 'infrastructure', 'general']).optional(),
  context: z
    .object({
      location: z.string().max(200).optional(),
      propertyType: z.enum(['residential', 'commercial', 'industrial']).optional(),
      ageOfProperty: z.number().int().positive().max(500).optional(),
      propertyDetails: z.string().max(1000).optional(),
    })
    .optional(),
});

export const buildingCorrectionSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID'),
  imageUrl: z.string().url('Invalid image URL'),
  imageIndex: z.number().int().min(0).optional(),
  // Using z.any() for detection arrays to match the flexible RoboflowDetection/CorrectedDetection types
  originalDetections: z.array(z.any()),
  correctedDetections: z.array(z.any()),
  correctionsMade: z
    .object({
      added: z.array(z.any()).optional(),
      removed: z.array(z.any()).optional(),
      adjusted: z.array(z.any()).optional(),
      classChanged: z.array(z.any()).optional(),
    })
    .optional(),
  correctionQuality: z.enum(['expert', 'verified', 'user']).optional(),
});

// Maintenance Schemas
export const maintenanceDetectSchema = z.object({
  description: z
    .string()
    .max(2000, 'Description too long')
    .transform((val) => sanitizeText(val, 2000))
    .optional()
    .default(''),
  urgency: z.enum(['low', 'normal', 'urgent', 'emergency']).default('normal'),
});

export const maintenanceFeedbackSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID'),
  wasAccurate: z.boolean(),
  actualIssue: z.string().max(200, 'Issue description too long').optional(),
  actualSeverity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
  actualTimeHours: z.number().min(0, 'Time must be non-negative').max(100, 'Time exceeds maximum').optional(),
  actualMaterials: z.array(z.string().max(200)).max(50, 'Maximum 50 materials').optional(),
  contractorNotes: z.string().max(1000, 'Notes too long').optional(),
  helpfulnessScore: z
    .number()
    .int()
    .min(1, 'Score must be at least 1')
    .max(5, 'Score must be at most 5')
    .optional(),
});

// Type exports
export type BuildingAssessRequestInput = z.infer<typeof buildingAssessRequestSchema>;
export type BuildingCorrectionInput = z.infer<typeof buildingCorrectionSchema>;
export type MaintenanceDetectInput = z.infer<typeof maintenanceDetectSchema>;
export type MaintenanceFeedbackInput = z.infer<typeof maintenanceFeedbackSchema>;
