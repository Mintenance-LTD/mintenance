import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import {
  BadRequestError,
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
      .maybeSingle();
    if (error) throw error;
    if (!doc) throw new NotFoundError('Document not found');
    const { data, error: signedError } = await serverSupabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.object_path, 60, { download: doc.name });
    if (signedError) throw signedError;
    return NextResponse.json(
      { url: data.signedUrl },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  const offset = Number(request.nextUrl.searchParams.get('offset') || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new BadRequestError('Invalid page');
  const { data, error, count } = await serverSupabase
    .from('property_document_files')
    .select('id,name,kind,mime_type,size_bytes,created_at', { count: 'exact' })
    .eq('property_id', params.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + 24);
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
