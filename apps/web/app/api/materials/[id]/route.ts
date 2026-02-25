import { NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/materials/[id] - Get a single material by ID
 */
export const GET = withApiHandler({ auth: false, rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const { id } = params;

  if (!id) {
    throw new BadRequestError('Material ID is required');
  }

  const material = await materialsService.getMaterialById(id as string);

  if (!material) {
    throw new NotFoundError('Material not found');
  }

  return NextResponse.json(material);
});

/**
 * PATCH /api/materials/[id] - Update a material (Admin only)
 */
export const PATCH = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const { id } = params;

  if (!id) {
    throw new BadRequestError('Material ID is required');
  }

  const materialCategories = [
    'lumber', 'concrete', 'brick', 'tile', 'insulation', 'drywall',
    'paint', 'roofing', 'plumbing', 'electrical', 'hardware', 'glass',
    'sealants', 'fasteners', 'other',
  ] as const;

  const materialUnits = [
    'each', 'meter', 'sqm', 'liter', 'kg', 'bundle', 'box', 'sqft', 'sheet',
  ] as const;

  const updateMaterialSchema = z.object({
    name: z.string().min(1).max(300).optional(),
    category: z.enum(materialCategories, { errorMap: () => ({ message: 'Invalid material category' }) }).optional(),
    description: z.string().max(2000).optional(),
    unit_price: z.number().positive('Unit price must be positive').optional(),
    unit: z.enum(materialUnits, { errorMap: () => ({ message: 'Invalid unit type' }) }).optional(),
    bulk_quantity: z.number().int().positive().optional(),
    bulk_unit_price: z.number().positive().optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().max(100).optional(),
    brand: z.string().max(200).optional(),
    in_stock: z.boolean().optional(),
    stock_quantity: z.number().int().min(0).optional(),
    lead_time_days: z.number().int().min(0).optional(),
    specifications: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    image_url: z.string().url().max(2000).optional(),
    supplier_name: z.string().max(300).optional(),
    supplier_id: z.string().uuid().optional(),
    updated_by: z.string().uuid().optional(),
  });

  const validation = await validateRequest(request, updateMaterialSchema);
  if (validation instanceof NextResponse) return validation;
  const { data: body } = validation;

  const updatedMaterial = await materialsService.updateMaterial(id as string, body);

  return NextResponse.json(updatedMaterial);
});

/**
 * DELETE /api/materials/[id] - Delete a material (Admin only)
 */
export const DELETE = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const { id } = params;

  if (!id) {
    throw new BadRequestError('Material ID is required');
  }

  await materialsService.deleteMaterial(id as string);

  return NextResponse.json(
    { success: true, message: 'Material deleted successfully' },
    { status: 200 }
  );
});
