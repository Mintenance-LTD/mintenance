/**
 * Building Surveyor & Maintenance Validation Schemas
 */
import { z } from 'zod';
import { sanitizeText, sanitizePromptText } from '@/lib/sanitizer';

// Building Surveyor Schemas
export const buildingAssessRequestSchema = z
  .object({
    imageUrls: z
      .array(z.string().url('Invalid image URL'))
      .min(1, 'At least one image required')
      .max(4, 'Maximum 4 images allowed'),
    jobId: z.string().uuid('Invalid job ID').optional(),
    propertyId: z.string().uuid('Invalid property ID').optional(),
    domain: z
      .enum(['building', 'rail', 'infrastructure', 'general'])
      .optional(),
    // Sprint 5.3: free-text fields are sanitized for prompt-injection patterns
    // before reaching the LLM. See sanitizePromptText() for what's stripped.
    context: z
      .object({
        location: z
          .string()
          .max(200)
          .transform((val) => sanitizePromptText(val, 200))
          .optional(),
        propertyType: z
          .enum(['residential', 'commercial', 'industrial'])
          .optional(),
        ageOfProperty: z.number().int().positive().max(500).optional(),
        propertyDetails: z
          .string()
          .max(1000)
          .transform((val) => sanitizePromptText(val, 1000))
          .optional(),
      })
      .strict()
      .optional(),
    gps: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .strict()
      .optional(),
    roomMetadata: z
      .object({
        room: z.string().max(100).optional(),
        floor: z.number().int().min(-5).max(200).optional(),
        dimensions: z.string().max(50).optional(),
        orientation: z
          .enum([
            'north',
            'south',
            'east',
            'west',
            'northeast',
            'northwest',
            'southeast',
            'southwest',
          ])
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const buildingCorrectionSchema = z
  .object({
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
      .strict()
      .optional(),
    correctionQuality: z.enum(['expert', 'verified', 'user']).optional(),
  })
  .strict();

// Maintenance Schemas
export const maintenanceDetectSchema = z
  .object({
    description: z
      .string()
      .max(2000, 'Description too long')
      .transform((val) => sanitizeText(val, 2000))
      .optional()
      .default(''),
    urgency: z.enum(['low', 'normal', 'urgent', 'emergency']).default('normal'),
  })
  .strict();

export const maintenanceFeedbackSchema = z
  .object({
    assessmentId: z.string().uuid('Invalid assessment ID'),
    wasAccurate: z.boolean(),
    actualIssue: z.string().max(200, 'Issue description too long').optional(),
    actualSeverity: z
      .enum(['minor', 'moderate', 'major', 'critical'])
      .optional(),
    actualTimeHours: z
      .number()
      .min(0, 'Time must be non-negative')
      .max(100, 'Time exceeds maximum')
      .optional(),
    actualMaterials: z
      .array(z.string().max(200))
      .max(50, 'Maximum 50 materials')
      .optional(),
    contractorNotes: z.string().max(1000, 'Notes too long').optional(),
    helpfulnessScore: z
      .number()
      .int()
      .min(1, 'Score must be at least 1')
      .max(5, 'Score must be at most 5')
      .optional(),
  })
  .strict();

// Type exports
export type BuildingAssessRequestInput = z.infer<
  typeof buildingAssessRequestSchema
>;
export type BuildingCorrectionInput = z.infer<typeof buildingCorrectionSchema>;
export type MaintenanceDetectInput = z.infer<typeof maintenanceDetectSchema>;
export type MaintenanceFeedbackInput = z.infer<
  typeof maintenanceFeedbackSchema
>;
