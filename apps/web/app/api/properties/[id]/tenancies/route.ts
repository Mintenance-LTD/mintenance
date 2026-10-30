import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
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
} from '@/lib/services/property-team/property-inspections';
export const GET = withApiHandler({}, async (request, { user, params }) => {
  const { role } = await access(user.id, params.id);
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
  const { data, error } = await db.rpc('update_property_tenancy_folder', {
    p_actor: user.id,
    p_property: params.id,
    p_folder: v.id,
    p_revision: v.revision,
    p_label: v.label,
    p_starts: v.starts_on,
    p_ends: v.ends_on,
  });
  databaseError(error);
  return reply({ id: data });
});
