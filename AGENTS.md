# AGENTS.md

## Cursor Cloud specific instructions

### Node.js version
This project requires Node.js **20.19.4** (see `.nvmrc`). The VM comes with Node 22 by default; the update script activates the correct version via nvm.

### Environment setup
- **Package manager**: npm (uses `package-lock.json`, npm workspaces)
- **Install**: `npm install` from workspace root installs all workspaces
- **Build packages**: `npm run build:packages` builds shared packages in dependency order (required before running the web app or tests)
- **Dev server**: `npm run dev:web` starts Next.js on port 3000

### Environment variables
The web app requires `apps/web/.env.local` with valid placeholders. The update script creates this automatically if missing. Key requirements for the Zod env validator (`apps/web/lib/env.ts`):
- `JWT_SECRET` must be 64+ chars with 3+ character classes (lower, upper, number, special)
- `STRIPE_SECRET_KEY` must start with `sk_test_`
- `STRIPE_WEBHOOK_SECRET` must start with `whsec_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must start with `pk_test_`
- `NEXT_PUBLIC_SUPABASE_URL` must be a valid URL

Without real Supabase/Stripe credentials, the app runs in dev mode but database-dependent features will not work.

### Running commands
Refer to the root `package.json` scripts section and `README.md` for the full list. Key commands:
- **Lint (web)**: `npm run lint:web` — pre-existing warnings/errors (689 errors, 2120 warnings as of Feb 2026)
- **Tests (web)**: `npm run test:web -- run` — Vitest v4, 176/183 suites pass, 7 pre-existing failures
- **Type check (web)**: `npm run type-check:web`
- **Build (web)**: `npm run build:web` — has 1 pre-existing TypeScript error in `app/api/payments/refund/route.ts` (`getCurrentUserFromCookies` not found)

### Known pre-existing issues
- **Build failure**: `apps/web/app/api/payments/refund/route.ts:369` references `getCurrentUserFromCookies` which is not imported
- **Test failures**: 7 test suites fail (Card/Input shared-ui mock, rate-limiter, payment-flow, BudgetRangeSelector toast, PresenceDetectionMetrics threshold)
- **Lint errors**: 689 ESLint errors (mostly `react/display-name`, `no-console`) — these are pre-existing

### Mobile app
The Expo mobile app (`apps/mobile`) requires physical device or emulator to run. It is not runnable in the Cloud VM without additional simulator setup. For mobile tests: `npm run test:mobile`.

### SAM3/SAM2 AI services
These Python microservices are optional and require Docker + GPU. Not needed for web development.
