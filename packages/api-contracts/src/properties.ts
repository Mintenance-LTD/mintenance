/**
 * Property API contracts.
 */
import { z } from 'zod';

// ── Constants ──────────────────────────────────────────────────────

export const PROPERTY_TYPES = [
  'residential', 'commercial', 'rental', 'house', 'apartment', 'flat',
  'detached', 'semi-detached', 'terraced', 'bungalow', 'cottage', 'other',
] as const;

// ── Request schemas ────────────────────────────────────────────────

export const createPropertyRequestSchema = z
  .object({
    property_name: z.string().max(255).optional(),
    address: z.string().max(500).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    county: z.string().max(100).optional(),
    postcode: z.string().max(20).optional(),
    country: z.string().max(50).optional(),
    property_type: z.string().min(1, 'Property type is required'),
    is_primary: z.boolean().default(false),
    photos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed').optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.address || data.address_line1, {
    message: 'Address is required (provide address or address_line1)',
  });

export const updatePropertyRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  bedrooms: z.number().int('Bedrooms must be a whole number').min(0).max(50).optional().nullable(),
  bathrooms: z.number().int('Bathrooms must be a whole number').min(0).max(50).optional().nullable(),
  squareFeet: z.number().positive('Square feet must be positive').max(100_000).optional().nullable(),
  yearBuilt: z.number().int().min(1600).max(new Date().getFullYear() + 5).optional().nullable(),
  photos: z.array(z.string().url('Invalid photo URL')).max(20, 'Maximum 20 photos allowed').optional(),
});

export const propertyFavoriteSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
});

// ── Inferred types ─────────────────────────────────────────────────

export type CreatePropertyRequest = z.infer<typeof createPropertyRequestSchema>;
export type UpdatePropertyRequest = z.infer<typeof updatePropertyRequestSchema>;
export type PropertyFavoriteInput = z.infer<typeof propertyFavoriteSchema>;
