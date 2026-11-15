import { expect, it } from 'vitest';
import { MAX_WEBHOOK_BODY_BYTES, readWebhookBody } from '@/lib/services/stripe-webhook/read-webhook-body';

const request = (body: BodyInit, headers?: HeadersInit) => {
  const req = new Request('https://example.test/webhook', { method: 'POST', body });
  new Headers(headers).forEach((value, key) => req.headers.set(key, value));
  return req;
};

it('preserves whitespace, Unicode and BOM for signature verification', async () => {
  const raw = '\uFEFF{ "label": "£维修" }\n';
  expect(await readWebhookBody(request(raw))).toBe(raw);
});
it('accepts the exact byte limit', async () => {
  const raw = 'x'.repeat(MAX_WEBHOOK_BODY_BYTES);
  expect(await readWebhookBody(request(raw))).toBe(raw);
});
it.each([undefined, { 'content-length': '1' }])('bounds actual bytes without trusting the header: %j', async headers => {
  await expect(readWebhookBody(request('£'.repeat(MAX_WEBHOOK_BODY_BYTES / 2 + 1), headers)))
    .rejects.toMatchObject({ statusCode: 413 });
});
it('rejects oversized declared payloads', async () => {
  await expect(readWebhookBody(request('{}', { 'content-length': String(MAX_WEBHOOK_BODY_BYTES + 1) })))
    .rejects.toMatchObject({ statusCode: 413 });
});
it('rejects invalid UTF-8 rather than replacing bytes', async () => {
  await expect(readWebhookBody(request(new Uint8Array([0xff]))))
    .rejects.toMatchObject({ statusCode: 400 });
});
