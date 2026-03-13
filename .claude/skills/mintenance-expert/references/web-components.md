# Mintenance Web App Routes & Components Reference

## Page Routes Overview

### Public Routes
| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/about` | About page |
| `/blog` | Blog listing |
| `/contact` | Contact form |
| `/pricing` | Pricing plans |
| `/how-it-works` | How it works guide |
| `/find-contractors` | Contractor search |
| `/for-contractors` | Contractor signup CTA |
| `/privacy`, `/terms` | Legal pages |
| `/faq`, `/help/[category]/[slug]` | Help center |

### Auth Routes
| Route | Purpose |
|-------|---------|
| `/login` | Main login page |
| `/register` | User registration |
| `/auth/login` | Legacy login redirect |
| `/auth/signup` | Legacy signup redirect |
| `/auth/forgot-password` | Password reset |
| `/auth/mfa-verify` | MFA verification |
| `/auth/callback` | OAuth callback handler |
| `/reset-password` | Password reset form |
| `/verify-phone` | Phone verification |
| `/verification` | Email/ID verification |

### Homeowner Routes
| Route | Purpose |
|-------|---------|
| `/dashboard` | Homeowner dashboard (KPIs, active jobs, pending bids) |
| `/jobs` | Job listing (tabs: all, posted, active, completed, draft) |
| `/jobs/create` | Multi-step job creation wizard |
| `/jobs/quick-create` | Quick job creation form |
| `/jobs/[id]` | Job detail (bids, contracts, photos, escrow) |
| `/jobs/[id]/edit` | Edit job |
| `/jobs/[id]/payment` | Payment page |
| `/jobs/[id]/review` | Leave review |
| `/jobs/[id]/sign-off` | Sign-off page |
| `/jobs/tracking` | Job tracking/status |
| `/properties` | Properties listing |
| `/properties/add` | Add property |
| `/properties/[id]` | Property detail |
| `/properties/[id]/edit` | Edit property |
| `/messages` | Messaging inbox |
| `/messages/[jobId]` | Chat thread |
| `/notifications` | Notification center |
| `/payments` | Payment history |
| `/profile` | User profile |
| `/settings` | Account settings |
| `/settings/payment-methods` | Saved payment methods |
| `/settings/security/mfa` | MFA setup |

### Contractor Routes (40+ pages)
| Route | Purpose |
|-------|---------|
| `/contractor/bid` | Main bids overview |
| `/contractor/bid/[jobId]` | Bid on specific job |
| `/contractor/discover` | Browse available jobs |
| `/contractor/jobs-near-you` | Jobs near location |
| `/contractor/jobs` | Assigned jobs list |
| `/contractor/jobs/[id]` | Job detail (6-stage workflow) |
| `/contractor/dashboard-enhanced` | Enhanced dashboard |
| `/contractor/calendar` | Calendar view |
| `/contractor/messages` | Messaging |
| `/contractor/reviews` | Reviews received |
| `/contractor/profile` | Profile management |
| `/contractor/gallery` | Portfolio gallery |
| `/contractor/certifications` | Certifications/training |
| `/contractor/documents` | Document management |
| `/contractor/invoices` | Invoice management |
| `/contractor/expenses` | Expense tracking |
| `/contractor/finance` | Financial overview |
| `/contractor/escrow/status` | Escrow status |
| `/contractor/quotes/create` | Create quote |
| `/contractor/quotes/[id]` | Quote detail |
| `/contractor/crm` | CRM system |
| `/contractor/customers` | Customer list |
| `/contractor/insurance` | Insurance docs |
| `/contractor/service-areas` | Service area setup |
| `/contractor/marketing` | Marketing tools |
| `/contractor/time-tracking` | Time tracking |
| `/contractor/team` | Team management |
| `/contractor/settings` | Account settings |
| `/contractor/subscription` | Subscription plans |
| `/contractor/payouts` | Payout management |
| `/contractor/[id]` | Public contractor profile |

### Admin Routes (20+ pages)
| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Admin dashboard |
| `/admin/users` | User management (bulk verify, edit, export) |
| `/admin/contractors/payment-setup` | Stripe Connect setup |
| `/admin/payments/fees` | Fee management |
| `/admin/payments/reconciliation` | Payment reconciliation |
| `/admin/escrow/reviews` | Escrow dispute review |
| `/admin/revenue` | Revenue analytics |
| `/admin/security` | Security monitoring |
| `/admin/audit-logs` | Audit log viewer |
| `/admin/settings` | Admin settings |
| `/admin/communications` | Messaging management |
| `/admin/building-assessments` | AI assessment data |
| `/admin/ai-monitoring` | AI model monitoring |
| `/admin/data-annotation` | Data annotation tools |

## Component Directory (`apps/web/components/`)

| Directory | Purpose | Key Components |
|-----------|---------|----------------|
| `auth/` | Authentication UI | Login forms, MFA setup, password reset, social auth |
| `payments/` | Payment processing | `PaymentForm`, `EmbeddedCheckout`, `FeeCalculator` |
| `jobs/` | Job management | `JobDetailsDialog`, `JobStatusBadge`, `JobTimeline`, `CategoryIcon` |
| `contractor/` | Contractor UI | Dashboard, bid management, portfolio, ratings |
| `dashboard/` | Dashboard widgets | KPI cards, active jobs, pending bids, activity feed |
| `messaging/` | Real-time messaging | `MessageBubble`, `MessageInput`, `ConversationCard` |
| `escrow/` | Escrow management | Status display, hold/release UI, fee calculation |
| `admin/` | Admin tools | User tables, analytics, audit logs, reconciliation |
| `building-surveyor/` | AI assessment | Results display, damage classification, corrections |
| `notifications/` | Notifications | Notification center, toast (react-hot-toast), preferences |
| `onboarding/` | Onboarding flows | `OnboardingWrapper`, step-by-step tutorials |
| `ui/` | Design system | Buttons, Cards, Inputs, Badges, Dialogs, Tables, Charts |
| `maps/` | Location & mapping | Google Maps integration, location picker |
| `navigation/` | Navigation | Header, sidebar, mobile menu, breadcrumbs |
| `layouts/` | Page layouts | `HomeownerPageWrapper`, `ContractorPageWrapper` |
| `search/` | Search UI | Search bar, results, filter suggestions |
| `profile/` | Profile UI | Profile editor, display, avatar picker |
| `Calendar/` | Calendar UI | Calendar component, event display, scheduling |
| `verification/` | Verification | ID, email, phone verification, document uploads |
| `video-call/` | Video conferencing | Video call interface, scheduler, history |
| `charts/` | Data visualization | Various chart types for dashboards |
| `skeletons/` | Loading states | Skeleton loaders for different components |
| `session/` | Session management | Status indicator, timeout warning |
| `settings/` | Settings UI | Account, preferences, privacy |
| `agents/` | AI agents | Agent UI components |
| `analytics/` | Analytics display | Dashboard, metrics visualization |
| `cards/` | Card components | Various card layouts |
| `modals/` | Modal dialogs | Confirmation, form modals |

## Key Job Detail Components

### Homeowner View (`/jobs/[id]`)

**Server component** that fetches job, bids, contractor, property data in parallel batch queries.

| Component | Purpose |
|-----------|---------|
| `JobDetailsProfessional` | Main job info: title, description, category, location, budget |
| `BidCard` / `BidComparisonTable2025` | Bid viewing, comparison, acceptance |
| `ContractManagement` | Contract status, signing UI, terms display |
| `HomeownerPhotoReview` | Before/after photo review with `BeforeAfterSlider` |
| `BeforeAfterSlider` | Draggable overlay slider comparing photos |
| `JobLifecycleTimeline` | Visual workflow progress indicator |
| `JobLocationMap` | Map showing job location |
| `PhotoGallery` | Photo carousel display |
| `JobViewTracker` | Analytics tracking |

### Contractor View (`/contractor/jobs/[id]`)

**Stage-based UI** showing different actions per job status:
```
contract_preparing → contract_pending → awaiting_payment → ready_to_start → in_progress → completed
```

| Component | Purpose |
|-----------|---------|
| `JobPhotoUpload` | Before/after photo upload with geolocation capture |
| `LocationSharing` | Real-time location sharing to homeowner |
| `OnMyWayButton` | "On My Way" notification to homeowner |
| `PrepareContractButton` | Draft contract creation |
| `ContractManagement` | Contract signing from contractor side |
| `BuildingAssessmentDisplay` | AI assessment results |
| `JobScheduling` | Appointment scheduling |

## Payment Components

### PaymentForm (`components/payments/PaymentForm.tsx`)
```typescript
// Props:
interface PaymentFormProps {
  jobId: string;
  contractorId: string;
  jobTitle: string;
  defaultAmount?: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}
// Uses @stripe/react-stripe-js Stripe Elements
// Creates PaymentIntent via POST /api/jobs/[id]/payment-intent
// Confirms payment with redirect: 'if_required'
```

### EmbeddedCheckout (`components/payments/EmbeddedCheckout.tsx`)
```typescript
// Stripe Embedded Checkout for full checkout flow
// Fetches client secret from /api/payments/embedded-checkout
```

## Data Flow Patterns

### Server Components (async/await)
```typescript
// /jobs/[id]/page.tsx pattern:
export default async function JobPage({ params }) {
  const user = await getCurrentUserFromCookies();
  const { data: job } = await serverSupabase.from('jobs').select('*').eq('id', id).single();
  // Batch queries to avoid N+1
  const [bids, photos, contractor] = await Promise.all([...]);
  return <JobDetailsProfessional job={job} bids={bids} />;
}
```

### Client Components ('use client')
```typescript
// Uses React Query for caching
const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
// CSRF for mutations
const csrf = useCSRF();
const response = await fetch('/api/jobs', {
  method: 'POST',
  headers: { 'x-csrf-token': csrf },
  body: JSON.stringify(formData),
});
```

### Dashboard Batch Query Pattern (N+1 Prevention)
```typescript
// Fetch all data in parallel batches
const [jobs, bids, contractors, photos] = await Promise.all([...]);
// Create lookup maps for O(1) access
const bidsByJob = new Map(bids.map(b => [b.job_id, b]));
const photosByJob = new Map(photos.map(p => [p.job_id, p]));
// Map data in memory, no additional queries
const enrichedJobs = jobs.map(j => ({
  ...j,
  bids: bidsByJob.get(j.id) || [],
  photos: photosByJob.get(j.id) || [],
}));
```

## Form Submission Pattern
1. Client component with `useState` for form data
2. CSRF token via `useCSRF()` hook
3. Zod validation on client + server
4. `POST`/`PUT` to API route
5. Error toast (`react-hot-toast`) or success redirect
6. Optimistic UI with React Query `onMutate`/`onError`/`onSettled`

## Key Custom Hooks (Web)

| Hook | Purpose |
|------|---------|
| `useCurrentUser()` | Get authenticated user |
| `useCSRF()` | CSRF token management |
| `useImageUpload()` | Image upload handling |
| `useBuildingAssessment()` | AI building assessment |
| `useReducedMotion()` | Accessibility motion preference |

## Service Layer (`apps/web/lib/services/`)

| Directory/File | Purpose |
|---------------|---------|
| `payment/` | 12 payment service files (Escrow, Fee, Payout, etc.) |
| `escrow/` | 5 escrow service files (AutoRelease, Status, Approval) |
| `jobs/` | Job CRUD, search, analysis |
| `ai/` | AI service integration |
| `agents/` | AI agent orchestration |
| `building-surveyor/` | Building assessment services |
| `contractor/` | Contractor-specific services |
| `admin/` | Admin services |
| `location/` | Location/geocoding services |
| `cache/` | Caching services |
| `disputes/` | Dispute resolution services |
| `matching/` | Job-contractor matching |
| `maintenance/` | Maintenance detection services |
| `JobService.ts` | Core job operations |
| `ContractorService.ts` | Core contractor operations |
| `AIMatchingService.ts` | AI-powered matching |
| `AdvancedSearchService.ts` | Advanced search |
| `ImageAnalysisService.ts` | Image analysis |
