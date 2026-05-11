import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withApiHandler } from '@/lib/api/with-api-handler';

// Phase-1 design rebrand toggle. Sets a long-lived cookie so the
// preference survives navigations and is read in app/layout.tsx to
// apply <html data-theme="...">. Public (no auth) — the cookie only
// affects styling and carries no security weight.
//
// GET /api/theme?value=mint-editorial&redirect=/dashboard
//   value: 'mint-editorial' or 'default' (anything else clears it)
//   redirect: where to bounce back to after setting the cookie
export const GET = withApiHandler(
  { auth: false, csrf: false },
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const value = url.searchParams.get('value');
    const redirectTarget = url.searchParams.get('redirect') || '/dashboard';

    // Only allow relative redirects to prevent open-redirect.
    const safeRedirect = redirectTarget.startsWith('/')
      ? redirectTarget
      : '/dashboard';

    const cookieStore = await cookies();
    if (value === 'mint-editorial') {
      cookieStore.set('mintenance-theme', 'mint-editorial', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
    } else {
      cookieStore.delete('mintenance-theme');
    }

    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }
);
