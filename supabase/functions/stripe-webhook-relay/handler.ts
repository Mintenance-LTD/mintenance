export const UPSTREAM = 'https://www.mintenance.co.uk/api/webhooks/stripe';
export const MAX_BODY_BYTES = 1024 * 1024;

type VerifiedEvent = { id: string; livemode: boolean; type: string };
type Dependencies = {
  signingSecret: string;
  bypassSecret: string;
  verify: (body: string, signature: string, secret: string) => Promise<VerifiedEvent>;
  fetch: typeof fetch;
  timeoutMs?: number;
};

class BodyTooLarge extends Error {}

async function readLimited(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new BodyTooLarge();
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

const reply = (status: number, message: string) => new Response(
  JSON.stringify(status === 200 ? { received: true } : { error: message }),
  { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
);

/** No database/API key access, URL parameters, caller headers, or credential logging. */
export function createRelay(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return reply(405, 'Method not allowed');
    if (!deps.signingSecret.startsWith('whsec_') || !deps.bypassSecret) {
      return reply(503, 'Receiver not configured');
    }
    const signature = request.headers.get('stripe-signature');
    if (!signature) return reply(400, 'Missing signature');
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
      return reply(413, 'Payload too large');
    }

    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const expired = new Promise<Response>((resolve) => {
      timer = setTimeout(() => { abort.abort(); resolve(reply(504, 'Receiver timeout')); }, deps.timeoutMs ?? 20_000);
    });
    const handle = async () => {
      let raw: Uint8Array;
      let event: VerifiedEvent;
      try {
        raw = await readLimited(request.body, MAX_BODY_BYTES, abort.signal);
        const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
        event = await deps.verify(text, signature, deps.signingSecret);
      } catch (error) {
        return reply(error instanceof BodyTooLarge ? 413 : 400, 'Invalid payload or signature');
      }
      if (abort.signal.aborted) return reply(504, 'Receiver timeout');
      if (event.livemode !== true || typeof event.id !== 'string' || typeof event.type !== 'string') {
        return reply(400, 'Expected live Stripe event');
      }
      try {
        const response = await deps.fetch(UPSTREAM, {
          method: 'POST', redirect: 'manual', signal: abort.signal,
          headers: {
            'content-type': 'application/json',
            'stripe-signature': signature,
            'x-vercel-protection-bypass': deps.bypassSecret,
          },
          body: raw,
        });
        // Do not follow redirects (which could disclose the bypass) or acknowledge a login page.
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          void response.body?.cancel().catch(() => undefined);
          return reply(502, 'Upstream rejected event');
        }
        const bytes = await readLimited(response.body, 16 * 1024, abort.signal);
        const result = JSON.parse(new TextDecoder().decode(bytes));
        return result?.received === true ? reply(200, '') : reply(502, 'Upstream did not acknowledge event');
      } catch {
        return reply(502, 'Upstream unavailable');
      }
    };
    try { return await Promise.race([handle(), expired]); }
    finally { clearTimeout(timer!); }
  };
}
