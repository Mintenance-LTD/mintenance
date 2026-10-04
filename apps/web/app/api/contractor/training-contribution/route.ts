import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Beta hold: re-enable only with recorded informed consent, private storage,
// contributor attribution and withdrawal handling. No image bytes are accepted.
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async () => NextResponse.json(
    { error: 'Training contributions are currently unavailable', code: 'TRAINING_CONTRIBUTIONS_UNAVAILABLE' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  ),
);
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: stats, error } = await serverSupabase.rpc('get_contractor_stats', { contractor_uuid: user.id });
    if (error) throw error;

    const { data: recent } = await serverSupabase
      .from('maintenance_training_labels')
      .select('id, issue_type, created_at')
      .eq('verified_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: stats?.[0] || { total_contributions: 0, quality_score: 0, credits_earned: 0, level: 'bronze', next_level_requirements: 'Silver: 50 verified contributions' },
      recentContributions: recent || [],
    });
  }
);
