import { createHash } from 'node:crypto';
import { BadRequestError } from '@/lib/errors/api-error';

export async function fingerprintMultipartRequest(
  request: Request
): Promise<unknown> {
  const copy = request.clone();
  const reader = copy.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Ten 10 MiB photos plus bounded multipart fields/headers.
      if (size > 101 * 1024 * 1024) {
        void reader.cancel().catch(() => undefined);
        throw new BadRequestError('Photo request is too large');
      }
      chunks.push(value);
    }
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: copy.headers,
    }).formData();
  } catch {
    throw new BadRequestError('Invalid photo form data');
  }
  const fields = await Promise.all(
    Array.from(form.entries()).map(async ([key, value]) => [
      key,
      typeof value === 'string'
        ? value
        : {
            name: value.name,
            type: value.type,
            size: value.size,
            digest: createHash('sha256')
              .update(Buffer.from(await value.arrayBuffer()))
              .digest('hex'),
          },
    ])
  );
  // Sort field names while preserving repeated-file ordering.
  return fields.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}
