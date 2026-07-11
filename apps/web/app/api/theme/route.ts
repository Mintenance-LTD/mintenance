import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Design theme toggle. Sets a long-lived cookie so the preference
// survives navigations and is read in app/layout.tsx + the in-app
// layouts to apply <html data-theme="...">. Public (no auth) — the
// cookie only affects styling and carries no security weight.
//
// Mint Editorial is the platform default (the middleware injects it for
// cookie-less visitors). Opting out therefore must persist an explicit
// `default` value — deleting the cookie would just let the middleware
// re-apply Mint Editorial on the next request.
//
// GET /api/theme?value=mint-editorial&redirect=/dashboard
//   value: 'mint-editorial' or 'default' (anything else => 'default')
//   redirect: where to bounce back to after setting the cookie
export const GET = withApiHandler(
  { auth: false, csrf: false },
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const value = url.searchParams.get('value');
    const redirectTarget = url.searchParams.get('redirect') || '/dashboard';

    // Only allow same-origin relative redirects to prevent open-redirect.
    // `startsWith('/')` alone is NOT enough: `//evil.com` and `/\evil.com`
    // both start with '/' yet `new URL()` resolves them to an EXTERNAL origin
    // (e.g. new URL('//evil.com', base) -> https://evil.com), giving a
    // phishing primitive. Require a single leading slash not followed by
    // another slash or backslash. (2026-07-10 audit)
    const isSafeRelative =
      redirectTarget.startsWith('/') &&
      !redirectTarget.startsWith('//') &&
      !redirectTarget.startsWith('/\\');
    const safeRedirect = isSafeRelative ? redirectTarget : '/dashboard';

    const cookieStore = await cookies();
    cookieStore.set(
      'mintenance-theme',
      value === 'mint-editorial' ? 'mint-editorial' : 'default',
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      }
    );

    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }
);
