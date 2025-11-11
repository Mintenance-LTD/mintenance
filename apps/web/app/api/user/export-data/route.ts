import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { checkGDPRRateLimit } from '@/lib/rate-limiting/admin-gdpr';

/**
 * POST /api/user/export-data
 * Export all user data (GDPR Right to Data Portability)
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting for GDPR endpoints
    const rateLimitResponse = await checkGDPRRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Log the export request for GDPR compliance
    await serverSupabase.from('gdpr_audit_log').insert({
      user_id: user.id,
      action: 'data_export',
      table_name: 'users',
      record_id: user.id,
      performed_by: user.id,
    });

    // Export user data
    const { data: userData } = await serverSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: properties } = await serverSupabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id);

    const { data: jobs } = await serverSupabase
      .from('jobs')
      .select('*')
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);

    const { data: messages } = await serverSupabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: userData,
      properties: properties || [],
      jobs: jobs || [],
      messages: messages || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mintenance-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting user data', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

