import { NextRequest, NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import type { MaterialCategory } from '@mintenance/shared/types/materials';

/**
 * GET /api/materials/search - Fuzzy search for materials
 *
 * Query Parameters:
 * - q: string (REQUIRED - search query)
 * - category: MaterialCategory (optional - filter by category)
 * - in_stock: boolean (optional - filter by availability, default true)
 * - limit: number (optional - max results, default 20)
 * - min_similarity: number (optional - minimum similarity score 0-1, default 0.3)
 *
 * Returns materials with similarity scores for better matching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json(
        { error: 'Missing required parameter: q (search query)' },
        { status: 400 }
      );
    }

    const category = searchParams.get('category') as MaterialCategory | undefined;
    const in_stock = searchParams.get('in_stock') !== 'false'; // Default true
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const min_similarity = searchParams.get('min_similarity')
      ? parseFloat(searchParams.get('min_similarity')!)
      : 0.3;

    // Use findSimilarMaterials for better fuzzy matching
    const results = await materialsService.findSimilarMaterials(query, {
      category,
      limit,
    });

    // Filter by in_stock if requested
    const filteredResults = in_stock
      ? results.filter(m => m.in_stock)
      : results;

    // Filter by minimum similarity
    const similarResults = filteredResults.filter(
      m => (m.similarity || 0) >= min_similarity
    );

    return NextResponse.json({
      query,
      matches: similarResults,
      total: similarResults.length,
    });
  } catch (error: any) {
    console.error('GET /api/materials/search exception:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}
