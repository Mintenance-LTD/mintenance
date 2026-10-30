import { z } from 'zod';
import { NextResponse } from 'next/server';
import { isInspectionDate, logger } from '@mintenance/shared';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { PropertyTeamService } from './PropertyTeamService';
import {
  APIError,
  ConflictError,
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from '@/lib/errors/api-error';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';
export const date = z.string().refine(isInspectionDate, 'Enter a valid date');
export const folderInput = z
  .object({
    label: z.string().trim().min(1).max(120),
    starts_on: date,
    ends_on: date.nullable(),
  })
  .strict()
  .refine(
    (v) => !v.ends_on || v.ends_on >= v.starts_on,
    'End date must follow start date'
  );
export const folderUpdate = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().min(0).max(2147483646),
    label: z.string().trim().min(1).max(120),
    starts_on: date,
    ends_on: date.nullable(),
  })
  .strict()
  .refine(
    (v) => !v.ends_on || v.ends_on >= v.starts_on,
    'End date must follow start date'
  );
export const reportInput = z
  .object({
    folder_id: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    inspected_on: date,
    kind: z.enum(['check_in', 'routine', 'check_out']),
    notes: z.string().trim().max(10000),
    photo_ids: z.array(z.string().uuid()).max(50),
  })
  .strict()
  .refine(
    (v) => new Set(v.photo_ids).size === v.photo_ids.length,
    'Choose each photo once'
  );
export const folderColumns = 'id,label,starts_on,ends_on,created_at,revision';
export const reportColumns =
  'id,folder_id,title,inspected_on,kind,notes,created_at';
export const privateHeaders = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie, Authorization',
  'X-Content-Type-Options': 'nosniff',
};
export function reply(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: privateHeaders });
}
export function uuid(value: string) {
  if (!z.string().uuid().safeParse(value).success)
    throw new BadRequestError('Invalid record identifier');
  return value;
}
export function offset(value: string | null) {
  const parsed = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .safeParse(value ?? 0);
  if (!parsed.success) throw new BadRequestError('Invalid page');
  return parsed.data;
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '40001')
    throw new ConflictError('This folder changed. Reload before saving.');
  if (error.code === '42501')
    throw new NotFoundError('Property record not found');
  if (['22023', '23503', '23514', '22007', '22008'].includes(error.code ?? ''))
    throw new BadRequestError(
      'Check the folder, dates and selected photos, then retry.'
    );
  logger.warn('Property inspection records unavailable', {
    service: 'property-inspections',
    code: error.code ?? 'UNKNOWN',
  });
  throw new ServiceUnavailableError('Tenancy folders and inspection reports');
}
export async function access(actor: string, propertyId: string, write = false) {
  uuid(propertyId);
  // No global admin bypass: reports are for existing property members only.
  const result = await PropertyTeamService.authorize(
    actor,
    propertyId,
    write ? 'edit' : 'view'
  );
  if (!result.authorized) throw new NotFoundError('Property record not found');
  return result;
}
export async function mayCreate(propertyId: string, role: string | null) {
  if (
    !PropertyTeamService.canPerform(
      role as Awaited<ReturnType<typeof PropertyTeamService.getRole>>,
      'edit'
    )
  )
    return false;
  const { data, error } = await db
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();
  databaseError(error);
  if (!data) throw new NotFoundError('Property not found');
  const tier = await getEffectiveHomeownerTier(data.owner_id);
  return hasFeatureAccess('HOMEOWNER_ROOM_PHOTOS', 'homeowner', tier);
}
export async function writeAccess(actor: string, propertyId: string) {
  const { role } = await access(actor, propertyId, true);
  if (!(await mayCreate(propertyId, role)))
    throw new APIError(
      'SUBSCRIPTION_REQUIRED',
      'The property owner needs a Landlord or Agency plan to create inspection records.',
      402
    );
}
export async function getReport(
  actor: string,
  propertyId: string,
  reportId: string
) {
  await access(actor, propertyId);
  uuid(reportId);
  const { data, error } = await db
    .from('property_inspection_reports')
    .select(reportColumns)
    .eq('property_id', propertyId)
    .eq('id', reportId)
    .maybeSingle();
  databaseError(error);
  if (!data) throw new NotFoundError('Inspection report not found');
  return data;
}
export async function inspectionBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new BadRequestError('Missing request body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new BadRequestError('Inspection details are too large');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new BadRequestError('Invalid inspection details');
    }
  } finally {
    reader.releaseLock();
  }
}
