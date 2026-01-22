# MINTENANCE APPLICATION KNOWLEDGE BASE

## CRITICAL: This document preserves complete app understanding for every session

---

## 1. APPLICATION OVERVIEW

### What is Mintenance?

**Mintenance** is a comprehensive **property maintenance marketplace platform** that connects homeowners with verified contractors for home repair and maintenance jobs. Think of it as "Uber for home repairs" or "Airbnb for contractors."

### Core Value Proposition
- **For Homeowners:** Post jobs, receive competitive bids, hire trusted professionals, secure payment escrow
- **For Contractors:** Access quality leads, showcase work, manage jobs, get paid faster
- **For Admin:** Monitor platform, manage users, handle disputes, view analytics

### Business Model
- **Commission:** Platform takes percentage of completed jobs
- **Subscription:** Contractors pay for premium features
- **Escrow Services:** Hold payments until job completion
- **Premium Listings:** Contractors pay for visibility boost

---

## 2. TECHNOLOGY STACK

### Frontend
- **Web App:** Next.js 14 (App Router)
  - Location: `apps/web/`
  - Framework: React 18 with TypeScript
  - Styling: Tailwind CSS
  - State: React hooks, Context API
  - Animations: Framer Motion

- **Mobile App:** React Native (Expo)
  - Location: `apps/mobile/`
  - Navigation: React Navigation
  - State: Redux Toolkit
  - UI: Custom components + React Native Elements

### Backend
- **Database:** Supabase (PostgreSQL)
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage buckets for images/videos

- **Authentication:** Supabase Auth
  - JWT tokens with refresh rotation
  - MFA support (TOTP)
  - OAuth providers (Google, Facebook)
  - Session management with cookies

- **Payments:** Stripe
  - Connect for contractor payouts
  - Escrow handling
  - Subscription billing
  - Webhook integration

- **APIs:** Next.js API Routes
  - Location: `apps/web/app/api/`
  - 271 API endpoints
  - Rate limiting with Upstash Redis
  - CSRF protection

### Infrastructure
- **Hosting:** Vercel (Web), Expo EAS (Mobile)
- **CDN:** Cloudflare
- **Monitoring:** Sentry, LogRocket
- **Analytics:** Posthog, Google Analytics

---

## 3. USER TYPES & PERMISSIONS

### 1. Homeowners
**Capabilities:**
- Create/edit/delete jobs
- View contractor profiles
- Send/receive messages
- Make payments
- Leave reviews
- Manage properties

**Key Routes:**
- `/dashboard` - Homeowner dashboard
- `/jobs/create` - Create new job
- `/jobs/[id]` - View job details
- `/messages` - Messaging center
- `/properties` - Manage properties

### 2. Contractors
**Capabilities:**
- Browse available jobs
- Submit bids/quotes
- Manage schedule
- Track earnings
- Message clients
- Update profile/portfolio

**Key Routes:**
- `/contractor/dashboard` - Contractor hub
- `/contractor/discover` - Find jobs nearby
- `/contractor/bids` - Manage bids
- `/contractor/profile` - Professional profile
- `/contractor/payouts` - Earnings & payouts

### 3. Administrators
**Capabilities:**
- User management
- Dispute resolution
- Platform monitoring
- Revenue tracking
- Content moderation
- System configuration

**Key Routes:**
- `/admin/dashboard` - Admin panel
- `/admin/users` - User management
- `/admin/revenue` - Financial overview
- `/admin/ai-monitoring` - AI system monitoring
- `/admin/security-dashboard` - Security overview

---

## 4. CORE FEATURES

### Job Management System

**Job Creation Flow:**
1. Homeowner posts job with details
2. AI analyzes images for damage assessment
3. Job geocoded for location
4. Notifications sent to nearby contractors
5. Job visible in marketplace

**Job Lifecycle:**
```
DRAFT → POSTED → BIDDING → ASSIGNED → IN_PROGRESS → COMPLETED → REVIEWED
```

**Key Files:**
- `apps/web/app/api/jobs/route.ts` - Job CRUD operations
- `apps/web/app/jobs/create/page.tsx` - Job creation UI
- `apps/web/lib/services/JobService.ts` - Business logic

### Bidding & Quote System

**Bid Process:**
1. Contractor views job details
2. Submits bid with price/timeline
3. AI pricing agent validates reasonableness
4. Homeowner compares bids
5. Accepts preferred contractor

**Auto-Accept Feature:**
- If bid meets criteria, automatically accepted
- Reduces friction for simple jobs

**Key Files:**
- `apps/web/app/api/contractor/submit-bid/route.ts`
- `apps/web/app/contractor/bid/[jobId]/page.tsx`
- `apps/web/lib/services/agents/PricingAgent.ts`

### Messaging System

**Features:**
- Real-time chat via Supabase subscriptions
- File/image sharing
- Read receipts
- Push notifications
- Thread management

**Key Files:**
- `apps/web/app/messages/components/ChatInterface2025.tsx`
- `apps/web/app/api/messages/route.ts`
- `apps/web/hooks/useRealtime.ts`

### Payment & Escrow System

**Payment Flow:**
1. Homeowner adds payment method
2. Funds held in escrow on job assignment
3. Contractor completes work
4. Homeowner approves completion
5. Funds released to contractor
6. Platform takes commission

**Stripe Integration:**
- Connect accounts for contractors
- Payment intents for charges
- Webhooks for status updates

**Key Files:**
- `apps/web/app/api/payments/route.ts`
- `apps/web/app/api/webhooks/stripe/route.ts` (909 lines!)
- `apps/web/lib/services/PaymentService.ts`

---

## 5. AI & ML FEATURES

### Building Surveyor AI System

**Purpose:** Automated property damage assessment from images

**Components:**
1. **YOLO Model** - Custom trained for damage detection
2. **SAM3 (Segment Anything)** - Precise segmentation
3. **GPT-4 Vision** - Fallback for complex cases
4. **Conformal Prediction** - Uncertainty quantification

**Flow:**
```
Image Upload → Preprocessing → YOLO Detection → SAM Segmentation
→ Confidence Check → (If low) GPT-4 Vision → Assessment Report
```

**Key Files:**
- `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts`
- `apps/web/lib/services/building-surveyor/HybridInferenceService.ts`
- `apps/web/lib/services/building-surveyor/YOLOInferenceService.ts`
- `apps/web/lib/services/building-surveyor/SAM3Service.ts`

### AI Agents System

**Active Agents:**
1. **PricingAgent** - Fair quote validation
2. **BidAcceptanceAgent** - Auto-accept logic
3. **EscrowReleaseAgent** - Payment automation
4. **PredictiveAgent** - Job outcome prediction
5. **DecisionAgent** - Platform decisions

**Key Files:**
- `apps/web/lib/services/agents/PricingAgent.ts` (1,020 lines!)
- `apps/web/lib/services/agents/BidAcceptanceAgent.ts`
- `apps/web/lib/services/agents/EscrowReleaseAgent.ts`

### A/B Testing & Learning

**Features:**
- Continuous model improvement
- Shadow mode testing
- Conformal prediction for confidence
- Automatic retraining triggers

**Key Files:**
- `apps/web/lib/services/building-surveyor/ab-test/`
- `apps/web/lib/services/building-surveyor/AutoRetrainingService.ts`

---

## 6. UI/UX DESIGN SYSTEM

### Design Tokens
- **Primary:** Navy Blue (#1E293B)
- **Secondary:** Mint Green (#14B8A6)
- **Accent:** Amber Gold (#F59E0B)
- **Typography:** Inter, system fonts
- **Spacing:** 8px grid system

### Component Library

**Core Components:**
- `Button` - Primary, secondary, ghost variants
- `Card` - Content containers
- `Modal` - Overlays
- `Input` - Form fields with validation
- `EmptyState` - Educational empty states
- `LoadingSpinner` - Consistent loading
- `Badge` - Status indicators

**Professional Components:**
- `JobCard` - Job listing display
- `ContractorCard` - Profile cards
- `BidComparison` - Compare quotes
- `MessageBubble` - Chat messages
- `PaymentForm` - Stripe Elements
- `PropertyCard` - Property display

### Page Layouts

**Landing Page (`/`):**
- Hero with CTAs
- Stats counter (active contractors, jobs, savings)
- Feature grid
- How it works steps
- Testimonials
- Contractor CTA section

**Dashboard Pages:**
- Sidebar navigation
- Header with user menu
- Main content area
- Mobile responsive

**Job Pages:**
- Job details header
- Image gallery
- Description & requirements
- Budget & timeline
- Bid list/comparison
- Action buttons

---

## 7. DATABASE SCHEMA

### Core Tables

**users**
```sql
- id (uuid, PK)
- email
- role (homeowner|contractor|admin)
- first_name, last_name
- phone_verified
- created_at, updated_at
```

**jobs**
```sql
- id (uuid, PK)
- homeowner_id (FK → users)
- contractor_id (FK → users, nullable)
- title, description
- category, urgency
- budget_min, budget_max
- status (draft|posted|assigned|completed)
- location (JSON)
- latitude, longitude
- images (JSON array)
- created_at, updated_at
```

**bids**
```sql
- id (uuid, PK)
- job_id (FK → jobs)
- contractor_id (FK → users)
- amount, timeline
- message
- status (pending|accepted|rejected)
- created_at
```

**messages**
```sql
- id (uuid, PK)
- thread_id
- sender_id (FK → users)
- recipient_id (FK → users)
- content
- attachments (JSON)
- read_at
- created_at
```

**payments**
```sql
- id (uuid, PK)
- job_id (FK → jobs)
- amount
- status (pending|held|released|refunded)
- stripe_payment_intent_id
- created_at, updated_at
```

**contractor_profiles**
```sql
- user_id (FK → users)
- bio, specialties
- license_number
- insurance_verified
- rating, review_count
- portfolio (JSON)
```

### AI/ML Tables

**building_assessments**
```sql
- id (uuid, PK)
- job_id (FK → jobs)
- damage_types (JSON)
- severity_scores (JSON)
- confidence_level
- model_version
- created_at
```

**ml_model_metrics**
```sql
- id, model_name
- accuracy, precision, recall
- version, created_at
```

---

## 8. API ENDPOINTS OVERVIEW

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Jobs
- `GET /api/jobs` - List jobs (filtered by role)
- `POST /api/jobs` - Create job
- `GET /api/jobs/[id]` - Get job details
- `PATCH /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job

### Bidding
- `GET /api/contractor/bids` - Get contractor's bids
- `POST /api/contractor/submit-bid` - Submit bid
- `POST /api/bids/[id]/accept` - Accept bid
- `POST /api/bids/[id]/reject` - Reject bid

### Messaging
- `GET /api/messages` - Get message threads
- `POST /api/messages` - Send message
- `GET /api/messages/[threadId]` - Get thread messages
- `PATCH /api/messages/[id]/read` - Mark as read

### Payments
- `POST /api/payments/create-intent` - Create payment
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/release-escrow` - Release funds
- `GET /api/contractor/payouts` - Get payout history

### AI Services
- `POST /api/maintenance/detect` - Damage detection
- `POST /api/maintenance/assess` - Full assessment
- `POST /api/agents/pricing/suggest` - Price suggestion
- `POST /api/agents/decision` - AI decisions

---

## 9. CRITICAL DEPENDENCIES

### External Services
- **Supabase:** Database, Auth, Storage, Realtime
- **Stripe:** Payments, Subscriptions, Payouts
- **OpenAI:** GPT-4 Vision for complex assessments
- **Google Maps:** Geocoding, Distance calculations
- **Twilio:** SMS verification (optional)
- **SendGrid:** Email notifications

### Key NPM Packages
- `@supabase/supabase-js` - Database client
- `stripe` - Payment processing
- `openai` - AI integration
- `zod` - Input validation
- `framer-motion` - Animations
- `react-hook-form` - Form management
- `@tanstack/react-query` - Data fetching
- `date-fns` - Date manipulation

---

## 10. BUSINESS LOGIC & RULES

### Job Posting Rules
- Minimum budget: £50
- Maximum budget: £50,000
- Photos required for assessment
- Location required for matching
- Phone verification required

### Contractor Rules
- Must complete profile (80% minimum)
- License/insurance verification
- Background check (optional premium)
- Response time affects ranking
- Minimum 4.0 rating to bid on premium jobs

### Bidding Rules
- Contractors see jobs within 50km radius
- Maximum 10 bids per job
- Bid must be within 50% of budget
- 48-hour bid acceptance window
- Auto-reject if contractor unavailable

### Payment Rules
- Escrow hold on acceptance
- 24-hour release after completion
- 5% platform commission
- Stripe Connect fee: 2.9% + 30p
- Minimum payout: £10

### Review Rules
- Both parties can review after completion
- 30-day window for reviews
- Minimum 50 characters
- Photos encouraged
- Affects visibility algorithm

---

## 11. SECURITY MEASURES

### Authentication
- JWT with refresh tokens
- Secure HTTP-only cookies
- CSRF protection on mutations
- Rate limiting (Redis)
- MFA support (TOTP)

### Data Protection
- Input sanitization (XSS prevention)
- Parameterized queries (SQL injection prevention)
- File upload validation
- Image processing sandboxing
- PII encryption at rest

### API Security
- Rate limiting per endpoint
- API versioning
- Request signing
- IP allowlisting (admin)
- Webhook signature verification

---

## 12. PERFORMANCE OPTIMIZATIONS

### Frontend
- Code splitting by route
- Lazy loading components
- Image optimization (Next.js Image)
- Static generation where possible
- Edge caching with Cloudflare

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Redis caching layer
- Background job processing

### Mobile
- Offline support (partial)
- Image compression
- Lazy list rendering
- Memoization
- Bundle optimization

---

## 13. MONITORING & ANALYTICS

### Application Monitoring
- Sentry for error tracking
- LogRocket for session replay
- Custom logger with structured logging
- Performance monitoring (Web Vitals)
- Uptime monitoring

### Business Metrics
- User acquisition funnel
- Job completion rate
- Average bid response time
- Payment success rate
- User retention cohorts
- Revenue per user

### AI Metrics
- Model accuracy tracking
- Inference latency
- Confidence distributions
- Drift detection
- A/B test results

---

## 14. KNOWN ISSUES & TECHNICAL DEBT

### Critical Issues (From Audit)
1. **1,054 line function** in `jobs/[id]/edit/page.tsx`
2. **1,700 `any` types** throughout codebase
3. **3,189 console.log statements** (should use logger)
4. **<10% test coverage** (should be 80%)
5. **10+ duplicate .old.ts files** (~5,000 lines)

### Architecture Issues
- No service layer separation
- No repository pattern
- Direct database coupling
- Mixed concerns in routes
- Massive single functions

### Performance Issues
- Large bundle sizes
- Unoptimized images
- No query caching
- Synchronous operations
- Memory leaks (suspected)

---

## 15. DEPLOYMENT & ENVIRONMENTS

### Environments
- **Development:** localhost:3000
- **Staging:** staging.mintenance.com
- **Production:** mintenance.com

### CI/CD Pipeline
- GitHub Actions
- Vercel auto-deploy
- Environment variables in Vercel
- Database migrations via Supabase CLI
- Mobile via Expo EAS Build

### Release Process
1. Feature branch development
2. PR with required reviews
3. Automated tests run
4. Merge to main
5. Auto-deploy to staging
6. Manual promotion to production

---

## 16. FEATURE FLAGS & EXPERIMENTS

### Active Feature Flags
- `USE_NEW_PRICING_ENGINE` - AI pricing
- `ENABLE_AUTO_ACCEPT` - Auto bid acceptance
- `SHOW_AI_INSIGHTS` - AI damage assessment
- `ENABLE_VIDEO_CALLS` - Video consultations
- `USE_ENHANCED_SEARCH` - AI-powered search

### A/B Tests Running
- Onboarding flow variants
- Pricing display formats
- Job card layouts
- CTA button colors
- Email notification timing

---

## 17. CRITICAL PATHS & USER FLOWS

### Homeowner Journey
1. **Registration** → Email/Google → Phone verification
2. **Job Creation** → Details → Photos → AI Assessment → Post
3. **Bid Review** → Compare → Message → Accept
4. **Job Completion** → Approve → Pay → Review

### Contractor Journey
1. **Onboarding** → Profile → Verification → Subscription
2. **Job Discovery** → Browse → Filter → View Details
3. **Bidding** → Calculate → Submit → Follow-up
4. **Job Execution** → Schedule → Complete → Get Paid

### Payment Flow
1. **Setup** → Add card → Verify
2. **Charge** → Create intent → Confirm → Hold
3. **Release** → Job complete → Approve → Transfer
4. **Payout** → Accumulate → Threshold → Bank transfer

---

## 18. MAINTENANCE WINDOWS & UPTIME

### Scheduled Maintenance
- Database backups: Daily 3 AM UTC
- Index optimization: Weekly Sunday 2 AM
- Cache clearing: As needed
- Security patches: Monthly

### SLA Targets
- Uptime: 99.9%
- API response: <200ms p50
- Page load: <3s
- Error rate: <1%

---

## 19. SUPPORT & DOCUMENTATION

### User Support
- In-app help center
- Email: support@mintenance.com
- FAQ section
- Video tutorials
- Contractor resources

### Developer Documentation
- API documentation (Swagger)
- Component storybook
- Database ERD
- Architecture diagrams
- Runbook for incidents

---

## 20. FUTURE ROADMAP

### Planned Features
- [ ] AI-powered scheduling
- [ ] Virtual consultations
- [ ] Material cost estimation
- [ ] Warranty management
- [ ] Contractor teams/crews
- [ ] Recurring maintenance plans
- [ ] Insurance integration
- [ ] Voice assistant
- [ ] AR measurement tools
- [ ] Blockchain receipts

### Technical Improvements
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Event sourcing
- [ ] CQRS pattern
- [ ] Kubernetes deployment
- [ ] Multi-region support
- [ ] Real-time collaboration
- [ ] PWA support
- [ ] React Native Web
- [ ] Monorepo optimization

---

## AGENT CONTEXT PRESERVATION

**This Knowledge Base ensures that Claude:**
1. Understands the complete application architecture
2. Knows all features and their interconnections
3. Recognizes critical paths that must not break
4. Maintains awareness of technical debt
5. Can make informed decisions about changes
6. Preserves business logic understanding
7. Knows security requirements
8. Understands user flows
9. Recognizes performance constraints
10. Maintains consistency across sessions

**CRITICAL: Read this document at the start of EVERY session to maintain full context.**

---

**Last Updated:** 2026-01-09
**Version:** 1.0
**Status:** ACTIVE - Required reading for all development sessions