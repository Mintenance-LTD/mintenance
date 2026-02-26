import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ExportService } from '@/lib/services/admin/ExportService';
import { InternalServerError } from '@/lib/errors/api-error';

export const GET = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request) => {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') as 'csv' | 'pdf' || 'csv';
  const role = searchParams.get('role');
  const verified = searchParams.get('verified');
  const search = searchParams.get('search');

  let query = serverSupabase
    .from('profiles')
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
    const sanitizedSearch = search
      .replace(/[^a-zA-Z0-9\s\-'@.]/g, '')
      .substring(0, 100)
      .trim();

    if (sanitizedSearch.length > 0) {
      query = query.or(`email.ilike.%${sanitizedSearch}%,first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%`);
    }
  }

  const { data: users, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching users for export', error);
    throw new InternalServerError('Failed to fetch users');
  }

  const file = await ExportService.exportUsers(users || [], format);

  const body: BodyInit = Buffer.isBuffer(file.content)
    ? new Uint8Array(file.content)
    : file.content;

  return new NextResponse(body, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    },
  });
});
