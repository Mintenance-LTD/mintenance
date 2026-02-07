import { NextRequest, NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import type { MaterialCategory, MaterialQueryFilters } from '@mintenance/shared/types/materials';
import { logger } from '@mintenance/shared';

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
export async function GET(request: NextRequest) {
  try {
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
  } catch (error: unknown) {
    logger.error('GET /api/materials exception', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials - Create a new material (Admin only)
 *
 * Request Body: CreateMaterialInput
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin role
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category || !body.unit_price || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, unit_price, unit' },
        { status: 400 }
      );
    }

    const material = await materialsService.createMaterial(body);

    return NextResponse.json(material, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST /api/materials exception', error);
    return NextResponse.json(
      { error: 'Failed to create material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
