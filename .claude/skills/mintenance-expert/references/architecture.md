# Mintenance Architecture Reference

## Monorepo Structure

```
mintenance/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App Router pages and API routes
│   │   │   ├── (public)/       # Landing pages
│   │   │   ├── admin/          # Admin dashboard
│   │   │   ├── contractor/     # Contractor pages
│   │   │   ├── homeowner/      # Homeowner pages
│   │   │   ├── jobs/           # Job detail pages
│   │   │   ├── api/            # ~328 API routes
│   │   │   │   ├── auth/       # Authentication endpoints
│   │   │   │   ├── jobs/       # Job CRUD, bids, photos, payments
│   │   │   │   ├── payments/   # Payment processing
│   │   │   │   ├── contracts/  # Contract management
│   │   │   │   ├── messages/   # Messaging
│   │   │   │   ├── cron/       # Scheduled tasks (18 cron jobs)
│   │   │   │   ├── webhooks/   # Stripe webhooks
│   │   │   │   ├── admin/      # Admin operations
│   │   │   │   ├── escrow/     # Escrow management
│   │   │   │   └── ...
│   │   │   └── layout.tsx
│   │   ├── components/         # React components by domain
│   │   │   ├── ui/             # Design system primitives
│   │   │   ├── payments/       # Payment UI (Stripe Elements)
│   │   │   ├── escrow/         # Escrow status displays
│   │   │   ├── jobs/           # Job listing/detail components
│   │   │   ├── auth/           # Auth forms
│   │   │   └── ...
│   │   ├── lib/                # Core application logic
│   │   │   ├── api/            # withApiHandler, supabaseServer, response utils
│   │   │   ├── auth/           # JWT verification, session management
│   │   │   ├── services/       # Domain services (payment, escrow, jobs, etc.)
│   │   │   ├── middleware/     # Rate limiting, admin checks
│   │   │   ├── validation/     # Zod schemas
│   │   │   ├── errors/         # Custom error classes
│   │   │   ├── hooks/          # React hooks
│   │   │   ├── stripe.ts       # Stripe client (lazy proxy)
│   │   │   ├── cron-handler.ts # Cron job wrapper
│   │   │   ├── cron-auth.ts    # Cron secret verification
│   │   │   └── ...
│   │   ├── test/               # Test setup and utilities
│   │   ├── __tests__/          # Test files
│   │   ├── middleware.ts       # Next.js middleware (auth, CSRF, rate limiting)
│   │   ├── next.config.js      # Next.js configuration
│   │   ├── vitest.config.ts    # Test configuration
│   │   └── tsconfig.json
│   │
│   └── mobile/                 # React Native / Expo app
│       ├── src/
│       │   ├── screens/        # 200+ navigation screens
│       │   ├── services/       # 100+ business logic services
│       │   ├── hooks/          # Custom React hooks
│       │   ├── navigation/     # React Navigation (tabs, stacks)
│       │   ├── contexts/       # Context providers (auth, theme)
│       │   ├── components/     # UI components
│       │   ├── providers/      # App-level providers
│       │   ├── lib/            # Utilities
│       │   ├── config/         # App configuration
│       │   ├── i18n/           # Internationalization
│       │   ├── theme/          # Design tokens
│       │   └── utils/          # Helper utilities
│       ├── app.json            # Expo configuration
│       └── tsconfig.json
│
├── packages/
│   ├── types/                  # @mintenance/types - shared TypeScript types
│   ├── shared/                 # @mintenance/shared - utilities, constants, logger
│   ├── shared-ui/              # @mintenance/shared-ui - cross-platform UI components
│   ├── auth/                   # @mintenance/auth - JWT, sessions, MFA
│   ├── security/               # @mintenance/security - sanitization, rate limiting
│   ├── design-tokens/          # @mintenance/design-tokens - colors, typography
│   ├── ai-core/                # @mintenance/ai-core - ML services
│   └── api-client/             # @mintenance/api-client - HTTP client
│
├── supabase/                   # Supabase configuration
│   └── migrations/             # Database migration SQL files
├── e2e/                        # Playwright E2E tests
├── scripts/                    # Build and utility scripts
├── infrastructure/             # AWS/ML pipeline configs
├── monitoring/                 # DataDog configs
└── docs/                       # Business, technical, security docs
```

## Import Conventions

### Path Aliases
```typescript
// Web app internal imports
import { something } from '@/lib/services/payment/EscrowService';
import { Button } from '@/components/ui/Button';

// Cross-package imports
import type { Job, Bid } from '@mintenance/types';
import { sanitize } from '@mintenance/security';
import { logger } from '@mintenance/shared';
import { ConfigManager } from '@mintenance/auth';
```

### Platform-Specific Components (shared-ui)
Shared UI components have platform variants:
```
packages/shared-ui/src/
├── Button.tsx           # Shared types/logic
├── Button.web.tsx       # Web implementation
├── Button.native.tsx    # React Native implementation
```
Webpack aliases in `next.config.js` resolve `.web.tsx` for web builds.

## Package Dependencies Flow

```
@mintenance/types        <- used by ALL packages and apps
@mintenance/shared       <- utilities used by web + mobile
@mintenance/security     <- used by web (server-side sanitization)
@mintenance/auth         <- used by web (JWT, sessions, ConfigManager)
@mintenance/shared-ui    <- used by web + mobile (cross-platform components)
@mintenance/design-tokens <- used by shared-ui, web, mobile
@mintenance/ai-core      <- used by web (ML services)
@mintenance/api-client   <- used by mobile (API communication)
```

## Next.js Configuration Highlights

Key settings in `apps/web/next.config.js`:
- `transpilePackages`: All @mintenance/* packages
- `outputFileTracingRoot`: Monorepo root (for Vercel serverless)
- `serverExternalPackages`: Google Cloud, ONNX, Canvas, jsdom, Puppeteer, Sharp
- `ignoreBuildErrors: false` (TypeScript errors WILL fail the build)
- Security headers: CSP, X-Frame-Options, HSTS (production)
- Image optimization: AVIF/WebP, remote patterns for Supabase storage

## Environment Variables

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Public endpoint
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Client-side key (web + mobile)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only (bypasses RLS)

### Stripe
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side
- `STRIPE_SECRET_KEY` - Server-side only
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

### Auth
- `JWT_SECRET` - 32+ character secret
- `CRON_SECRET` - Cron job authentication

### Redis (Upstash)
- `UPSTASH_REDIS_REST_URL` - Rate limiting backend
- `UPSTASH_REDIS_REST_TOKEN`

### Feature Flags
- `NEXT_PUBLIC_ENABLE_2025_DASHBOARD` - Dashboard version toggle
- `EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH` - Mobile biometrics
- `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` - Push notifications
