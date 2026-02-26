# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Mintenance is an AI-powered contractor discovery marketplace. The monorepo contains a Next.js 16 web app (`apps/web`), an Expo React Native mobile app (`apps/mobile`), shared packages (`packages/*`), and optional Python AI services (`apps/sam3-service`). See `README.md` for full architecture details.

### Running the web app

1. Ensure `.env.local` exists in `apps/web/` with at minimum: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `JWT_SECRET` (64+ chars, cryptographically random), `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `NODE_ENV=development`. These are injected as environment variables by the Cloud Agent VM.
2. Build shared packages first: `npm run build:packages` (order matters: types -> shared -> ai-core -> auth -> design-tokens -> api-client -> security -> shared-ui).
3. Start dev server: `npm run dev` (runs on port 3000, uses webpack mode).

### Key caveats

- **JWT_SECRET validation**: The web app's instrumentation validates `JWT_SECRET` at startup. Placeholder or weak values cause a logged error (but the server still starts). Generate a strong key: `openssl rand -base64 64`.
- **Pre-existing lint errors**: `npm run lint:web` currently reports ~669 errors and ~1786 warnings (pre-existing). The lint tooling itself works correctly.
- **Pre-existing test failures**: `npm run test:web -- run` shows 5 failing suites out of 183 (pre-existing). The test framework (Vitest v4) works correctly.
- **Redis/Stripe/AI optional in dev**: The app gracefully falls back to in-memory rate limiting when Redis is not configured. AI features (OpenAI, Roboflow, SAM3) and weather APIs are optional.
- **Husky pre-commit hooks**: The `.husky/pre-commit` hook runs type-check, lint-staged, and related tests. It blocks direct commits to `main`/`master`.

### Commands reference

See `package.json` scripts. Key commands:
- `npm run dev` / `npm run dev:web` — start web dev server (port 3000)
- `npm run build:packages` — build all shared packages
- `npm run build` — full build (packages + apps)
- `npm run lint:web` — lint web app
- `npm run test:web` — run web tests (Vitest)
- `npm run test:web -- run` — run tests once (non-watch mode)
- `npm run type-check:web` — TypeScript type checking
