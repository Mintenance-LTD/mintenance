import { NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import { logger } from '@mintenance/shared';
import type { MaterialCategory, MaterialQueryFilters } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/materials - Query materials with filters
 *
 * Query Parameters:
 * - category: MaterialCategory (filter by category)
 * - in_stock: boolean (filter by availability)
 * - supplier_id: string (filter by supplier)
 * - search: string (search by name)
 * - min_price: number (minimum price filter)
 * - max_price: number (maximum price filter)
 * - limit: number (page size, default 50)
 * - offset: number (pagination offset, default 0)
 * - sort_by: 'name' | 'unit_price' | 'created_at' | 'category' (default 'name')
 * - sort_order: 'asc' | 'desc' (default 'asc')
 */
export const GET = withApiHandler({ auth: false, rateLimit: { maxRequests: 30 } }, async (request) => {
  const { searchParams } = request.nextUrl;

  // Parse query parameters
  const filters: MaterialQueryFilters = {
    category: searchParams.get('category') as MaterialCategory | undefined,
    in_stock: searchParams.get('in_stock') === 'true' ? true :
              searchParams.get('in_stock') === 'false' ? false : undefined,
    supplier_id: searchParams.get('supplier_id') || undefined,
    search: searchParams.get('search') || undefined,
    min_price: searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined,
    max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    sort_by: (searchParams.get('sort_by') as 'name' | 'unit_price' | 'created_at' | 'category') || 'name',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc',
  };

  // If category is provided, use category-specific query
  if (filters.category) {
    const result = await materialsService.getMaterialsByCategory(filters.category, filters);
    return NextResponse.json(result);
  }

  // Otherwise, do a general search/filter
  let queryBuilder = materialsService['supabase']
    .from('materials')
    .select('*', { count: 'exact' });

  if (filters.in_stock !== undefined) {
    queryBuilder = queryBuilder.eq('in_stock', filters.in_stock);
  }

  if (filters.supplier_id) {
    queryBuilder = queryBuilder.eq('supplier_id', filters.supplier_id);
  }

  if (filters.search) {
    queryBuilder = queryBuilder.ilike('name', `%${filters.search}%`);
  }

  if (filters.min_price !== undefined) {
    queryBuilder = queryBuilder.gte('unit_price', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    queryBuilder = queryBuilder.lte('unit_price', filters.max_price);
  }

  queryBuilder = queryBuilder
    .order(filters.sort_by || 'name', { ascending: filters.sort_order === 'asc' })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    logger.error('GET /api/materials error', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    materials: data || [],
    total: count || 0,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });
});

/**
 * POST /api/materials - Create a new material (Admin only)
 *
 * Request Body: CreateMaterialInput
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 30 } }, async (request) => {
  const materialCategories = [
    'lumber', 'concrete', 'brick', 'tile', 'insulation', 'drywall',
    'paint', 'roofing', 'plumbing', 'electrical', 'hardware', 'glass',
    'sealants', 'fasteners', 'other',
  ] as const;

  const materialUnits = [
    'each', 'meter', 'sqm', 'liter', 'kg', 'bundle', 'box', 'sqft', 'sheet',
  ] as const;

  const createMaterialSchema = z.object({
    name: z.string().min(1, 'Name is required').max(300),
    category: z.enum(materialCategories, { errorMap: () => ({ message: 'Invalid material category' }) }),
    description: z.string().max(2000).optional(),
    unit_price: z.number().positive('Unit price must be positive'),
    unit: z.enum(materialUnits, { errorMap: () => ({ message: 'Invalid unit type' }) }),
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
  });

  const validation = await validateRequest(request, createMaterialSchema);
  if (validation instanceof NextResponse) return validation;
  const { data: body } = validation;

  const material = await materialsService.createMaterial(body);

  return NextResponse.json(material, { status: 201 });
});
