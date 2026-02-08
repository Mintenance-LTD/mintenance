# 🏠 Mintenance - AI-Powered Contractor Discovery Marketplace

**Connect homeowners with verified contractors for property maintenance and repair jobs. Powered by AI.**

## 🔗 Connect With Us

- **Website**: https://mintenance.co.uk
- **GitHub**: https://github.com/Mintenance-LTD/mintenance
- **LinkedIn**: [Mintenance](https://linkedin.com/company/mintenance)
- **Twitter**: [@MintenanceUK](https://twitter.com/MintenanceUK)

---

[![Mobile Tests](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml)
[![CI/CD Pipeline](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml)
[![Security Scan](https://github.com/Mintenance-LTD/mintenance/actions/workflows/security-scan.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/security-scan.yml)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Platform Features](#platform-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [AI Features](#ai-features)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## 🎯 Overview

**Mintenance** is a comprehensive marketplace platform that connects homeowners with verified contractors for property maintenance, repairs, and home improvement projects. The platform features AI-powered damage assessment, real-time messaging, secure escrow payments, and intelligent contractor matching.

### Key Capabilities

- **For Homeowners**: Post jobs, get AI-powered damage assessments, receive bids from verified contractors, manage payments via escrow, and track project progress
- **For Contractors**: Discover jobs via map or swipe interface, submit detailed bids, communicate with homeowners, receive secure payments via Stripe Connect, and build a professional portfolio
- **For Admins**: Verify contractor credentials, monitor platform health, review AI model performance, and handle disputes

### Current Status

- **Version**: 1.2.4 (Monorepo) / 1.2.3 (Web App)
- **Status**: Active Development
- **Deployment**: Ready for mintenance.co.uk
- **Location**: Greater Manchester, UK
- **Latest Updates** (February 2026):
  - Comprehensive codebase audit with P0/P1/P2 fixes (264 files)
  - CSRF protection hardened across all auth paths
  - Database query layer corrected (`profiles` table alignment)
  - Zod input validation added to 75+ API routes
  - Error boundaries added to 55+ page directories
  - Payment flow test suite (6 critical endpoints)
  - UK Stripe fee rates corrected (1.5% + £0.20)
  - Materials database system with UK supplier pricing
  - Property favorites and health scoring
  - Demo feedback collection for AI training

### Platform Statistics

| Metric | Value |
|--------|-------|
| **Architecture** | Next.js 16.0.4 + Expo SDK ~54 (React Native 0.81.5) |
| **Database Migrations** | 180+ migrations (38 active + 144 archived) |
| **API Endpoints** | 260+ routes across 50+ feature areas |
| **Input Validation** | 75+ routes with Zod schema validation |
| **Error Boundaries** | 55+ page-level error boundaries |
| **Web Pages** | 100+ pages and routes |
| **Mobile Screens** | 100+ screens |
| **AI Services** | Building Surveyor AI + 6 major flows |
| **Autonomous Agents** | 13 specialized agents |
| **Materials Database** | UK supplier pricing catalog (12+ categories) |
| **Properties System** | Multi-property management with favorites and health scoring |

---

## 🆕 Recent Updates (February 2026)

- **Codebase Audit & Hardening**: Comprehensive P0/P1/P2 fixes across 264 files
  - CSRF protection gap fixed on Supabase auth path
  - Database queries aligned to `profiles` table (82 files corrected)
  - UK Stripe fee rates corrected (1.5% + £0.20, was using US rates)
  - Zod input validation added to 75+ API routes
  - 55+ error boundaries for graceful error handling
  - Payment flow test suite covering 6 critical endpoints
  - Idempotency and retry logic for Stripe refunds
  - Webhook handler registry cleaned up
- **Materials Database System**: UK supplier pricing catalog integrated with AI damage assessments
  - Real pricing from Screwfix, B&Q, Wickes, Travis Perkins
  - Fuzzy search matching for AI-detected materials
  - Cost breakdown with verified pricing badges
- **Property Favorites**: Bookmark and manage favorite properties
- **Property Health Scoring**: Track property condition and spending analytics
- **Demo Feedback Collection**: Public demo (`/try-mint-ai`) collects user corrections for AI training
- **Enhanced Property-Job Linking**: Jobs can now be linked to specific properties for better tracking
- **PostGIS Geography**: Service areas with spatial queries and distance calculations

---

## ✨ Platform Features

### Core Functionality

#### Homeowner Features
- **Job Posting**: Create detailed job posts with photos, location, budget, and category
- **AI Damage Assessment (MintAI)**: Upload photos to get AI-powered analysis of property damage, safety hazards, repair estimates, and material cost breakdowns
- **Try MintAI Demo**: Free demo tool to test AI assessment with feedback collection for model training
- **Bid Management**: Review, compare, and accept contractor bids with AI pricing suggestions
- **Payment & Escrow**: Secure payments held in escrow until job completion via Stripe
- **Project Tracking**: Real-time updates on job progress with photo uploads and milestones
- **Messaging**: Direct communication with contractors via real-time chat
- **Property Management**: Manage multiple properties, property favorites, health scores, and spending analytics
- **Reviews & Ratings**: Rate contractors after job completion
- **Video Calls**: Schedule and conduct video consultations with contractors

#### Contractor Features
- **Job Discovery**: Browse available jobs via map view or Tinder-style swipe interface (`/discover`)
- **Bid Submission**: Submit detailed bids with line items, materials database integration, and timeline
- **Materials Database**: Access UK supplier pricing for accurate cost estimation (Screwfix, B&Q, Wickes, Travis Perkins)
- **Portfolio Building**: Showcase completed work with photos and reviews
- **Business Tools**: Invoicing, expense tracking, calendar scheduling, market insights, subscription plans
- **Payment Processing**: Receive payments via Stripe Connect with automated payouts
- **Service Areas**: Define and manage service coverage areas with PostGIS geography support
- **Verification**: Get verified credentials (license, insurance, background checks) to build trust
- **Financial Dashboard**: Track earnings, payouts, and business metrics
- **Professional Subscription Plans**: Tiered plans with platform fee savings and ROI calculator

#### AI-Powered Features
- **Building Surveyor AI (MintAI)**: Multi-model fusion (YOLO v11 + SAM3 + GPT-4 Vision) for comprehensive property damage analysis
  - Material detection with UK supplier database integration
  - Cost breakdown with verified pricing (✓ DB badges)
  - Training feedback system for continuous model improvement
- **Semantic Search**: AI-powered search for jobs and contractors using OpenAI embeddings
- **Contractor Matching**: Intelligent matching based on skills, location, and past performance
- **Pricing Intelligence**: AI-suggested pricing based on market data, job complexity, and materials database
- **Automated Workflows**: 13 specialized AI agents for bid acceptance, scheduling, notifications, escrow release, and more

---

## 🛠️ Tech Stack

### Web Application
- **Framework**: Next.js 16.0.4 (App Router)
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5.9.3 (strict mode)
- **Styling**: Tailwind CSS 3.4.18 + Radix UI + Shadcn UI
- **State Management**: TanStack Query 5.90.0
- **Forms**: React Hook Form 7.66.1 + Zod 3.23.4
- **Animations**: Framer Motion 12.23.24
- **Testing**: Vitest 4.0.15 + Playwright 1.58.0

### Mobile Application
- **Framework**: Expo SDK ~54
- **UI Library**: React Native 0.81.5
- **Language**: TypeScript 5.9 (strict mode)
- **Navigation**: React Navigation 7
- **State Management**: TanStack Query 5.90 + React Context
- **Animations**: React Native Reanimated 4.1 + Gesture Handler
- **Maps**: React Native Maps
- **Build**: EAS Build
- **Monitoring**: Sentry React Native 7.6

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS) and PostGIS extension
- **Authentication**: Supabase Auth + JWT tokens
- **Storage**: Supabase Storage + Google Cloud Storage
- **Payments**: Stripe 15.4.0 (Connect for contractors, Escrow for jobs)
- **Real-time**: Supabase Realtime subscriptions
- **Caching**: Upstash Redis
- **AI/ML Services**:
  - OpenAI GPT-4 Vision (4.73.0) for image analysis and semantic understanding
  - YOLO v11 for damage detection (71 classes) via ONNX Runtime
  - SAM3 for pixel-perfect segmentation (Python service)
  - Custom ML models for pricing and matching
  - Google Cloud AI Platform (5.12.0) for model deployment
  - Materials database with fuzzy search for cost enrichment

### Shared Packages (Monorepo)
- `@mintenance/types` - TypeScript type definitions (single source of truth)
- `@mintenance/auth` - Authentication utilities (JWT, password validation)
- `@mintenance/shared` - Shared utilities and logger
- `@mintenance/shared-ui` - Shared UI components (web/native)
- `@mintenance/design-tokens` - Design system tokens
- `@mintenance/api-client` - API client wrapper
- `@mintenance/security` - Security utilities (rate limiting, CSRF, input sanitization)
- `@mintenance/ai-core` - AI/ML core utilities and model interfaces

---

## 🏗️ Architecture

### Monorepo Structure

```
mintenance/
├── apps/
│   ├── web/                    # Next.js 16 Web App
│   │   ├── app/               # App Router routes
│   │   │   ├── (auth)/       # Authentication routes
│   │   │   ├── dashboard/    # Homeowner dashboard
│   │   │   ├── contractor/   # Contractor features
│   │   │   ├── jobs/         # Job management
│   │   │   ├── api/          # API routes (260+ endpoints)
│   │   │   └── ...
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and services
│   │   │   ├── services/    # Business logic services
│   │   │   ├── api/         # API client utilities
│   │   │   └── ...
│   │   └── ...
│   ├── mobile/                # Expo React Native App
│   │   ├── app/              # Expo Router
│   │   ├── components/       # React Native components
│   │   ├── screens/          # Screen components (100+)
│   │   ├── services/         # Mobile-specific services
│   │   └── ...
│   ├── sam3-service/          # SAM3 AI Service (Python)
│   └── sam2-video-service/    # SAM2 Video Service (Python)
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── auth/                 # Auth utilities
│   ├── shared/               # Shared utilities
│   ├── shared-ui/            # Shared UI components
│   ├── design-tokens/        # Design system
│   ├── api-client/           # API client
│   ├── security/             # Security utilities
│   └── ai-core/              # AI/ML core utilities
├── supabase/
│   ├── migrations/          # Database migrations (180+)
│   │   ├── 001_core_tables.sql
│   │   ├── 002_job_system.sql
│   │   ├── 003_payment_system.sql
│   │   ├── 004_security_audit.sql
│   │   ├── 005_ml_ai_system.sql
│   │   └── ...
│   └── functions/           # Edge functions
│       ├── setup-contractor-payout/
│       └── test-payout/
└── docs/                     # Documentation
    ├── technical/           # Technical docs
    ├── business/            # Business docs
    └── ...
```

### Key Architectural Patterns

- **Server Components First**: Next.js 16 App Router with Server Components by default
- **Client Components Minimal**: Only use 'use client' when necessary (interactivity, hooks, browser APIs)
- **API Routes**: Next.js API routes for server-side operations
- **Server Actions**: 'use server' functions for form submissions and mutations
- **Type Safety**: Strict TypeScript with shared types from `@mintenance/types`
- **Design Tokens**: Centralized design system via `@mintenance/design-tokens`
- **Security Layer**: Rate limiting, CSRF, input validation via `@mintenance/security`
- **Monorepo**: npm workspaces for code sharing between web and mobile

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.19.4 or higher (see `.nvmrc` for exact version)
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for development)
- **Google Cloud Account**: For AI/ML services (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mintenance-LTD/mintenance.git
   cd mintenance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create `.env.local` in `apps/web/`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Authentication
   JWT_SECRET=your-strong-jwt-secret-minimum-32-characters

   # Stripe (optional for development)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

   # OpenAI (for AI features)
   OPENAI_API_KEY=sk-proj-...

   # Google Cloud (for image storage and AI)
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

   # Redis (for caching)
   UPSTASH_REDIS_REST_URL=your-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-redis-token

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

   Create `.env.local` in `apps/mobile/`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Set up Supabase database**

   Run migrations:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually via Supabase dashboard
   # Apply all files in supabase/migrations/ in order:
   # 001_core_tables.sql
   # 002_job_system.sql
   # 003_payment_system.sql
   # 004_security_audit.sql
   # 005_ml_ai_system.sql
   ```

5. **Build shared packages**
   ```bash
   npm run build:packages
   ```

6. **Start development servers**

   ```bash
   # Web app (default)
   npm run dev

   # Mobile app
   npm run dev:mobile

   # Both
   npm run dev:web & npm run dev:mobile
   ```

   Web app will be available at `http://localhost:3000`

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start web app
npm run dev:web          # Start web app explicitly
npm run dev:mobile       # Start mobile app

# Building
npm run build            # Build all packages and apps
npm run build:packages    # Build shared packages first
npm run build:apps       # Build web and mobile apps
npm run build:web        # Build web app only
npm run build:mobile     # Build mobile app only

# Testing
npm run test             # Run all tests
npm run test:web         # Run web app tests
npm run test:mobile      # Run mobile app tests
npm run e2e              # Run E2E tests with Playwright
npm run e2e:ui           # Run E2E tests with UI

# Linting & Type Checking
npm run lint             # Lint all apps
npm run type-check       # Type check all apps

# Database
npm run migrate:push     # Push all migrations to Supabase
npm run migrate:setup    # Set up migration functions

# Auditing
npm run audit:all        # Run all audits (use-client, file-sizes, any-types, console)
npm run audit:use-client # Audit 'use client' usage
npm run audit:file-sizes # Check file sizes
npm run audit:any-types  # Find any types
npm run audit:console    # Find console statements
```

### Code Style

- **TypeScript**: Strict mode enabled, explicit return types required
- **React**: Function components, Server Components by default
- **Naming**: camelCase for variables/functions, PascalCase for components
- **File Structure**: kebab-case for files, colocate related files
- **Imports**: Use `@/` alias for app-specific, package names for shared
- **File Size**: Keep files under 500 lines, split if approaching 400 lines

See `.claude/CLAUDE.md` for coding standards and conventions.

---

## 🤖 AI Features

### Building Surveyor AI (MintAI)

The flagship AI feature that analyzes property damage photos using multiple models:

- **YOLO v11**: Detects 71 damage classes (cracks, leaks, mold, structural issues, etc.)
- **SAM3**: Pixel-perfect segmentation for precise damage boundaries
- **GPT-4 Vision**: Semantic understanding and natural language descriptions
- **Bayesian Fusion**: Combines evidence from all models mathematically
- **Conformal Prediction**: Provides statistical confidence guarantees
- **Hybrid Routing**: Intelligently routes between local and cloud models

**Use Case**: Homeowners upload photos when creating jobs → AI analyzes damage → Provides assessment with safety concerns, repair estimates, material cost breakdowns (with UK supplier pricing), and contractor recommendations.

**Recent Enhancements**:
- **Material Database Integration**: AI-detected materials are enriched with real UK supplier pricing (Screwfix, B&Q, Wickes, Travis Perkins)
- **Demo Feedback System**: Public demo at `/try-mint-ai` collects user feedback for continuous model training
- **Cost Accuracy**: "✓ DB" badges indicate verified pricing from materials database vs AI estimates

### AI Agents

13 specialized automation agents:

1. **BidAcceptanceAgent**: Auto-accept high-quality bids based on criteria
2. **PricingAgent**: AI-powered pricing recommendations
3. **SchedulingAgent**: Optimize appointment scheduling
4. **NotificationAgent**: Intelligent notification timing
5. **DisputeResolutionAgent**: AI-assisted dispute mediation
6. **JobStatusAgent**: Automatic job status updates
7. **PredictiveAgent**: Demand prediction and pricing
8. **AssessmentAgent**: Automated damage assessment
9. **MatchingAgent**: Contractor-job matching
10. **EscrowAgent**: Automated escrow management
11. **ReviewAgent**: Automated review prompts
12. **VerificationAgent**: Contractor verification automation
13. **EscrowReleaseAgent**: Automated escrow release workflows

Users can control automation levels (Off, Basic, Standard, Full) per agent via the Settings page.

### Semantic Search

AI-powered search using OpenAI embeddings for:
- Job discovery by description
- Contractor search by skills and experience
- Property search by features

---

## 🧪 Testing

### Test Suites

- **Payment Flow Tests**: 6 critical endpoints (create-intent, refund, release-escrow, payment methods, fee calculations)
- **Stripe Webhook Tests**: Event handler coverage for subscriptions, invoices, charges, checkout
- **Validation Schema Tests**: Zod schema validation for 75+ API routes
- **Mobile Tests**: Component and integration tests for React Native screens
- **OWASP Security Tests**: Critical fixes integration tests

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# E2E with UI
npm run e2e:ui

# Mobile tests
cd apps/mobile && npm test

# Coverage
npm run test -- --coverage
```

### E2E Test Flows

1. **Job Posting → Bidding → Assignment**: Complete job lifecycle
2. **Payment → Escrow → Release**: Payment processing workflow
3. **User Registration → Profile Setup**: Onboarding flow
4. **Contractor Matching**: Discovery and matching algorithm
5. **Auth Context Integration**: Authentication flows

---

## 🚀 Deployment

### Web Deployment (Vercel)

1. **Connect repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on push to `main`

```bash
# Manual deployment
vercel --prod

# Verify deployment
npm run deploy:verify
```

### Mobile Deployment (EAS Build)

```bash
# Build for production
cd apps/mobile
eas build --platform all --profile production

# Submit to app stores
eas submit --platform all
```

### Security

The platform includes multiple layers of security:

- **CSRF Protection**: Double-submit cookie pattern enforced globally via middleware for all mutating requests (`__Host-csrf-token` in production)
- **Rate Limiting**: Per-endpoint rate limiting via Upstash Redis (payments, auth, API routes)
- **Input Validation**: Zod schema validation on 75+ API routes with sanitized error responses
- **Idempotency**: Distributed locking for payment operations to prevent duplicate charges/refunds
- **MFA**: Multi-factor authentication required for high-risk payment operations (refunds above threshold)
- **Row Level Security**: PostgreSQL RLS policies on all tables via Supabase
- **JWT Authentication**: HS256 symmetric tokens via `@mintenance/auth` with middleware enforcement
- **Error Boundaries**: 55+ page-level error boundaries for graceful error handling
- **Payment Monitoring**: Anomaly detection service that blocks suspicious transactions
- **Security Headers**: CSP, HSTS, X-Frame-Options configured in middleware

### Deployment Security Checklist

Before production deployment:

- ✅ Generate secure `JWT_SECRET` (64+ characters)
- ✅ Use production Supabase project
- ✅ Configure production Stripe keys
- ✅ Set up environment variables
- ✅ Enable security headers (CSP, HSTS, etc.)
- ✅ Configure rate limiting
- ✅ Set up monitoring and error tracking (Sentry)
- ✅ Verify all migrations are applied
- ✅ Test payment flows end-to-end

---

## 📚 Documentation

### Key Documentation Files

- **`.claude/CLAUDE.md`**: Coding standards and development conventions
- **`docs/technical/architecture/`**: Technical architecture documentation
- **`docs/technical/ai/`**: AI features and implementation guides
- **`docs/user-guides/`**: User-facing documentation
- **`docs/quick-start/`**: Quick start guides for common tasks

### API Documentation

- API endpoints are documented in `docs/technical/api/API_DOCUMENTATION.md`
- All API routes are in `apps/web/app/api/`
- OpenAPI spec available at `apps/web/openapi.yaml`

### Database Schema

- Migrations are in `supabase/migrations/`
- Schema documentation in `docs/technical/database/`
- Core migrations: `001_core_tables.sql` through `008_add_location_context_tracking.sql`
- Recent additions (2026):
  - `20260202120000_add_materials_system.sql` - Materials catalog with UK supplier pricing
  - `20260202000001_add_demo_feedback_table.sql` - Training feedback collection
  - `20260203000001_fix_properties_schema.sql` - Property schema enhancements
  - `20260203000002_add_property_favorites.sql` - Property favorites system

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following project conventions
4. Run tests: `npm run test && npm run e2e`
5. Run linting: `npm run lint && npm run type-check`
6. Commit your changes: `git commit -m 'feat: add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Contribution Guidelines

- Follow the coding standards in `.claude/CLAUDE.md`
- Write tests for new features
- Keep files under 500 lines
- Use TypeScript strict mode
- Prefer Server Components over Client Components
- Use design tokens from `@mintenance/design-tokens`

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

For technical issues or questions:

- Check the [documentation](docs/)
- Review [deployment guides](docs/technical/deployment/)
- Run verification: `npm run deploy:verify`
- Check [troubleshooting guides](docs/debug/)

---

**Built with ❤️ by the Mintenance Team**
