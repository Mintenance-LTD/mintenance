import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { NotFoundError } from '@/lib/errors/api-error';
import { getInspectionPhotoBytes } from '@/lib/services/property-team/inspection-photo-bytes';
import {
  getReport,
  uuid,
  databaseError,
  privateHeaders,
  reply,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (request, { user, params }) => {
  await getReport(user.id, params.id, params.reportId);
  uuid(params.photoId);
  const reference = await db
    .from('property_inspection_photos')
    .select('source_photo_id')
    .eq('property_id', params.id)
    .eq('report_id', params.reportId)
    .eq('id', params.photoId)
    .maybeSingle();
  databaseError(reference.error);
  if (!reference.data?.source_photo_id)
    throw new NotFoundError('Photo no longer available');
  const { data, mime } = await getInspectionPhotoBytes(
    params.id,
    reference.data.source_photo_id
  );
  if (request.nextUrl.searchParams.get('format') === 'base64')
    return reply({
      dataUrl:
        'data:' +
        mime +
        ';base64,' +
        Buffer.from(await data.arrayBuffer()).toString('base64'),
    });
  return new NextResponse(data, {
    headers: {
      ...privateHeaders,
      'Content-Type': mime,
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
});
