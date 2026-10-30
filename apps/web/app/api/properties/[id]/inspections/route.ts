import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import {
  inspectionBody,
  access,
  writeAccess,
  mayCreate,
  offset,
  uuid,
  reportInput,
  reportColumns,
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
  return reply({
    items: (data ?? []).slice(0, 25),
    hasMore: (data ?? []).length > 25,
    canCreate: await mayCreate(params.id, role),
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
  const { data, error } = await db.rpc('create_property_inspection_report', {
    p_actor: user.id,
    p_property: params.id,
    p_folder: v.folder_id,
    p_title: v.title,
    p_inspected: v.inspected_on,
    p_kind: v.kind,
    p_notes: v.notes,
    p_photos: v.photo_ids,
  });
  databaseError(error);
  return reply({ id: data }, 201);
});
