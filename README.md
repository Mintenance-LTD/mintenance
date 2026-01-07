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

- **Version**: 1.2.4
- **Status**: Production Ready
- **Test Coverage**: 87.7% (804/917 tests passing)
- **Deployment**: Ready for mintenance.co.uk
- **Location**: Greater Manchester, UK

### Platform Statistics

| Metric | Value |
|--------|-------|
| **Test Coverage** | 87.7% (804/917 tests passing) |
| **Architecture** | Next.js 16 + React Native 0.82 |
| **Database Migrations** | 120+ migrations |
| **API Endpoints** | 200+ routes |
| **Web Pages** | 514 TSX files |
| **Mobile Screens** | 100+ screens |
| **AI Services** | 6 major flows |
| **Autonomous Agents** | 13 specialized agents |

---

## ✨ Platform Features

### Core Functionality

#### Homeowner Features
- **Job Posting**: Create detailed job posts with photos, location, budget, and category
- **AI Damage Assessment**: Upload photos to get AI-powered analysis of property damage, safety hazards, and repair estimates
- **Bid Management**: Review, compare, and accept contractor bids
- **Payment & Escrow**: Secure payments held in escrow until job completion
- **Project Tracking**: Real-time updates on job progress with photo uploads
- **Messaging**: Direct communication with contractors
- **Property Management**: Manage multiple properties and job history
- **Reviews & Ratings**: Rate contractors after job completion

#### Contractor Features
- **Job Discovery**: Browse available jobs via map view or swipe interface
- **Bid Submission**: Submit detailed bids with line items, materials, and timeline
- **Portfolio Building**: Showcase completed work with photos and reviews
- **Business Tools**: Invoicing, expense tracking, calendar scheduling, market insights
- **Payment Processing**: Receive payments via Stripe Connect
- **Service Areas**: Define and manage service coverage areas
- **Verification**: Get verified credentials to build trust
- **Financial Dashboard**: Track earnings, payouts, and business metrics

#### AI-Powered Features
- **Building Surveyor AI**: Multi-model fusion (YOLO v11 + SAM3 + GPT-4 Vision) for comprehensive property damage analysis
- **Semantic Search**: AI-powered search for jobs and contractors using OpenAI embeddings
- **Contractor Matching**: Intelligent matching based on skills, location, and past performance
- **Pricing Intelligence**: AI-suggested pricing based on market data and job complexity
- **Automated Workflows**: 13 specialized AI agents for bid acceptance, scheduling, notifications, and more

---

## 🛠️ Tech Stack

### Web Application
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS 4.1 + Radix UI + Shadcn UI
- **State Management**: TanStack Query 5.90
- **Forms**: React Hook Form 7.66 + Zod 4.1
- **Animations**: Framer Motion 12.23
- **Testing**: Vitest 4.0 + Playwright

### Mobile Application
- **Framework**: Expo SDK ~54
- **UI Library**: React Native 0.82
- **Language**: TypeScript 5.9 (strict mode)
- **Navigation**: React Navigation 7
- **State Management**: TanStack Query 5.90 + React Context
- **Animations**: React Native Reanimated 4.1 + Gesture Handler
- **Maps**: React Native Maps
- **Build**: EAS Build
- **Monitoring**: Sentry React Native 7.6

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL 17) with Row Level Security (RLS)
- **Authentication**: Supabase Auth + JWT tokens
- **Storage**: Supabase Storage + Google Cloud Storage
- **Payments**: Stripe 19.0 (Connect for contractors, Escrow for jobs)
- **Real-time**: Supabase Realtime subscriptions
- **Caching**: Upstash Redis
- **AI/ML Services**:
  - OpenAI GPT-4 Vision for image analysis
  - YOLO v11 for damage detection (71 classes)
  - SAM3 for pixel-perfect segmentation
  - Custom ML models for pricing and matching
  - Google Cloud AI Platform for model deployment

### Shared Packages (Monorepo)
- `@mintenance/types` - TypeScript type definitions
- `@mintenance/auth` - Authentication utilities (JWT, password validation)
- `@mintenance/shared` - Shared utilities and logger
- `@mintenance/shared-ui` - Shared UI components (web/native)
- `@mintenance/design-tokens` - Design system tokens
- `@mintenance/api-client` - API client wrapper
- `@mintenance/services` - Shared service layer (Auth, Payment, Job, Notification, etc.)

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
│   │   │   ├── api/          # API routes (200+ endpoints)
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
│   ├── services/             # Shared service layer
│   └── ai-core/              # AI/ML core utilities
├── supabase/
│   ├── migrations/          # Database migrations (120+)
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
- **Service Layer**: Shared business logic in `@mintenance/services` package
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

See `AGENTS.md` for comprehensive coding standards and conventions.

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

**Use Case**: Homeowners upload photos when creating jobs → AI analyzes damage → Provides assessment with safety concerns, repair estimates, and contractor recommendations.

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

### Test Coverage

- **Overall**: 87.7% (804/917 tests passing)
- **Service Layer**: 80.8% (346/428 passing)
- **Core Services**: 100% (JobSheetOperations, PaymentGateway, BidService)

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

### Security Checklist

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

- **`AGENTS.md`**: Coding standards and architectural guidelines
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
- Consolidated migrations: `001_core_tables.sql` through `005_ml_ai_system.sql`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following `AGENTS.md` guidelines
4. Run tests: `npm run test && npm run e2e`
5. Run linting: `npm run lint && npm run type-check`
6. Commit your changes: `git commit -m 'feat: add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Contribution Guidelines

- Follow the coding standards in `AGENTS.md`
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
