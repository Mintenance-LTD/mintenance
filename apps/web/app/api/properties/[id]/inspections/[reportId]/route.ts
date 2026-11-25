import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  getInspectionRecord,
  databaseError,
  reply,
  mayCreate,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (_request, { user, params }) => {
  const { report, role, folder, photos } = await getInspectionRecord(
    user.id,
    params.id,
    params.reportId
  );
  const [canCreate, comparison] = await Promise.all([
    mayCreate(params.id, role),
    report.kind === 'check_out'
      ? db.rpc('read_tenancy_comparison_check_in', {
          p_property: params.id,
          p_folder: report.folder_id,
          p_on: report.inspected_on,
        })
      : null,
  ]);
  databaseError(comparison?.error ?? null);
  return reply({
    report,
    folder,
    canCreate,
    checkIn: comparison?.data?.[0] ?? null,
    photos,
  });
});
