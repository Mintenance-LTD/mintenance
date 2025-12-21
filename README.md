# 🏠 Mintenance - AI-Powered Contractor Discovery Marketplace

[![Mobile Tests](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/mobile-tests.yml)
[![CI/CD Pipeline](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/ci-cd.yml)
[![Security Scan](https://github.com/Mintenance-LTD/mintenance/actions/workflows/security-scan.yml/badge.svg)](https://github.com/Mintenance-LTD/mintenance/actions/workflows/security-scan.yml)

**Connect homeowners with verified contractors for property maintenance and repair jobs. Powered by AI.**

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

#### AI-Powered Features
- **Building Surveyor AI**: Multi-model fusion (YOLO + SAM3 + GPT-4 Vision) for comprehensive property damage analysis
- **Semantic Search**: AI-powered search for jobs and contractors
- **Contractor Matching**: Intelligent matching based on skills, location, and past performance
- **Pricing Intelligence**: AI-suggested pricing based on market data and job complexity
- **Automated Workflows**: 12 specialized AI agents for bid acceptance, scheduling, notifications, and more

---

## 🛠️ Tech Stack

### Web Application
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4.1 + Radix UI + Shadcn UI
- **State Management**: TanStack Query 5.90
- **Forms**: React Hook Form 7.66 + Zod 4.1
- **Animations**: Framer Motion 12.23

### Mobile Application
- **Framework**: Expo SDK ~54
- **UI Library**: React Native 0.82
- **Language**: TypeScript 5.9 (strict mode)
- **Navigation**: React Navigation 7
- **State Management**: TanStack Query 5.90 + React Context
- **Animations**: React Native Reanimated 4.1 + Gesture Handler
- **Maps**: React Native Maps

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth + JWT tokens
- **Storage**: Supabase Storage + Google Cloud Storage
- **Payments**: Stripe 19.0 (Connect for contractors, Escrow for jobs)
- **Real-time**: Supabase Realtime subscriptions
- **Caching**: Upstash Redis
- **AI/ML**: 
  - OpenAI GPT-4 Vision for image analysis
  - YOLO v11 for damage detection (71 classes)
  - SAM3 for pixel-perfect segmentation
  - Custom ML models for pricing and matching

### Shared Packages (Monorepo)
- `@mintenance/types` - TypeScript type definitions
- `@mintenance/auth` - Authentication utilities (JWT, password validation)
- `@mintenance/shared` - Shared utilities and logger
- `@mintenance/shared-ui` - Shared UI components (web/native)
- `@mintenance/design-tokens` - Design system tokens
- `@mintenance/api-client` - API client wrapper

---

## 🏗️ Architecture

### Monorepo Structure

```
mintenance/
├── apps/
│   ├── web/                    # Next.js 16 Web App
│   │   ├── app/               # App Router routes
│   │   │   ├── (auth)/       # Authentication routes
│   │   │   ├── dashboard/   # Homeowner dashboard
│   │   │   ├── contractor/   # Contractor features
│   │   │   ├── jobs/         # Job management
│   │   │   ├── api/          # API routes
│   │   │   └── ...
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and services
│   │   └── ...
│   └── mobile/                # Expo React Native App
│       ├── app/              # Expo Router
│       ├── components/       # React Native components
│       ├── screens/          # Screen components
│       └── ...
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── auth/                 # Auth utilities
│   ├── shared/               # Shared utilities
│   ├── shared-ui/            # Shared UI components
│   ├── design-tokens/        # Design system
│   └── api-client/           # API client
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge functions
└── docs/                     # Documentation
```

### Key Architectural Patterns

- **Server Components First**: Next.js 16 App Router with Server Components by default
- **Client Components Minimal**: Only use 'use client' when necessary (interactivity, hooks, browser APIs)
- **API Routes**: Next.js API routes for server-side operations
- **Server Actions**: 'use server' functions for form submissions and mutations
- **Type Safety**: Strict TypeScript with shared types from `@mintenance/types`
- **Design Tokens**: Centralized design system via `@mintenance/design-tokens`

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 9.0.0 or higher
- **Git**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for development)

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

4. **Set up Supabase database**

   Run migrations:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually via Supabase dashboard
   # Apply all files in supabase/migrations/
   ```

5. **Start development servers**

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
```

### Code Style

- **TypeScript**: Strict mode enabled, explicit return types required
- **React**: Function components, Server Components by default
- **Naming**: camelCase for variables/functions, PascalCase for components
- **File Structure**: kebab-case for files, colocate related files
- **Imports**: Use `@/` alias for app-specific, package names for shared

See `AGENTS.md` for comprehensive coding standards and conventions.

---

## 🤖 AI Features

### Building Surveyor AI

The flagship AI feature that analyzes property damage photos using multiple models:

- **YOLO v11**: Detects 71 damage classes (cracks, leaks, mold, etc.)
- **SAM3**: Pixel-perfect segmentation for precise damage boundaries
- **GPT-4 Vision**: Semantic understanding and natural language descriptions
- **Bayesian Fusion**: Combines evidence from all models mathematically
- **Conformal Prediction**: Provides statistical confidence guarantees

**Use Case**: Homeowners upload photos when creating jobs → AI analyzes damage → Provides assessment with safety concerns, repair estimates, and contractor recommendations.

### AI Agents

12 specialized automation agents:

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
- ✅ Set up monitoring and error tracking

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

### Database Schema

- Migrations are in `supabase/migrations/`
- Schema documentation in `docs/technical/database/`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following `AGENTS.md` guidelines
4. Run tests: `npm run test && npm run e2e`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

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

## 🔗 Links

- **Website**: https://mintenance.co.uk
- **GitHub**: https://github.com/Mintenance-LTD/mintenance
- **Documentation**: See `docs/` directory

---

**Built with ❤️ by the Mintenance Team**
