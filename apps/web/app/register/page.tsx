// Reads `role` / `invite` via useSearchParams (inside RegisterForm) at
// render time — no benefit from static pre-rendering, and skipping it
// avoids the CSR-bailout Suspense requirement in Next 16 + Turbopack.
export const dynamic = 'force-dynamic';

import { RegisterBrandPanel } from './RegisterBrandPanel';
import { RegisterForm } from './RegisterForm';

/**
 * /register — Direction A · Mint Editorial.
 *
 * 2026-05-15 design-system rebuild. Source of truth:
 * `mintenance-design-system/project/redesign-v2/auth.html` (WebSignUp).
 * Thin shell: the `data-theme="mint-editorial"` + `.me-root` wrapper
 * makes the canonical `--me-*` tokens + `.t-h1` / `.field` /
 * `.btn-primary` primitives (from `styles/mint-editorial.css`)
 * resolve with no cookie gate — this IS the register page now.
 *
 * Split into RegisterBrandPanel + RegisterForm (+ useRegisterSubmit)
 * to stay under the 500-line per-file cap.
 */
export default function RegisterPage() {
  return (
    <div
      data-theme='mint-editorial'
      className='me-root'
      style={{ display: 'flex', minHeight: '100vh' }}
    >
      <RegisterBrandPanel />
      <RegisterForm />

      {/* Responsive: hide the brand panel on small screens, show the
          mobile logo instead. Scoped to the register-only classes. */}
      <style>{`
        @media (max-width: 1023px) {
          .register-brand-panel { display: none !important; }
          .register-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
