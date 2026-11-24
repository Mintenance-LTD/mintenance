import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  getReport,
  folderColumns,
  databaseError,
  reply,
  mayCreate,
  reportCorrections,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (_request, { user, params }) => {
  const { report, role } = await getReport(user.id, params.id, params.reportId);
  const [folder, photos, corrections, canCreate, comparison] =
    await Promise.all([
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
      reportCorrections(params.id, [params.reportId]),
      mayCreate(params.id, role),
      report.kind === 'check_out'
        ? db.rpc('read_tenancy_comparison_check_in', {
            p_property: params.id,
            p_folder: report.folder_id,
            p_on: report.inspected_on,
          })
        : null,
    ]);
  databaseError(folder.error);
  databaseError(photos.error);
  databaseError(comparison?.error ?? null);
  return reply({
    report: {
      ...report,
      corrected_by_report_id: corrections.get(params.reportId) ?? null,
    },
    folder: folder.data,
    canCreate,
    checkIn: comparison?.data?.[0] ?? null,
    photos: (photos.data ?? []).map((photo) => ({
      ...photo,
      available: !!photo.source_photo_id,
    })),
  });
});
