import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';

const BUCKET = 'property-documents';
const kinds = z.enum([
  'lease',
  'inspection',
  'warranty',
  'invoice',
  'certificate',
  'other',
]);
async function authorize(userId: string, propertyId: string) {
  if (!z.string().uuid().safeParse(propertyId).success)
    throw new BadRequestError('Invalid property reference');
  const access = await PropertyTeamService.authorize(
    userId,
    propertyId,
    'manage_compliance'
  );
  if (!access.authorized)
    throw new ForbiddenError(
      'Only property owners and managers can access these documents'
    );
}
export const GET = withApiHandler({}, async (request, { user, params }) => {
  await authorize(user.id, params.id);
  const documentId = request.nextUrl.searchParams.get('documentId');
  if (documentId) {
    if (!z.string().uuid().safeParse(documentId).success)
      throw new BadRequestError('Invalid document');
    const { data: doc, error } = await serverSupabase
      .from('property_document_files')
      .select('object_path,name')
      .eq('id', documentId)
      .eq('property_id', params.id)
      .eq('status', 'ready')
      .is('archived_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!doc) throw new NotFoundError('Document not found');
    const expectedPath = `${params.id}/${documentId}`;
    if (
      doc.object_path !== expectedPath ||
      expectedPath.includes('..') ||
      !/^[a-f0-9-]+\/[a-f0-9-]+$/i.test(expectedPath)
    )
      throw new BadRequestError('Document storage reference requires review');
    const { data, error: signedError } = await serverSupabase.storage
      .from(BUCKET)
      .createSignedUrl(expectedPath, 60, { download: doc.name });
    if (signedError) throw signedError;
    return NextResponse.json(
      { url: data.signedUrl },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new BadRequestError('Invalid page');
  let query = serverSupabase
    .from('property_document_files')
    .select(
      'id,name,kind,mime_type,size_bytes,created_at,updated_at,archived_at',
      { count: 'exact' }
    )
    .eq('property_id', params.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + 24);
  query =
    request.nextUrl.searchParams.get('archived') === '1'
      ? query.not('archived_at', 'is', null)
      : query.is('archived_at', null);
  const { data, error, count } = await query;
  if (error) throw error;
  return NextResponse.json(
    { documents: data || [], hasMore: offset + 25 < (count || 0) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
});
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 10 } },
  async (request, { user, params }) => {
    await authorize(user.id, params.id);
    const form = await request.formData();
    const file = form.get('file');
    const kind = kinds.safeParse(form.get('kind'));
    if (
      !(file instanceof File) ||
      !kind.success ||
      file.size < 1 ||
      file.size > 3145728
    )
      throw new BadRequestError(
        'Choose a PDF, PNG or JPEG up to 3 MB and a document type'
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? 'image/jpeg'
            : null;
    if (!mime || mime !== file.type)
      throw new BadRequestError(
        'File contents do not match an allowed document type'
      );
    const id = randomUUID();
    const objectPath = `${params.id}/${id}`;
    if (
      objectPath.includes('..') ||
      !/^[a-f0-9-]+\/[a-f0-9-]+$/i.test(objectPath)
    )
      throw new BadRequestError('Invalid document storage reference');
    const name =
      file.name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 200) || 'Document';
    const { error: reserveError } = await serverSupabase
      .from('property_document_files')
      .insert({
        id,
        property_id: params.id,
        uploaded_by: user.id,
        name,
        kind: kind.data,
        object_path: objectPath,
        mime_type: mime,
        size_bytes: file.size,
      });
    if (reserveError) throw reserveError;
    const { error: uploadError } = await serverSupabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;
    const { data: ready, error: readyError } = await serverSupabase
      .from('property_document_files')
      .update({ status: 'ready' })
      .eq('id', id)
      .eq('property_id', params.id)
      .select('id')
      .maybeSingle();
    if (readyError) throw readyError;
    if (!ready) throw new NotFoundError('Property no longer available');
    return NextResponse.json({ id }, { status: 201 });
  }
);

const editSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('edit'),
      documentId: z.string().uuid(),
      expectedUpdatedAt: z.string().datetime({ offset: true }),
      name: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(/^[^\x00-\x1f\x7f/\\]+$/),
      kind: kinds,
    })
    .strict(),
  z
    .object({
      action: z.literal('archive'),
      documentId: z.string().uuid(),
      expectedUpdatedAt: z.string().datetime({ offset: true }),
      archived: z.boolean(),
    })
    .strict(),
]);
export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    await authorize(user.id, params.id);
    const input = editSchema.safeParse(await request.json().catch(() => null));
    if (!input.success)
      throw new BadRequestError(
        'Choose a document, valid name and type. Refresh if its details have changed.'
      );
    const value = input.data;
    const update =
      value.action === 'edit'
        ? {
            name: value.name,
            kind: value.kind,
            updated_at: new Date().toISOString(),
          }
        : {
            archived_at: value.archived ? new Date().toISOString() : null,
            archived_by: value.archived ? user.id : null,
            updated_at: new Date().toISOString(),
          };
    const result = await serverSupabase
      .from('property_document_files')
      .update(update)
      .eq('id', value.documentId)
      .eq('property_id', params.id)
      .eq('status', 'ready')
      .eq('updated_at', value.expectedUpdatedAt)
      .select('id,name,kind,created_at,updated_at,archived_at')
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data)
      throw new ConflictError(
        'The document changed or is no longer available. Refresh before editing.'
      );
    return NextResponse.json({ document: result.data });
  }
);
