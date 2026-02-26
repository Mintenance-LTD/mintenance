import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { materialsService } from '@/lib/services/MaterialsService';
import type { MaterialCategory } from '@mintenance/shared';

/**
 * GET /api/materials/search - Fuzzy search for materials
 *
 * Query Parameters:
 * - q: string (REQUIRED - search query)
 * - category: MaterialCategory (optional - filter by category)
 * - in_stock: boolean (optional - filter by availability, default true)
 * - limit: number (optional - max results, default 20)
 * - min_similarity: number (optional - minimum similarity score 0-1, default 0.3)
 */
export const GET = withApiHandler({ auth: false }, async (request) => {
  const { searchParams } = request.nextUrl;

  const query = searchParams.get('q');
  if (!query) {
    return NextResponse.json(
      { error: 'Missing required parameter: q (search query)' },
      { status: 400 }
    );
  }

  const category = searchParams.get('category') as MaterialCategory | undefined;
  const in_stock = searchParams.get('in_stock') !== 'false';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const min_similarity = searchParams.get('min_similarity')
    ? parseFloat(searchParams.get('min_similarity')!)
    : 0.3;

  const results = await materialsService.findSimilarMaterials(query, {
    category,
    limit,
  });

  const filteredResults = in_stock ? results.filter((m) => m.in_stock) : results;
  const similarResults = filteredResults.filter((m) => (m.similarity || 0) >= min_similarity);

  return NextResponse.json({
    query,
    matches: similarResults,
    total: similarResults.length,
  });
});
