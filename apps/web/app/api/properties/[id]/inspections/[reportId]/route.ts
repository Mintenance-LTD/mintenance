import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  getReport,
  folderColumns,
  databaseError,
  reply,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (_request, { user, params }) => {
  const report = await getReport(user.id, params.id, params.reportId);
  const [folder, photos] = await Promise.all([
    db
      .from('property_tenancy_folders')
      .select(folderColumns)
      .eq('property_id', params.id)
      .eq('id', report.folder_id)
      .single(),
    db
      .from('property_inspection_photos')
      .select('id,room_type,file_name,uploaded_at,source_photo_id')
      .eq('property_id', params.id)
      .eq('report_id', params.reportId)
      .order('room_type')
      .order('id')
      .limit(50),
  ]);
  databaseError(folder.error);
  databaseError(photos.error);
  return reply({
    report,
    folder: folder.data,
    photos: (photos.data ?? []).map(({ source_photo_id, ...photo }) => ({
      ...photo,
      available: !!source_photo_id,
    })),
  });
});
