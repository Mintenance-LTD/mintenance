# Apps Folder - Quick Reference Guide

**Quick navigation guide for the Mintenance monorepo**

---

## 📁 Folder Structure Overview

```
apps/
├── web/                    # Next.js web application
│   ├── app/               # Pages and API routes (App Router)
│   ├── components/        # React components
│   ├── lib/              # Core library code
│   └── hooks/            # Custom React hooks
│
└── mobile/                # React Native mobile app
    ├── src/
    │   ├── screens/      # Screen components
    │   ├── services/     # Business logic
    │   ├── components/   # Reusable components
    │   ├── navigation/   # Navigation setup
    │   └── hooks/        # Custom hooks

packages/
├── auth/                  # Authentication utilities
├── types/                # TypeScript types
├── shared/               # Common utilities
└── shared-ui/            # Shared UI components
```

---

## 🌐 Web App - Key Files

### Core Configuration
```
apps/web/
├── next.config.js              # Next.js configuration
├── middleware.ts               # Authentication middleware
├── tailwind.config.js          # Tailwind CSS config
└── package.json               # Dependencies
```

### Authentication & Authorization
```
apps/web/lib/
├── auth.ts                    # Auth utilities (JWT, cookies)
├── database.ts               # Database manager
└── supabase.ts              # Supabase client
```

### Main Layout & Navigation
```
apps/web/
├── app/layout.tsx            # Root layout
├── components/layouts/
│   ├── Header.tsx           # Top navigation bar
│   └── ThreePanelLayout.tsx # 3-column layout
└── components/navigation/
    └── Sidebar.tsx          # Side navigation
```

### API Routes (Most Important)

**Authentication**:
```
apps/web/app/api/auth/
├── login/route.ts           # POST /api/auth/login
├── register/route.ts        # POST /api/auth/register
├── logout/route.ts          # POST /api/auth/logout
└── refresh/route.ts         # POST /api/auth/refresh
```

**Jobs**:
```
apps/web/app/api/jobs/
├── route.ts                 # GET/POST /api/jobs
└── [id]/route.ts           # GET/PATCH /api/jobs/:id
```

**Contractor**:
```
apps/web/app/api/contractor/
├── profile-data/route.ts   # GET contractor profile
├── update-profile/route.ts # POST update profile
├── manage-skills/route.ts  # POST manage skills
└── upload-photos/route.ts  # POST upload photos
```

**Payments**:
```
apps/web/app/api/payments/
├── create-intent/route.ts     # POST create payment intent
├── confirm-intent/route.ts    # POST confirm payment
├── checkout-session/route.ts  # POST Stripe checkout
└── release-escrow/route.ts    # POST release funds
```

### Key Pages

**Public Pages**:
```
apps/web/app/
├── page.tsx                # Landing page (HOME)
├── login/page.tsx         # Login page
├── register/page.tsx      # Registration
└── discover/page.tsx      # Contractor discovery
```

**Contractor Dashboard**:
```
apps/web/app/contractor/
├── profile/page.tsx       # Contractor profile
├── quotes/page.tsx        # Quote builder
├── finance/page.tsx       # Financial dashboard
├── crm/page.tsx          # CRM features
├── invoices/page.tsx     # Invoice management
└── gallery/page.tsx      # Photo gallery
```

**Homeowner Dashboard**:
```
apps/web/app/
├── dashboard/page.tsx     # Main dashboard
├── jobs/page.tsx         # Job listings
├── messages/page.tsx     # Messaging
└── payments/page.tsx     # Payment management
```

### Services (Business Logic)

**Core Services**:
```
apps/web/lib/services/
├── ContractorService.ts      # Contractor operations
├── JobService.ts            # Job management
├── PaymentService.ts        # Payment processing
├── MessagingService.ts      # Real-time messaging
└── VideoCallService.ts      # Video calls
```

**Specialized Services**:
```
apps/web/lib/services/
├── matching/                # Contractor matching
│   ├── ScoringService.ts
│   ├── PreferencesService.ts
│   └── InsightsService.ts
│
├── payment/                # Payment processing
│   ├── PaymentInitialization.ts
│   ├── PaymentConfirmation.ts
│   ├── PaymentValidation.ts
│   └── EscrowService.ts
│
└── project-timeline/       # Project management
    ├── TimelineService.ts
    ├── MilestoneService.ts
    └── TemplateService.ts
```

---

## 📱 Mobile App - Key Files

### Core Configuration
```
apps/mobile/
├── App.tsx                  # Root app component
├── app.config.js           # Expo configuration
├── babel.config.js         # Babel configuration
└── package.json           # Dependencies
```

### Navigation
```
apps/mobile/src/navigation/
├── RootNavigator.tsx        # Root navigator
├── AppNavigator.tsx         # Main app navigator
└── navigators/
    ├── AuthNavigator.tsx    # Auth screens
    ├── HomeownerNavigator.tsx # Homeowner screens
    └── ContractorNavigator.tsx # Contractor screens
```

### Key Screens

**Authentication**:
```
apps/mobile/src/screens/
├── LandingScreen.tsx        # Landing page
├── LoginScreen.tsx         # Login
└── RegisterScreen.tsx      # Registration
```

**Homeowner Screens**:
```
apps/mobile/src/screens/
├── home/
│   └── HomeScreen.tsx       # Home dashboard
├── enhanced-home/
│   └── EnhancedHomeScreen.tsx # Enhanced discovery
├── explore-map/
│   └── ExploreMapScreen.tsx   # Map exploration
├── job-details/
│   └── JobDetailsScreen.tsx   # Job details
└── booking/
    └── BookingStatusScreen.tsx # Booking management
```

**Contractor Screens**:
```
apps/mobile/src/screens/
├── contractor-profile/
│   └── ContractorProfileScreen.tsx # Profile management
├── create-quote/
│   └── CreateQuoteScreen.tsx      # Quote creation
├── CRMDashboardScreen.tsx        # CRM dashboard
├── FinanceDashboardScreen.tsx    # Finance dashboard
└── InvoiceManagementScreen.tsx   # Invoice management
```

### Services (Business Logic)

**Core Services**:
```
apps/mobile/src/services/
├── AuthService.ts           # Authentication
├── JobService.ts           # Job management (facade)
├── JobCRUDService.ts       # Job CRUD operations
├── BidManagementService.ts # Bid management
├── ContractorService.ts    # Contractor operations
├── MessagingService.ts     # Real-time messaging
├── PaymentService.ts       # Payment processing
└── VideoCallService.ts     # Video calls
```

**Advanced Services**:
```
apps/mobile/src/services/
├── ml-engine/              # Machine learning
│   ├── matching/          # Contractor matching ML
│   ├── pricing/           # AI pricing
│   └── analytics/         # Analytics ML
│
├── contractor-business/    # Business suite
│   ├── BusinessAnalyticsService.ts
│   ├── ClientManagementService.ts
│   ├── FinancialManagementService.ts
│   └── ScheduleManagementService.ts
│
└── pricing/               # Pricing calculations
    ├── ComplexityAnalysisService.ts
    ├── MarketDataService.ts
    └── PricingCalculationService.ts
```

### Contexts & Hooks
```
apps/mobile/src/
├── contexts/
│   ├── AuthContext.tsx      # Authentication state
│   └── AppStateContext.tsx  # App state
│
└── hooks/
    ├── useAuth.ts          # Authentication hook
    ├── useJobs.ts         # Jobs data hook
    ├── useMessaging.ts    # Messaging hook
    └── useOfflineQuery.ts # Offline data
```

---

## 📦 Shared Packages

### @mintenance/auth
```
packages/auth/src/
├── index.ts                # Main exports
├── validation.ts           # Email/password validation
├── jwt.ts                 # JWT utilities
├── password-validator.ts  # Password validation
├── password-history.ts    # Password history
└── account-lockout.ts     # Account lockout
```

**Key Functions**:
- `validateEmail()` - Validate email format
- `validatePassword()` - Validate password strength
- `hashPassword()` - Hash password with bcrypt
- `generateJWT()` - Create JWT token
- `verifyJWT()` - Verify JWT token
- `generateTokenPair()` - Create access + refresh tokens

### @mintenance/types
```
packages/types/src/
├── index.ts              # Main type exports
└── contracts.ts          # API contracts
```

**Key Types**:
- `User` - User entity
- `Job` - Job posting
- `Bid` - Contractor bid
- `ContractorProfile` - Contractor details
- `Message` - Chat message
- `PaymentIntent` - Payment details
- `ProjectTimeline` - Project timeline
- `VideoCall` - Video call details

### @mintenance/shared
```
packages/shared/src/
├── index.ts              # Main exports
├── logger.ts            # Logging utility
├── formatters.ts        # Data formatters
├── utils.ts            # Utility functions
└── helpers.ts          # Helper functions
```

**Key Functions**:
- `logger.info()` - Log info message
- `logger.error()` - Log error
- `formatDate()` - Format date
- `formatCurrency()` - Format currency
- `debounce()` - Debounce function
- `throttle()` - Throttle function

---

## 🎨 Design System

### Web Design System
```typescript
// apps/web/lib/design-system.ts
import { designSystem } from '@/lib/design-system';

// Colors
designSystem.colors.primary[500]    // Primary blue
designSystem.colors.success[500]    // Success green
designSystem.colors.error[500]      // Error red

// Typography
designSystem.typography.fontSize.base  // 16px
designSystem.typography.fontWeight.bold // 700

// Spacing
designSystem.spacing[4]  // 1rem (16px)
designSystem.spacing[8]  // 2rem (32px)

// Components
designSystem.components.button.primary
designSystem.components.card.base
designSystem.components.badge.success
```

### Mobile Theme System
```typescript
// apps/mobile/src/design-system/theme.tsx
import { useTheme } from './theme';

const { theme } = useTheme();

// Colors
theme.colors.primary[500]
theme.colors.background.primary
theme.colors.text.primary

// Theme mode
theme.isDark  // boolean
theme.mode    // 'light' | 'dark'
```

---

## 🔒 Common Patterns

### API Route Pattern (Web)
```typescript
// apps/web/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromCookies();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Business logic here
  return NextResponse.json({ data: result });
}
```

### Service Pattern (Both)
```typescript
// Service with static methods
export class FeatureService {
  static async operation(params): Promise<Result> {
    try {
      const result = await database.query(/* ... */);
      return this.mapResult(result);
    } catch (error) {
      logger.error('Operation failed', error);
      throw new ServiceError('Operation failed');
    }
  }
  
  private static mapResult(data): Result {
    // Transform database data to domain model
  }
}
```

### Screen Pattern (Mobile)
```typescript
// Screen with ViewModel
const FeatureScreen = () => {
  const viewModel = useFeatureViewModel();
  
  if (viewModel.loading) return <LoadingSpinner />;
  if (viewModel.error) return <ErrorView error={viewModel.error} />;
  
  return (
    <View>
      {/* UI here */}
    </View>
  );
};

// ViewModel
export const useFeatureViewModel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const result = await FeatureService.fetchData();
      setData(result);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, loadData };
};
```

### Error Handling Pattern (Mobile)
```typescript
const context = {
  service: 'ServiceName',
  method: 'methodName',
  params: { /* params */ }
};

await ServiceErrorHandler.executeOperation(async () => {
  // Validation
  ServiceErrorHandler.validateRequired(email, 'Email', context);
  ServiceErrorHandler.validateEmail(email, context);
  
  // Operation
  const result = await database.query(/* ... */);
  
  if (!result) {
    throw new Error('Operation failed');
  }
  
  return result;
}, context);
```

---

## 🔍 Finding Things Quickly

### "Where do I find...?"

**Authentication logic?**
- Web: `apps/web/lib/auth.ts` + `apps/web/app/api/auth/*`
- Mobile: `apps/mobile/src/services/AuthService.ts`
- Shared: `packages/auth/src/`

**Database queries?**
- Web: `apps/web/lib/services/*Service.ts`
- Mobile: `apps/mobile/src/services/*Service.ts`

**Type definitions?**
- `packages/types/src/index.ts`

**UI components?**
- Web: `apps/web/components/ui/*`
- Mobile: `apps/mobile/src/components/*`

**Navigation setup?**
- Web: `apps/web/components/navigation/Sidebar.tsx`
- Mobile: `apps/mobile/src/navigation/AppNavigator.tsx`

**Environment config?**
- Web: `.env.local` + `apps/web/lib/config.ts`
- Mobile: `.env` + `apps/mobile/src/config/environment.ts`

**Design tokens?**
- Web: `apps/web/lib/design-system.ts`
- Mobile: `apps/mobile/src/design-system/tokens.ts`

**API endpoints?**
- `apps/web/app/api/**/route.ts`

**Business logic?**
- Web: `apps/web/lib/services/`
- Mobile: `apps/mobile/src/services/`

---

## 🚀 Common Commands

### Web App
```bash
cd apps/web

# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run tests
npm run lint            # Run linter
npm run type-check      # TypeScript check
```

### Mobile App
```bash
cd apps/mobile

# Development
npm run start           # Start Expo dev server
npm run dev            # Start with dev client
npm run android        # Run on Android
npm run ios            # Run on iOS

# Build
npm run build          # Build with EAS
npm run build:android  # Build for Android
npm run build:ios      # Build for iOS

# Testing
npm run test           # Run tests
npm run lint           # Run linter
```

### Packages
```bash
# Auth package
cd packages/auth
npm run build          # Build package
npm run test          # Run tests

# Types package
cd packages/types
npm run build          # Build package

# Shared package
cd packages/shared
npm run build          # Build package
npm run test          # Run tests
```

---

## 📚 Key Documentation Files

```
├── APPS_FOLDER_ARCHITECTURE_REVIEW.md  # Detailed architecture review
├── APPS_FOLDER_REVIEW_SUMMARY.md      # Executive summary
├── APPS_FOLDER_QUICK_REFERENCE.md     # This file
├── API_DOCUMENTATION.md               # API documentation
├── DEPLOYMENT_INSTRUCTIONS.md         # Deployment guide
├── START_HERE.md                     # Getting started guide
└── README.md                         # Project README
```

---

## 🐛 Debugging Tips

### Web App Debugging

**Check authentication:**
```typescript
// In any server component/API route
import { getCurrentUserFromCookies } from '@/lib/auth';

const user = await getCurrentUserFromCookies();
console.log('Current user:', user);
```

**Check environment variables:**
```bash
# In apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
JWT_SECRET=your_secret
```

**View logs:**
```bash
# Terminal where dev server is running
# Logs appear automatically
```

### Mobile App Debugging

**Check authentication:**
```typescript
import { AuthContext } from './src/contexts/AuthContext';

const { user } = useContext(AuthContext);
console.log('Current user:', user);
```

**View logs:**
```bash
# In separate terminal
npx react-native log-android  # Android logs
npx react-native log-ios      # iOS logs
```

**Debug network:**
```bash
# Enable network debugging in Expo
# Shake device > Debug Remote JS
```

---

## 📝 Quick Cheat Sheet

### Most Important Files

| Purpose | File Path |
|---------|-----------|
| Web Auth | `apps/web/lib/auth.ts` |
| Web API Routes | `apps/web/app/api/` |
| Web Services | `apps/web/lib/services/` |
| Mobile Auth | `apps/mobile/src/services/AuthService.ts` |
| Mobile Services | `apps/mobile/src/services/` |
| Mobile Screens | `apps/mobile/src/screens/` |
| Shared Types | `packages/types/src/index.ts` |
| Shared Auth | `packages/auth/src/index.ts` |

### File Size Limits

| Status | Lines | Action |
|--------|-------|--------|
| ✅ OK | < 400 | Continue |
| ⚠️ Warning | 400-500 | Consider refactoring |
| 🔴 Violation | > 500 | MUST refactor |

### Current Violations

| File | Lines | Status |
|------|-------|--------|
| `DiscoverClient.tsx` | 831 | 🚨 CRITICAL |
| `page.tsx` (landing) | 618 | 🔴 HIGH |
| `AuthService.ts` | 384 | ⚠️ APPROACHING |

---

## 🎓 Learning Resources

**To understand the web app:**
1. Read `apps/web/app/layout.tsx` - Root layout
2. Read `apps/web/middleware.ts` - Authentication flow
3. Read `apps/web/lib/auth.ts` - Auth utilities
4. Explore `apps/web/app/api/auth/` - Auth API routes
5. Review `apps/web/lib/design-system.ts` - Design system

**To understand the mobile app:**
1. Read `apps/mobile/App.tsx` - App entry point
2. Read `apps/mobile/src/navigation/AppNavigator.tsx` - Navigation
3. Read `apps/mobile/src/contexts/AuthContext.tsx` - Auth context
4. Explore `apps/mobile/src/services/AuthService.ts` - Auth service
5. Review `apps/mobile/src/design-system/theme.tsx` - Theme system

**To understand shared code:**
1. Read `packages/types/src/index.ts` - All types
2. Read `packages/auth/src/index.ts` - Auth utilities
3. Read `packages/shared/src/index.ts` - Common utilities

---

**Last Updated**: October 11, 2025  
**Maintained By**: Development Team

