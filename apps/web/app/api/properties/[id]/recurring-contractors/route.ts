import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { serverSupabase } from '@/lib/api/supabaseServer';
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_request, { user, params }) => {
    const property = await getPropertyForManagement(
      user,
      params.id,
      'manage_maintenance'
    );
    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select('contractor_id')
      .eq('homeowner_id', property.owner_id)
      .eq('status', 'completed')
      .not('contractor_id', 'is', null);
    if (error)
      throw new Error('Previously hired contractors could not be loaded');
    const ids = [...new Set((jobs ?? []).map((j) => j.contractor_id))];
    if (!ids.length) return NextResponse.json({ contractors: [] });
    const { data, error: profileError } = await serverSupabase
      .from('profiles')
      .select('id,first_name,last_name')
      .in('id', ids)
      .eq('role', 'contractor');
    if (profileError) throw new Error('Contractor names could not be loaded');
    return NextResponse.json(
      {
        contractors: (data ?? []).map((p) => ({
          id: p.id,
          name:
            [p.first_name, p.last_name].filter(Boolean).join(' ') ||
            'Contractor',
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);
