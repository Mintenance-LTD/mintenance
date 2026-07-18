/**
 * E2E-ONLY test authentication endpoint.
 *
 * PURPOSE
 * Playwright's storageState approach previously failed because global-setup.ts
 * copied the login page's localStorage token verbatim into a single
 * `sb-<ref>-auth-token` cookie. The Next.js middleware validates sessions with
 * `@supabase/ssr` (see middleware/auth.ts → handleSupabaseAuth), which expects
 * cookies in the library's own `base64-`-prefixed, chunked format — so the
 * hand-rolled cookie never decoded and every protected route redirected to
 * /login. That is the root cause of the ~30 auth-guarded e2e skips.
 *
 * This route signs the user in server-side through `createServerClient`, so
 * `@supabase/ssr` writes the auth cookies in EXACTLY the format the middleware
 * reads back. global-setup calls it and captures the resulting cookies via
 * `context.storageState`.
 *
 * SECURITY — this endpoint is inert unless BOTH gates pass:
 *   1. `E2E_TESTING === 'true'` — never set in production.
 *   2. A matching `x-e2e-auth-secret` header equal to `E2E_AUTH_SECRET`.
 * Any other request (including all production traffic) gets a plain 404, so the
 * route does not exist as far as the outside world is concerned. The route is
 * ALSO only whitelisted in middleware/public-routes.ts when `E2E_TESTING` is
 * on, so with the flag off the middleware treats it as a normal protected route
 * and blocks it before the handler even runs (defense in depth).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// @supabase/ssr / signInWithPassword need Node APIs, not the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function notFound(): NextResponse {
  return new NextResponse('Not Found', { status: 404 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Gate 1: only ever active in an explicit E2E environment.
  if (process.env.E2E_TESTING !== 'true') {
    return notFound();
  }

  // Gate 2: shared secret, so merely having the flag on somewhere is not enough
  // to drive the endpoint.
  const secret = process.env.E2E_AUTH_SECRET;
  if (!secret || request.headers.get('x-e2e-auth-secret') !== secret) {
    return notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Supabase environment not configured' },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password are required' },
      { status: 400 }
    );
  }

  // The response we return also carries the Set-Cookie headers. `setAll` is
  // invoked by @supabase/ssr during signInWithPassword and writes the auth
  // cookies onto this response in the library's native base64/chunked format.
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? 'Sign-in failed' },
      { status: 401 }
    );
  }

  return response;
}
