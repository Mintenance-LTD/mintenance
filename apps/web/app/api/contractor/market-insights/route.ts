/**
 * GET /api/contractor/market-insights
 * Fetch market demand data by service category for the contractor's area
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (_request, { user }) => {
    // Fetch job counts by category from the last 90 days
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select('category, budget_min, budget_max, status')
      .gte('created_at', since);

    if (error) {
      logger.error('Failed to fetch market insights', error, {
        service: 'market-insights',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch market insights');
    }

    // Aggregate by category
    const categoryMap = new Map<
      string,
      { count: number; totalBudget: number; budgetEntries: number }
    >();
    for (const job of jobs || []) {
      const cat = job.category || 'general';
      const existing = categoryMap.get(cat) || {
        count: 0,
        totalBudget: 0,
        budgetEntries: 0,
      };
      existing.count++;
      if (job.budget_min || job.budget_max) {
        const avg =
          ((Number(job.budget_min) || 0) + (Number(job.budget_max) || 0)) / 2;
        existing.totalBudget += avg;
        existing.budgetEntries++;
      }
      categoryMap.set(cat, existing);
    }

    // Count contractors per category (competition). Skills live on
    // `profiles.skills` (a text array) keyed by role — `contractor_profiles`
    // only holds Stripe/subscription columns and has no `specializations`,
    // so the previous query silently returned nothing and every
    // competition_count was 0.
    const { data: contractors } = await serverSupabase
      .from('profiles')
      .select('skills')
      .eq('role', 'contractor')
      .not('skills', 'is', null);

    const competitionMap = new Map<string, number>();
    for (const c of contractors || []) {
      const specs = Array.isArray(c.skills) ? c.skills : [];
      for (const spec of specs) {
        competitionMap.set(
          String(spec),
          (competitionMap.get(String(spec)) || 0) + 1
        );
      }
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        id: category,
        category,
        demand_level:
          data.count >= 5
            ? 'high'
            : data.count >= 2
              ? 'medium'
              : ('low' as 'high' | 'medium' | 'low'),
        avg_price:
          data.budgetEntries > 0
            ? Math.round(data.totalBudget / data.budgetEntries)
            : 0,
        job_count: data.count,
        competition_count: competitionMap.get(category) || 0,
      })
    );

    categories.sort((a, b) => b.job_count - a.job_count);

    return NextResponse.json({ categories });
  }
);
