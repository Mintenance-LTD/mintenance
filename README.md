# Mintenance

**A property maintenance platform that brings homeowners, landlords and tradespeople together, from
identifying a problem to arranging and recording the work.**

Mintenance combines a contractor marketplace with property records, job management, messaging and
AI-assisted photo assessments. Homeowners can describe an issue, compare bids and track a repair.
Contractors can find relevant work, prepare quotes and manage customer relationships. Mint AI helps
organise visible-condition evidence and suggested next steps for human review.

[Website](https://www.mintenance.co.uk) ·
[Source on main](https://github.com/Mintenance-LTD/mintenance/tree/main) · [Documentation](docs/)

[![CI/CD](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml?query=branch%3Amain)
[![Web E2E](https://github.com/Mintenance-LTD/mintenance/actions/workflows/e2e-tests.yml/badge.svg?branch=main)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/e2e-tests.yml?query=branch%3Amain)
[![Mobile Tests](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml/badge.svg?branch=main)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml?query=branch%3Amain)

## Release status

Mintenance is in **restricted beta**. The web deployment uses Vercel access protection, so an
unauthenticated visitor may see a Vercel sign-in page. This repository also contains the Expo mobile
app for Android and iOS; source code and passing tests do not imply an App Store or Google Play
release.

The capabilities below describe the implemented product areas. Availability depends on the user's
role, account setup, deployed database migrations and configured integrations. Beta verification is
ongoing, including payment lifecycle and device testing.

## What the app does

### For homeowners and landlords

- **Describe maintenance work:** create jobs with photographs, a location, category and budget.
- **Find and compare tradespeople:** browse contractor profiles, credentials, portfolios, reviews
  and bids.
- **Manage the job:** communicate with contractors, track progress and review completion evidence.
- **Keep property records:** organise properties, linked jobs, condition assessments and maintenance
  history.
- **Use Mint AI:** submit photographs for an assisted assessment, then record corrections, work
  reports and follow-up evidence.
- **Manage payments:** access the implemented Stripe checkout, completion approval, refund and
  dispute workflows where enabled.

### For contractors

- **Discover opportunities:** browse available jobs using location and service-area information.
- **Prepare bids and quotes:** describe scope, pricing and proposed work.
- **Manage customers and work:** use messaging, job tracking, scheduling and customer records.
- **Build a professional presence:** maintain a profile, portfolio and credential submissions.
- **Manage business administration:** access invoices, expenses, subscriptions and Stripe Connect
  payout onboarding.

Credential submission and review are product workflows; inclusion in the marketplace is not a
blanket guarantee that every contractor has completed every check.

### For administrators and reviewers

The web app includes tools for contractor verification, user and job administration, payment
reconciliation, disputes and assessment review. Building-assessment review can capture an attributed
human judgement alongside the original AI output and supporting photographs.

### A typical maintenance journey

1. A homeowner records a property issue and adds photographs.
2. They optionally request Mint AI assistance and create a job.
3. Contractors discover the job and submit bids or quotes.
4. The homeowner chooses a contractor; both parties communicate and track the work.
5. Completion evidence, approval and any enabled payment steps are recorded.
6. Reviews and property history help document the outcome.

## Mint AI: photo evidence and human review

Mint AI is the assessment component of Mintenance. It produces proposed findings, severity, urgency
and explanations from submitted evidence. The inspection workflow supports photo-linked corrections,
work reports, follow-up observations and expert review.

The current assessment generator supports a configured OpenAI model and an in-house vision-language
model. Routing is configuration-dependent; the source defaults to `shadow_only`. Legacy Roboflow,
YOLO and SAM outputs are deliberately excluded from the current assessment evidence stage. Their
presence elsewhere in the repository does not mean they power every assessment.

AI output is assistance for human review. It does not certify a building, establish hidden causes
from photographs or replace a qualified on-site inspection. No field-accuracy guarantee is made
here. The supervised inspection pilot is in preparation, with reviewer assignment and release checks
still required before enrolling real cases.

For the current architecture, evaluation gates and pilot scope, start with:

- [Mint AI continuation and reviewed-data workflow](docs/MINT_AI_CONTINUATION.md)
- [Implementation plan](docs/mint-ai-implementation-plan.md)
- [Supervised inspection pilot](docs/pilot/README.md)

## Payments and release verification

The repository implements Stripe and Stripe Connect integrations for customer payments, contractor
onboarding, payouts, refunds, subscriptions and completion-based payment release. Some internal
workflows use the term "escrow"; this README does not promise a separately regulated escrow service.

Live webhook delivery and the complete payment lifecycle require verification in the intended
environment. A successful deployment, a passing mocked test or an empty error log does not establish
that a real payment, refund or payout has completed successfully.

## Repository and technology

This is an npm-workspace monorepo with shared TypeScript packages.

| Area                | Implementation                                                   |
| ------------------- | ---------------------------------------------------------------- |
| Web                 | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 3      |
| Mobile              | Expo SDK 54, React Native 0.81, React Navigation                 |
| Data and identity   | Supabase PostgreSQL, Auth, Storage and Realtime                  |
| Payments            | Stripe and Stripe Connect                                        |
| Supporting services | Upstash Redis, Sentry and configured AI services                 |
| Tests               | Vitest for web, Jest for mobile, Playwright for browser journeys |
| Delivery            | GitHub Actions, Vercel for web, EAS for native builds            |

Exact dependency declarations and resolved versions live in the workspace `package.json` files and
`package-lock.json`.

```text
apps/
  web/                 Next.js pages, API routes and web components
  mobile/              Expo / React Native application
  demo-video/          Product demonstration tooling
packages/              Shared types, auth, API contracts, UI and utilities
supabase/
  migrations/          Versioned database changes
  functions/           Edge Functions, including the Stripe webhook relay
scripts/               Development, validation and operational tools
docs/                  Architecture, release records, AI and pilot documentation
```

## Local development

### Requirements

- Use **Node.js 20.19.4**, pinned in [`.nvmrc`](.nvmrc), for the development/CI baseline. The root
  engine range is `>=20.19.4 <25`.
- The root manifest declares **npm 11.6.2**. Install dependencies from the repository root.
- Database-backed features need a configured development Supabase project. Payment testing needs
  Stripe test-mode settings.
- Mobile development requires an appropriate device, emulator or simulator.

### Set up the web app

Clone the production development branch explicitly. GitHub's repository default is currently `Main`,
while the web production branch is lowercase `main`.

```bash
git clone --branch main https://github.com/Mintenance-LTD/mintenance.git
cd mintenance
npm ci
```

For CPU-only Linux installations, CI sets `ONNXRUNTIME_NODE_INSTALL=skip` before installing
dependencies to avoid the optional ONNX GPU download. This preserves npm lifecycle scripts; do not
replace it with `--ignore-scripts`, which would skip the repository's security preparation.

Copy [`apps/web/.env.example`](apps/web/.env.example) to `apps/web/.env.local` and configure your
development environment. Template values are placeholders, not working credentials.

The authoritative web validation is [`apps/web/lib/env.ts`](apps/web/lib/env.ts). In particular:

- Provide the development Supabase URL, public anon key and server-only service-role key.
- Generate a strong `JWT_SECRET` of at least 64 characters, with at least three character classes.
- Use matching Stripe test-mode secret and publishable keys. Webhook routes also need their signing
  secret.
- Configure optional AI, maps, Redis and monitoring services for the features you intend to
  exercise.
- Keep server credentials out of `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` settings and out of Git.

Review the migration history against the intended development database before applying schema
changes. A migration file in Git is not evidence that it has been applied to a deployed project.

```bash
npm run build:packages
npm run dev:web
```

The web app runs at `http://localhost:3000`. A running page alone does not mean external
integrations are configured.

### Set up the mobile app

Copy [`apps/mobile/.env.example`](apps/mobile/.env.example) to `apps/mobile/.env`. Set the public
Supabase and Stripe values and an API base URL reachable from the device; a physical phone cannot
reach your computer through its own `localhost`.

After installing root dependencies and building shared packages:

```bash
npm run dev:mobile
```

See [mobile documentation](docs/mobile/README.md), [app configuration](apps/mobile/app.config.js)
and [EAS profiles](apps/mobile/eas.json) for platform-specific setup. Starting Expo is separate from
building and signing a distributable app.

## Checks and builds

Run these from the repository root:

| Command                               | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| `npm run test:web -- run`             | Run web unit/component tests once  |
| `npm run test:mobile -- --runInBand`  | Run mobile Jest tests              |
| `npm run type-check:web`              | Type-check the web app             |
| `npm run lint:web`                    | Run web ESLint checks              |
| `npm run build:packages`              | Prepare shared packages            |
| `npm run build:web`                   | Build the web app                  |
| `npm run test:e2e -w @mintenance/web` | Run app-backed Playwright journeys |

Browser tests use [the web Playwright configuration](apps/web/playwright.config.ts) and
authenticated test setup. Use a dedicated test environment and synthetic accounts; those tests can
create or change data. Install the required Playwright browsers before running them.

CI checks vary with the changed files and event. A PR run and a post-merge `main` run may execute
different jobs. Native build jobs are gated by relevant changes; a skipped Android/iOS job is not a
successful binary build. Check the jobs for the exact commit when assessing a release.

## Deployment and contributing

The web production branch is lowercase `main`. Vercel handles web deployments; EAS handles native
build profiles and signing. Configure each environment separately and preserve restricted-beta
access protection.

Create a branch from current `main`, make focused changes, run relevant checks and open a pull
request against `main`. Review database migrations and operational scripts separately from
application changes. Do not use production accounts or payment credentials as test fixtures.

Useful starting points:

- [Repository guidance](AGENTS.md)
- [Documentation index](docs/README.md)
- [Web CI workflow](.github/workflows/ci-cd.yml)
- [Browser-test workflow](.github/workflows/e2e-tests.yml)
- [Mobile-build workflow](.github/workflows/mobile-build.yml)
- [Stripe webhook relay documentation](supabase/functions/stripe-webhook-relay/README.md)

Some older documents describe historical experiments or past test counts. Prefer current source,
configuration and release evidence over undated readiness claims.
