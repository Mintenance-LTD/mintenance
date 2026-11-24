import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  APIError,
  BadRequestError,
  NotFoundError,
} from '@/lib/errors/api-error';
import {
  inspectionBody,
  access,
  writeAccess,
  mayCreate,
  offset,
  folderInput,
  folderUpdate,
  folderColumns,
  databaseError,
  reply,
  uuid,
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (request, { user, params }) => {
  const { role } = await access(user.id, params.id);
  const folderId = request.nextUrl.searchParams.get('folder');
  if (folderId !== null) {
    uuid(folderId);
    const { data, error } = await db
      .from('property_tenancy_folders')
      .select(folderColumns)
      .eq('property_id', params.id)
      .eq('id', folderId)
      .maybeSingle();
    databaseError(error);
    if (!data) throw new NotFoundError('Tenancy folder not found');
    return reply({
      items: [data],
      hasMore: false,
      canCreate: await mayCreate(params.id, role),
    });
  }
  const start = offset(request.nextUrl.searchParams.get('offset'));
  const { data, error } = await db
    .from('property_tenancy_folders')
    .select(folderColumns)
    .eq('property_id', params.id)
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
  const parsed = folderInput.safeParse(await inspectionBody(request));
  if (!parsed.success)
    throw new BadRequestError('Enter a folder name and valid tenancy dates.');
  const v = parsed.data;
  const { data, error } = await db.rpc('create_property_tenancy_folder', {
    p_actor: user.id,
    p_property: params.id,
    p_label: v.label,
    p_starts: v.starts_on,
    p_ends: v.ends_on,
  });
  databaseError(error);
  return reply({ id: data }, 201);
});
export const PATCH = withApiHandler({}, async (request, { user, params }) => {
  await writeAccess(user.id, params.id);
  const parsed = folderUpdate.safeParse(await inspectionBody(request));
  if (!parsed.success)
    throw new BadRequestError('Check the folder name and tenancy dates.');
  const v = parsed.data;
  const { data, error } = await db.rpc(
    'update_property_tenancy_folder_with_confirmation',
    {
      p_actor: user.id,
      p_property: params.id,
      p_folder: v.id,
      p_revision: v.revision,
      p_label: v.label,
      p_starts: v.starts_on,
      p_ends: v.ends_on,
      p_confirm: v.confirm_inspection_date_change ?? false,
    }
  );
  if (error?.code === 'PT422')
    throw new APIError(
      'TENANCY_DATE_CHANGE_EXCLUDES_INSPECTIONS',
      'These dates put at least one saved inspection outside the tenancy period.',
      422
    );
  databaseError(error);
  return reply({ id: data });
});
