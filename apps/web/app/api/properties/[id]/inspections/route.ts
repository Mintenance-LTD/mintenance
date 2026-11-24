import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  APIError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/api-error';
import {
  inspectionBody,
  access,
  writeAccess,
  mayCreate,
  offset,
  uuid,
  reportInput,
  reportColumns,
  reportCorrections,
  databaseError,
  reply,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (request, { user, params }) => {
  const { role } = await access(user.id, params.id);
  const folder = uuid(request.nextUrl.searchParams.get('folder') ?? '');
  const { data: parent, error: parentError } = await db
    .from('property_tenancy_folders')
    .select('id')
    .eq('property_id', params.id)
    .eq('id', folder)
    .maybeSingle();
  databaseError(parentError);
  if (!parent) throw new NotFoundError('Folder not found');
  const start = offset(request.nextUrl.searchParams.get('offset'));
  const { data, error } = await db
    .from('property_inspection_reports')
    .select(reportColumns)
    .eq('property_id', params.id)
    .eq('folder_id', folder)
    .order('created_at', { ascending: false })
    .order('id')
    .range(start, start + 25);
  databaseError(error);
  const page = (data ?? []).slice(0, 25);
  const [canCreate, corrections] = await Promise.all([
    mayCreate(params.id, role),
    reportCorrections(
      params.id,
      page.map((report) => report.id)
    ),
  ]);
  return reply({
    items: page.map((report) => ({
      ...report,
      corrected_by_report_id: corrections.get(report.id) ?? null,
    })),
    hasMore: (data ?? []).length > 25,
    canCreate,
  });
});
export const POST = withApiHandler({}, async (request, { user, params }) => {
  await writeAccess(user.id, params.id);
  const parsed = reportInput.safeParse(await inspectionBody(request));
  if (!parsed.success)
    throw new BadRequestError(
      'Check the report details and choose up to 50 different photos.'
    );
  const v = parsed.data;
  if (v.kind !== 'routine' && !v.notes && !v.photo_ids.length && !v.outcome)
    throw new APIError(
      'INSPECTION_EVIDENCE_REVIEW_REQUIRED',
      'Add observations or photos, select No issues found, or confirm saving without evidence.',
      422
    );
  const { data, error } = await db.rpc(
    'create_property_inspection_report_with_outcome',
    {
      p_actor: user.id,
      p_property: params.id,
      p_folder: v.folder_id,
      p_title: v.title,
      p_inspected: v.inspected_on,
      p_kind: v.kind,
      p_notes: v.notes,
      p_photos: v.photo_ids,
      p_corrects: v.corrects_report_id ?? null,
      p_exception: v.date_exception_reason ?? null,
      p_outcome: v.outcome ?? null,
    }
  );
  if (error?.code === 'PT422')
    throw new APIError(
      'INSPECTION_OUTSIDE_TENANCY',
      'Explain why the inspection falls outside the current tenancy dates.',
      422
    );
  if (v.corrects_report_id && error?.code === '23505')
    throw new ConflictError(
      'This report was already corrected. Open the latest version to continue.'
    );
  databaseError(error);
  return reply({ id: data }, 201);
});
