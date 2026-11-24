import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { reportPhotos } from '@/lib/reports/followup';

export const GET = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user }) => {
    const id = z.uuid().safeParse(request.nextUrl.searchParams.get('reportId'));
    if (!id.success) throw new BadRequestError('Invalid report reference');
    const { data: report, error } = await serverSupabase
      .from('anonymous_reports')
      .select(
        'category,description,urgency,property_id,job_id,status,properties!inner(owner_id,address),anonymous_report_tokens!inner(owner_id)'
      )
      .eq('id', id.data)
      .eq('properties.owner_id', user.id)
      .eq('anonymous_report_tokens.owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    const property = Array.isArray(report?.properties)
      ? report.properties[0]
      : report?.properties;
    if (!report || !report.property_id || property?.owner_id !== user.id)
      throw new NotFoundError('Report unavailable');
    if (report.job_id)
      return NextResponse.json(
        { jobId: report.job_id },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    if (!['new', 'acknowledged'].includes(report.status ?? ''))
      throw new NotFoundError('Report unavailable for job creation');
    const photos = await reportPhotos(id.data).catch(() => null);
    return NextResponse.json(
      {
        description: report.description,
        category: report.category,
        urgency: report.urgency,
        propertyId: report.property_id,
        location: property.address,
        photos,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  }
);
