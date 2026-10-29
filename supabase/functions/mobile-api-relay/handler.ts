const ORIGIN = 'https://www.mintenance.co.uk';
const PREFIX = '/functions/v1/mobile-api-relay';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const API_GROUPS = new Set([
  'appointments',
  'assessments',
  'bookings',
  'building-surveyor',
  'contractor',
  'contractors',
  'contracts',
  'disputes',
  'documents',
  'email',
  'escrow',
  'gdpr',
  'geocode-proxy',
  'geocoding',
  'homeowner',
  'jobs',
  'landlord',
  'messages',
  'notifications',
  'onboarding',
  'organizations',
  'payment',
  'payments',
  'phone-calls',
  'portfolio',
  'properties',
  'referrals',
  'report-conversation',
  'subscriptions',
  'user',
  'users',
  'verification',
]);

export interface RelayDependencies {
  bypassSecret: string;
  allowedUserIds: string[];
  verifyUser: (
    token: string,
    signal: AbortSignal
  ) => Promise<{ id: string; confirmed: boolean } | null>;
  fetch: typeof fetch;
  timeoutMs?: number;
}

class TooLarge extends Error {}
async function boundedBytes(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal: AbortSignal
) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new TooLarge();
      chunks.push(value);
    }
    if (signal.aborted) throw new Error('Timeout');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
    reader.releaseLock();
  }
}

const reply = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });

/** Explicit beta membership adds a gate; upstream still enforces roles, revocation and ownership. */
export function createMobileRelay(deps: RelayDependencies) {
  const allowed = new Set(deps.allowedUserIds.map((id) => id.toLowerCase()));
  const configured =
    !!deps.bypassSecret &&
    allowed.size > 0 &&
    [...allowed].every((id) => UUID.test(id));
  return async (request: Request): Promise<Response> => {
    if (!configured)
      return reply(503, 'BETA_API_UNAVAILABLE', 'Beta API is not configured');
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return reply(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }
    const incoming = new URL(request.url);
    const path = incoming.pathname.slice(PREFIX.length);
    // Reject encoded path separators, dot traversal, normalization tricks and non-API destinations.
    if (
      !incoming.pathname.startsWith(`${PREFIX}/api/`) ||
      !/^\/api\/[A-Za-z0-9_/-]+$/.test(path) ||
      path.includes('//') ||
      !API_GROUPS.has(path.split('/')[2]) ||
      (path.split('/')[2] === 'building-surveyor' &&
        path !== '/api/building-surveyor/assess') ||
      incoming.search.length > 4096
    ) {
      return reply(
        403,
        'ROUTE_NOT_ALLOWED',
        'This route is not available through the beta API'
      );
    }
    const authorization = request.headers.get('authorization');
    if (
      !authorization ||
      !/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)
    ) {
      return reply(401, 'AUTH_REQUIRED', 'Sign in to continue');
    }
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<Response>((resolve) => {
      timer = setTimeout(() => {
        abort.abort();
        resolve(reply(504, 'BETA_API_TIMEOUT', 'Beta API timed out'));
      }, deps.timeoutMs ?? 25000);
    });
    const run = async () => {
      try {
        const user = await deps.verifyUser(
          authorization.slice(7),
          abort.signal
        );
        if (abort.signal.aborted) throw new Error('Timeout');
        if (!user)
          return reply(401, 'INVALID_TOKEN', 'Invalid or expired session');
        if (!user.confirmed || !allowed.has(user.id.toLowerCase())) {
          return reply(
            403,
            'BETA_ACCESS_REQUIRED',
            'This account is not approved for the mobile beta'
          );
        }
        const body = await boundedBytes(
          request.body,
          8 * 1024 * 1024,
          abort.signal
        );
        // Never forward cookies, caller bypasses, internal identity, host, forwarding or cron headers.
        const headers = new Headers({
          authorization,
          accept: 'application/json',
          'x-vercel-protection-bypass': deps.bypassSecret,
        });
        const contentType = request.headers.get('content-type');
        if (contentType) headers.set('content-type', contentType);
        const idempotency = request.headers.get('idempotency-key');
        if (idempotency && /^[A-Za-z0-9_-]{1,128}$/.test(idempotency))
          headers.set('idempotency-key', idempotency);
        const upstream = await deps.fetch(
          `${ORIGIN}${path}${incoming.search}`,
          {
            method: request.method,
            headers,
            redirect: 'manual',
            signal: abort.signal,
            ...(request.method !== 'GET' && body.length ? { body } : {}),
          }
        );
        const type = upstream.headers.get('content-type') ?? '';
        if (
          (upstream.status >= 300 && upstream.status < 400) ||
          type.includes('text/html')
        ) {
          void upstream.body?.cancel().catch(() => undefined);
          return reply(
            503,
            'BETA_API_UNAVAILABLE',
            'Beta API access is unavailable'
          );
        }
        const bytes = await boundedBytes(
          upstream.body,
          16 * 1024 * 1024,
          abort.signal
        );
        if (
          [401, 403].includes(upstream.status) &&
          type.includes('application/json')
        ) {
          const data = JSON.parse(new TextDecoder().decode(bytes));
          if (
            data?.message === 'Protected by Vercel Authentication' ||
            data?.error?.message === 'Protected deployment'
          ) {
            return reply(
              503,
              'BETA_API_UNAVAILABLE',
              'Beta API access is unavailable'
            );
          }
        }
        // No Set-Cookie, Location or upstream debug headers can escape the relay.
        return new Response(upstream.status === 204 ? null : bytes, {
          status: upstream.status,
          headers: {
            'content-type': type || 'application/octet-stream',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          },
        });
      } catch (error) {
        return reply(
          error instanceof TooLarge ? 413 : 503,
          'BETA_API_UNAVAILABLE',
          'Beta API request could not be completed'
        );
      }
    };
    try {
      return await Promise.race([run(), deadline]);
    } finally {
      clearTimeout(timer!);
      abort.abort();
    }
  };
}
