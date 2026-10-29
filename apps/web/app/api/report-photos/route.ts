import { NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireReceipt } from '@/lib/reports/followup';

export const POST = withApiHandler(
  {
    // auth-check: ok — requireReceipt authenticates the report's private token before accepting or uploading photos.
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  },
  async (request) => {
    const reportId = request.nextUrl.searchParams.get('reportId');
    const slot = request.nextUrl.searchParams.get('slot');
    if (
      !z.string().uuid().safeParse(reportId).success ||
      !/^[1-5]$/.test(slot || '')
    )
      return NextResponse.json(
        { error: 'Invalid photo slot.' },
        { status: 400 }
      );
    await requireReceipt(reportId!, request.headers.get('x-report-receipt'));
    // Reject unknown/chunked lengths before buffering an anonymous upload.
    const length = Number(request.headers.get('content-length'));
    if (!length || length > 3 * 1024 * 1024 + 65536)
      return NextResponse.json(
        { error: 'Choose a photo smaller than 3 MB.' },
        { status: 413 }
      );
    const form = await request.formData();
    const file = form.get('photo');
    if (
      !(file instanceof File) ||
      file.size > 3 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    )
      return NextResponse.json(
        { error: 'Use JPG, PNG or WebP up to 3 MB.' },
        { status: 400 }
      );
    let image: Buffer;
    try {
      // Decode the actual bytes, bound decompression, strip EXIF/location metadata.
      image = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 20_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: 'This image could not be read. Choose another photo.' },
        { status: 400 }
      );
    }
    const { error } = await serverSupabase.storage
      .from('tenant-report-photos')
      .upload(`${reportId}/${slot}.jpg`, image, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (error) throw error;
    return NextResponse.json(
      { saved: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
);
