import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { NotFoundError, ServiceUnavailableError } from '@/lib/errors/api-error';
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
  const photo = await db
    .from('property_room_photos')
    .select('storage_path,mime_type')
    .eq('property_id', params.id)
    .eq('id', reference.data.source_photo_id)
    .maybeSingle();
  databaseError(photo.error);
  if (
    !photo.data ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
      photo.data.mime_type ?? ''
    )
  )
    throw new NotFoundError('Photo unavailable');
  const { data, error } = await db.storage
    .from('Job-storage')
    .download(photo.data.storage_path);
  if (error || !data) throw new ServiceUnavailableError('Inspection photo');
  if (data.size > 5 * 1024 * 1024)
    throw new ServiceUnavailableError('Inspection photo');
  if (request.nextUrl.searchParams.get('format') === 'base64')
    return reply({
      dataUrl:
        'data:' +
        photo.data.mime_type +
        ';base64,' +
        Buffer.from(await data.arrayBuffer()).toString('base64'),
    });
  return new NextResponse(data, {
    headers: {
      ...privateHeaders,
      'Content-Type': photo.data.mime_type,
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
});
