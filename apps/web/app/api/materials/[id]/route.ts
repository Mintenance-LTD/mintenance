import { NextRequest, NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import { logger } from '@mintenance/shared';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/**
 * GET /api/materials/[id] - Get a single material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const material = await materialsService.getMaterialById(id);

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error: unknown) {
    logger.error('GET /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to fetch material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/[id] - Update a material (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await requireAdmin(request);
    if (isAdminError(adminResult)) {
      return adminResult.error;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
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

    const updatedMaterial = await materialsService.updateMaterial(id, body);

    return NextResponse.json(updatedMaterial);
  } catch (error: unknown) {
    logger.error('PATCH /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to update material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id] - Delete a material (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await requireAdmin(request);
    if (isAdminError(adminResult)) {
      return adminResult.error;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    await materialsService.deleteMaterial(id);

    return NextResponse.json(
      { success: true, message: 'Material deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('DELETE /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to delete material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
