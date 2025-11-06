import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ExportService } from '@/lib/services/admin/ExportService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as 'csv' | 'pdf' || 'csv';
    const role = searchParams.get('role');
    const verified = searchParams.get('verified');
    const search = searchParams.get('search');

    // Build query
    let query = serverSupabase
      .from('users')
      .select('id, email, first_name, last_name, role, company_name, admin_verified, created_at, updated_at')
      .is('deleted_at', null);

    if (role && (role === 'contractor' || role === 'homeowner')) {
      query = query.eq('role', role);
    }

    if (verified === 'true') {
      query = query.eq('admin_verified', true);
    } else if (verified === 'false') {
      query = query.eq('admin_verified', false);
    } else if (verified === 'pending') {
      query = query.eq('role', 'contractor').eq('admin_verified', false).not('company_name', 'is', null).not('license_number', 'is', null);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      query = query.or(`email.ilike.%${searchLower}%,first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%,company_name.ilike.%${searchLower}%`);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching users for export', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Generate export file
    const file = await ExportService.exportUsers(users || [], format);

    return new NextResponse(file.content, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting users', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

