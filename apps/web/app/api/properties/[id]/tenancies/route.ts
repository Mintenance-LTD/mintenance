import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { readTenancyDateReview, type TenancyFolder } from '@mintenance/shared';
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
    return folderPage(params.id, user.id, role, [data as TenancyFolder], false);
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
  return folderPage(
    params.id,
    user.id,
    role,
    (data ?? []).slice(0, 25) as TenancyFolder[],
    (data ?? []).length > 25
  );
});
async function folderPage(
  propertyId: string,
  actor: string,
  role: string | null,
  items: TenancyFolder[],
  hasMore: boolean
) {
  const [canCreate, checkouts] = await Promise.all([
    mayCreate(propertyId, role),
    items.length
      ? db.rpc('read_property_tenancy_checkout_folders', {
          p_property: propertyId,
          p_folders: items.map((item) => item.id),
        })
      : null,
  ]);
  databaseError(checkouts?.error ?? null);
  const recorded = new Set(
    (checkouts?.data ?? []).map((row: { folder_id: string }) => row.folder_id)
  );
  return reply({
    items: items.map((item) => ({
      ...item,
      check_out_recorded: recorded.has(item.id),
    })),
    hasMore,
    canCreate,
    ...(canCreate ? { draftScope: actor } : {}),
  });
}

export const POST = withApiHandler({}, async (request, { user, params }) => {
  await writeAccess(user.id, params.id);
  const parsed = folderInput.safeParse(await inspectionBody(request));
  if (!parsed.success)
    throw new BadRequestError('Enter a folder name and valid tenancy dates.');
  return saveTenancy(user.id, params.id, parsed.data);
});
export const PATCH = withApiHandler({}, async (request, { user, params }) => {
  await writeAccess(user.id, params.id);
  const parsed = folderUpdate.safeParse(await inspectionBody(request));
  if (!parsed.success)
    throw new BadRequestError('Check the folder name and tenancy dates.');
  return saveTenancy(user.id, params.id, parsed.data, parsed.data);
});

async function saveTenancy(
  actor: string,
  propertyId: string,
  value: ReturnType<typeof folderInput.parse>,
  edit?: Pick<
    ReturnType<typeof folderUpdate.parse>,
    'id' | 'revision' | 'confirm_inspection_date_change'
  >
) {
  const { data, error } = await db.rpc(
    'save_property_tenancy_folder_with_overlap',
    {
      p_actor: actor,
      p_property: propertyId,
      p_folder: edit?.id ?? null,
      p_revision: edit?.revision ?? null,
      p_label: value.label,
      p_starts: value.starts_on,
      p_ends: value.ends_on,
      p_confirm_dates: edit?.confirm_inspection_date_change ?? false,
      p_overlap_token: value.overlap_token ?? null,
    }
  );
  if (error?.code === 'PT422') {
    let review = null;
    try {
      review = readTenancyDateReview(JSON.parse(error.details));
    } catch {
      // The warning also works with a database that returns no report details.
    }
    throw new APIError(
      'TENANCY_DATE_CHANGE_EXCLUDES_INSPECTIONS',
      'These dates put at least one saved inspection outside the tenancy period.',
      422,
      review ?? undefined
    );
  }
  databaseError(error);
  if (data?.overlap)
    throw new APIError(
      'TENANCY_PERIOD_OVERLAP',
      'These dates overlap another tenancy on this property.',
      409,
      data.overlap
    );
  if (typeof data?.id !== 'string')
    throw new Error('Tenancy save did not return a record');
  return reply({ id: data.id }, edit ? 200 : 201);
}
