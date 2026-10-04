import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { sanitizeIlikePattern } from '@/lib/utils/sanitize-postgrest';
import { InternalServerError } from '@/lib/errors/api-error';

const schema = z.object({
  query: z.string().trim().min(1).max(500),
  filters: z.object({
    location: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    rating: z.number().min(0).max(5).optional(),
    availability: z.string().max(30).optional(),
    priceRange: z.object({ min: z.number().nonnegative().optional(), max: z.number().nonnegative().optional() }).optional(),
  }).strict().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// Beta public search uses the privacy-limited directory. Job search belongs to
// the authenticated /api/jobs endpoint. Do not reintroduce service-role job
// queries or raw profile/semantic results into this anonymous response.
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 10 } },
  async (request) => {
    let input: unknown;
    try { input = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = schema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 });
    const { query, filters = {}, limit } = parsed.data;
    const term = sanitizeIlikePattern(query, 200);
    if (!term) return NextResponse.json({ results: [], count: 0, usedFallback: true, searchMethod: 'full-text' });
    let search = serverSupabase.from('profile_directory')
      .select('id, first_name, last_name, company_name, bio, city, rating, is_available, hourly_rate, skills')
      .eq('role', 'contractor')
      .or('verified.eq.true,admin_verified.eq.true')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,company_name.ilike.%${term}%,bio.ilike.%${term}%`)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('id')
      .limit(limit);
    if (filters.location) {
      const city = sanitizeIlikePattern(filters.location);
      if (city) search = search.ilike('city', `%${city}%`);
    }
    if (filters.rating !== undefined) search = search.gte('rating', filters.rating);
    if (filters.category) search = search.contains('skills', [filters.category]);
    if (filters.availability === 'available') search = search.eq('is_available', true);
    if (filters.priceRange?.min !== undefined) search = search.gte('hourly_rate', filters.priceRange.min);
    if (filters.priceRange?.max !== undefined) search = search.lte('hourly_rate', filters.priceRange.max);
    const { data, error } = await search;
    if (error) throw new InternalServerError('Search is currently unavailable');
    const results = (data ?? []).map(person => ({
      id: person.id,
      type: 'contractor',
      title: person.company_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Contractor',
      description: person.bio || '',
      relevanceScore: 1,
      metadata: {
        location: person.city || undefined,
        rating: person.rating ?? undefined,
        availability: person.is_available ? 'available' : 'unavailable',
        price: person.hourly_rate ?? undefined,
      },
    }));
    return NextResponse.json({ results, count: results.length, usedFallback: true, searchMethod: 'full-text' });
  },
);