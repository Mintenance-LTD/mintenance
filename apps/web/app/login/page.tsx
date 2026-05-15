// Reads `redirect` via useSearchParams (inside LoginForm) at render
// time — no benefit from static pre-rendering, and skipping it avoids
// the CSR-bailout Suspense requirement in Next 16 + Turbopack.
export const dynamic = 'force-dynamic';

import { LoginBrandPanel } from './LoginBrandPanel';
import { LoginForm } from './LoginForm';

/**
 * /login — Direction A · Mint Editorial.
 *
 * 2026-05-13 design-system rebuild. Source of truth:
 * `mintenance-design-system/project/redesign-v2/auth.html` (WebSignIn).
 * Thin shell: the `data-theme="mint-editorial"` + `.me-root` wrapper
 * makes the canonical `--me-*` tokens + `.t-h1` / `.field` /
 * `.btn-primary` primitives (from `styles/mint-editorial.css`)
 * resolve with no cookie gate — this IS the login page now.
 *
 * Split into LoginBrandPanel + LoginForm to stay under the 500-line
 * per-file cap; LoginForm carries all the auth logic.
 */
export default function LoginPage() {
  return (
    <div
      data-theme='mint-editorial'
      className='me-root'
      style={{ display: 'flex', minHeight: '100vh' }}
    >
      <LoginBrandPanel />
      <LoginForm />

      {/* Responsive: hide the brand panel on small screens, show the
          mobile logo instead. Scoped to the login-only classes. */}
      <style>{`
        @media (max-width: 1023px) {
          .login-brand-panel { display: none !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
