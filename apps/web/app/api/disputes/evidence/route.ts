import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateImageUpload } from '@/lib/utils/fileValidation';
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';

const MAX_BYTES = 3 * 1024 * 1024;
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    if (Number(request.headers.get('content-length')) > MAX_BYTES + 65536)
      throw new BadRequestError(
        'Upload one photo at a time, no larger than 3 MB.'
      );
    const form = await request.formData();
    const parsed = z
      .object({ escrowId: z.string().uuid() })
      .safeParse({ escrowId: form.get('escrowId') });
    const file = form.get('file');
    if (
      !parsed.success ||
      !(file instanceof File) ||
      file.size > MAX_BYTES ||
      !file.size
    )
      throw new BadRequestError(
        'Choose one photo up to 3 MB and a valid payment.'
      );
    const { data: escrow, error } = await serverSupabase
      .from('escrow_transactions')
      .select('id,job_id,status')
      .eq('id', parsed.data.escrowId)
      .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      .maybeSingle();
    if (error) throw new InternalServerError('Unable to check payment access.');
    if (!escrow) throw new NotFoundError('Payment not found or access denied');
    if (!['held', 'disputed'].includes(escrow.status))
      throw new BadRequestError(
        'Evidence uploads are unavailable for this payment state.'
      );
    const validation = await validateImageUpload(file, MAX_BYTES);
    if (!validation.valid)
      throw new BadRequestError(
        validation.error ?? 'Choose a supported photo.'
      );
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'image/bmp': 'bmp',
    };
    const extension = extensions[validation.detectedType ?? ''];
    if (
      !extension ||
      !z.string().uuid().safeParse(escrow.job_id).success ||
      !z.string().uuid().safeParse(user.id).success
    )
      throw new BadRequestError('Invalid evidence reference.');
    const path = `${escrow.job_id}/disputes/${user.id}/${randomUUID()}.${extension}`;
    if (
      path.includes('..') ||
      !/^[a-f0-9-]+\/disputes\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|gif|heic|heif|bmp)$/.test(
        path
      )
    )
      throw new BadRequestError('Invalid evidence path.');
    const upload = await serverSupabase.storage
      .from('job-attachments')
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: validation.detectedType,
        upsert: false,
      });
    if (upload.error)
      throw new InternalServerError(
        'Photo upload failed. Your dispute has not been submitted. Please retry.'
      );
    return NextResponse.json({ reference: `job-attachments:${path}` });
  }
);
