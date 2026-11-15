import { APIError, BadRequestError } from '@/lib/errors/api-error';

export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

/** Bound unsigned input before allocating the raw body used for verification. */
export async function readWebhookBody(request: Request): Promise<string> {
  const tooLarge = () => new APIError('PAYLOAD_TOO_LARGE', 'Webhook payload too large', 413);
  if (Number(request.headers.get('content-length')) > MAX_WEBHOOK_BODY_BYTES) {
    throw tooLarge();
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_WEBHOOK_BODY_BYTES) throw tooLarge();
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new BadRequestError('Invalid webhook encoding');
  }
}
