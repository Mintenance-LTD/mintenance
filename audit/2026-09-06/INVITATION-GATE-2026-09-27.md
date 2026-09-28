# Invitation onboarding gate — 27 September 2026

Scope: tenant/contact invitation onboarding, verification, MFA, accepted property access and
recovery. Base: `codex/migrate-next-proxy` at `a9e1bbeaf`. This closes the local invitation
acceptance gate; it does not establish overall public-launch readiness.

## Defects repaired

- The proxy treated `/auth/mfa-verify` as requiring a completed session, redirecting a
  password-authenticated invitee back to login. Only that exact pre-session page is now public;
  verification APIs still require the pending challenge and valid code.
- The MFA page read `csrfToken` from an API returning `token`. It now uses the shared CSRF helper,
  and displays structured API error messages instead of `[object Object]`.
- Accepted tenants were sent to an owner/team-only property page. The new resident page requires a
  current active, accepted tenancy belonging to the signed-in user and returns only property
  name/address. It grants no management access. Invitation email copy now describes this actual
  capability instead of promising repair tracking and contractor messaging.

## Executed evidence

Isolated Next app on localhost:3017; real local Supabase Auth/Postgres on 55321; Mailpit on 55324.
Disposable synthetic owner and invitee accounts. Resend requests were captured at the provider
boundary and never sent externally.

- Real owner API created a contact and produced a captured invitation email.
- Public registration required email verification; unverified login and invitation acceptance were
  denied.
- A captured Supabase confirmation email verified a new account, returned through the app callback
  to the correct local login origin, and allowed subsequent sign-in. Reusing the consumed link was
  rejected.
- Real TOTP enrollment and MFA verification: pre-MFA acceptance denied, wrong code denied, correct
  code accepted, consumed pending challenge denied.
- Edge browser followed the invitation, signed in through MFA, returned to the original invitation,
  accepted it and opened the limited resident property view. Both MFA defects above were reproduced
  in the browser before repair.
- Two concurrent acceptance retries returned the same property without changing the accepted user or
  timestamp. Invalid tokens and a different verified email were rejected.
- Injected provider 503 produced `unconfirmed`, not false delivery success. Immediate resend was
  blocked. After aging only the disposable attempt beyond its 15-minute cooldown, two concurrent
  resend requests produced one delivery and one conflict. Duplicate contact creation was rejected.
- Owner revocation blocked the existing tenant session and invalidated the invitation. Browser
  inspection showed the 404 view. The raw streamed Next response used HTTP 200 with a not-found
  marker; diagnostics checked the marker and absence of property details rather than interpreting
  HTTP 200 as authorized access.
- Focused regression suites: 37 passing tests across nine files, covering invitation
  identity/delivery, registration verification, callbacks, MFA form/navigation and resident access.
  The destination-link assertion also passed after update.

## Limits and rollout

Registration and verification transport checks used real local HTTP/Auth, supplemented by
registration UI regression tests; the browser exercised login/MFA/acceptance/property access.
Production inbox deliverability and native invitation deep-link handoff were not verified by this
gate. Captured provider requests prove application behavior, not external mail delivery.

No SQL schema changes or hosted database changes were needed. The web changes require deployment of
the resulting commit. Existing mobile callers use the same invitation API; no native code was
changed here. Other readiness gates remain open.

Diagnostic launchers, captured email and synthetic credentials stayed in the ignored isolated-stack
directory and are excluded from the commit.
