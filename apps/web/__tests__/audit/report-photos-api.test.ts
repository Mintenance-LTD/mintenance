import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
const m = vi.hoisted(() => ({ requireReceipt: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/reports/followup', () => ({ requireReceipt: m.requireReceipt }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { storage: { from: () => ({ upload: m.upload }) } },
}));
import { POST } from '@/app/api/report-photos/route';
const reportId = '00000000-0000-4000-8000-000000000001';
function request(file: File, length = '1000') {
  const req = new NextRequest(
    `https://example.test/api/report-photos?reportId=${reportId}&slot=1`,
    {
      method: 'POST',
      headers: { 'content-length': length, 'x-report-receipt': 'a'.repeat(64) },
    }
  );
  vi.spyOn(req.headers, 'get').mockImplementation((name) =>
    name === 'content-length' ? length : 'a'.repeat(64)
  );
  const body = new FormData();
  body.append('photo', file);
  vi.spyOn(req, 'formData').mockResolvedValue(body);
  return req;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.requireReceipt.mockResolvedValue({ id: reportId });
  m.upload.mockResolvedValue({ error: null });
});
it('checks private receipt before buffering or storing an upload', async () => {
  m.requireReceipt.mockRejectedValue(new Error('Forbidden'));
  const req = request(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  await expect(POST(req, {} as never)).rejects.toThrow('Forbidden');
  expect(req.formData).not.toHaveBeenCalled();
  expect(m.upload).not.toHaveBeenCalled();
});
it('rejects oversized bodies before reading them', async () => {
  const req = request(
    new File(['x'], 'x.jpg', { type: 'image/jpeg' }),
    '4000000'
  );
  expect((await POST(req, {} as never)).status).toBe(413);
  expect(req.formData).not.toHaveBeenCalled();
});
it('rejects non-image bytes disguised as JPEG', async () => {
  const req = request(
    new File(['<script>bad</script>'], 'x.jpg', { type: 'image/jpeg' })
  );
  expect((await POST(req, {} as never)).status).toBe(400);
  expect(m.upload).not.toHaveBeenCalled();
});
it('decodes and re-encodes a real image into the private fixed slot', async () => {
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  const req = request(
    new File([new Uint8Array(bytes)], 'x.png', { type: 'image/png' })
  );
  expect((await POST(req, {} as never)).status).toBe(200);
  const [path, image, options] = m.upload.mock.calls[0];
  expect(path).toBe(`${reportId}/1.jpg`);
  expect(options.contentType).toBe('image/jpeg');
  expect((await sharp(image).metadata()).format).toBe('jpeg');
});
