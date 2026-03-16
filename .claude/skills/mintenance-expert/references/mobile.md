# Mintenance Mobile App Reference

## Technology Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (tabs, stacks, drawer)
- **State**: React Query, Context API
- **Testing**: Jest
- **Build**: EAS (Expo Application Services)

## Directory Structure
```
apps/mobile/src/
├── screens/              # 200+ screen components
│   ├── HomeScreen.tsx    # Role-based dashboard routing
│   ├── JobDetailsScreen.tsx
│   ├── JobPhotoUploadScreen.tsx
│   ├── MessagingScreen.tsx
│   ├── PaymentScreen.tsx
│   ├── QuickJobPostScreen.tsx
│   └── ...
├── services/             # 100+ business services
│   ├── OfflineManager.ts # Offline sync facade (300 lines)
│   ├── offline/          # Offline sync modules
│   │   ├── EntityVersionTracker.ts
│   │   ├── DataMerger.ts
│   │   ├── ActionExecutor.ts
│   │   ├── ConflictManager.ts
│   │   └── index.ts
│   ├── PushNotificationService.ts
│   ├── RealtimeService.ts
│   ├── JobService.ts
│   ├── PaymentService.ts
│   └── ...
├── hooks/                # Custom React hooks
│   ├── useJobs.ts
│   ├── useAuth.ts
│   ├── useMessaging.ts
│   ├── useOfflineQuery.ts
│   ├── useBiometricAuth.ts
│   └── ...
├── navigation/           # Navigation configuration
├── contexts/             # Auth, theme, notifications
├── components/           # Reusable components
├── providers/            # App-level providers
├── config/               # Configuration (Sentry, etc.)
├── theme/                # Design tokens
└── utils/                # Helpers and logger
```

## Key Patterns

### Supabase Connection
Mobile connects to the same Supabase backend using `@supabase/supabase-js` with the anon key:
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```
RLS policies apply - the mobile client sees only data the user is authorized to access.

### Authentication
- JWT token stored securely
- Bearer token sent in `Authorization` header for API calls
- Biometric auth via `useBiometricAuth()` hook
- MFA via `MFAVerificationScreen`

### Offline Sync Architecture

**OfflineManager** (facade at `src/services/OfflineManager.ts`, 300 lines):

Delegates to specialized modules in `src/services/offline/`:

1. **EntityVersionTracker**: Tracks entity versions for conflict detection
2. **DataMerger**: Merges conflicting data with strategic algorithms
3. **ActionExecutor**: Executes queued actions when back online
4. **ConflictManager**: Manages conflicts with configurable strategies

**Key constants:**
- MAX_RETRIES: 3 (with exponential backoff)
- CHUNK_SIZE: 50 (batch processing)
- STORAGE_KEY: '@mintenance/offline_queue'

**Flow:**
1. Action performed while offline -> queued in AsyncStorage
2. Network detected -> OfflineManager processes queue
3. Conflict detection via entity versions
4. Resolution strategy applied (last-write-wins, merge, manual)
5. Sync status broadcasted to listeners

### Push Notifications

**PushNotificationService** (`src/services/PushNotificationService.ts`):
- Expo Notifications integration
- Permission request with platform handling
- Expo push token registration
- Local notification scheduling
- Notification types: job_created, job_updated, bid_received, bid_accepted, message_received, payment_received

### Real-time Subscriptions

**RealtimeService** (`src/services/RealtimeService.ts`):
- Supabase real-time channels
- Subscribes to relevant table changes
- Used for live messaging, job status updates, notifications

### Navigation Structure

```
TabNavigator
├── HomeTab -> HomeScreen (role-based: HomeownerDashboard / ContractorDashboard)
├── JobsTab -> JobsScreen -> JobDetailsScreen
├── MessagingTab -> MessagingScreen -> ChatScreen
├── ProfileTab -> ProfileScreen
└── MoreTab -> SettingsScreen, HelpScreen, etc.

Stack Navigators (modals/pushes):
├── JobPhotoUploadScreen
├── QuickJobPostScreen
├── PaymentScreen
├── ContractorProfileScreen
├── MFAVerificationScreen
└── ...
```

### Shared Packages Usage

The mobile app imports from shared packages:
```typescript
import type { Job, Bid } from '@mintenance/types';
import { logger, formatCurrency } from '@mintenance/shared';
import { Button, Card } from '@mintenance/shared-ui';  // Uses .native.tsx variants
import { sanitize } from '@mintenance/security';        // Uses MobileSanitizer
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useJobs()` | Job queries with React Query caching |
| `useAuth()` | Authentication state and methods |
| `useMessaging()` | Message fetching, sending, read tracking |
| `useBiometricAuth()` | Biometric authentication |
| `useOfflineQuery()` | Offline-aware data fetching |
| `useCachedQuery()` | Query caching with AsyncStorage |
| `useRealtime()` | Real-time Supabase subscriptions |
| `useNetworkState()` | Network connectivity detection |
| `useJobTravelTracking()` | Travel time/distance tracking |
| `useAIPricing()` | AI pricing recommendations |
| `useInfiniteScroll()` | Pagination |
| `useForm()` | Form state management |

## API Communication

Mobile calls the web API via HTTP with Bearer token auth:
```typescript
const response = await fetch(`${API_URL}/api/jobs`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

This bypasses CSRF (Bearer tokens skip CSRF validation in `withApiHandler`).

## Build & Deployment

- **Development**: `npx expo start`
- **Build**: EAS Build (`eas build --platform ios/android`)
- **Submit**: EAS Submit to App Store / Play Store
- **Config**: `app.json` / `app.config.js` for Expo configuration
- **CI/CD**: `.github/workflows/mobile-build.yml` and `mobile-tests.yml`

## Key Screens (`apps/mobile/src/screens/`)

### Core Screens
| Screen | Purpose |
|--------|---------|
| `HomeScreen.tsx` | Role-based dashboard (homeowner/contractor) |
| `LoginScreen.tsx` | Authentication |
| `JobsScreen.tsx` | Job listing with filters |
| `JobPostingScreen.tsx` | Create new job |
| `BidSubmissionScreen.tsx` | Submit bid on job |
| `BidReviewScreen.tsx` | Review bids received |
| `CalendarScreen.tsx` | Calendar view |
| `EditProfileScreen.tsx` | Profile editing |
| `DisputeScreen.tsx` | Dispute management |
| `ForgotPasswordScreen.tsx` | Password reset |
| `HelpCenterScreen.tsx` | Help and support |
| `LandingScreen.tsx` | App landing/onboarding |

### Screen Directories (complex multi-file screens)
| Directory | Purpose |
|-----------|---------|
| `home/` | Enhanced home dashboard |
| `auth/` | Auth flow screens |
| `job-details/` | Job detail views |
| `job-form/` | Job creation form |
| `job-posting/` | Job posting flow |
| `contractor/` | Contractor-specific screens |
| `contractor-profile/` | Contractor profile views |
| `contractor-verification/` | Verification flow |
| `assessment/` | Building assessment |
| `ai/` | AI feature screens |
| `booking/` | Booking/scheduling |
| `financials/` | Financial screens |
| `explore-map/` | Map-based exploration |
| `invoice-detail/` | Invoice views |
| `create-invoice/` | Invoice creation |
| `create-quote/` | Quote builder |
| `client-detail/` | Client management |
| `add-client/` | Add new client |

## Key Services (`apps/mobile/src/services/`)

### Core Business Services
| Service | Purpose |
|---------|---------|
| `JobService.ts` | Job CRUD and queries |
| `JobSearchService.ts` | Job search and filtering |
| `BidManagementService.ts` | Bid operations |
| `BidService.ts` | Bid queries |
| `PaymentService.ts` | Payment processing |
| `EscrowService.ts` | Escrow status and operations |
| `ContractorService.ts` | Contractor operations |
| `UserService.ts` | User profile operations |
| `AuthService.ts` | Authentication logic |
| `MessagingService.ts` | Messaging operations |
| `MeetingService.ts` | Meeting scheduling |

### Sync & Network Services
| Service | Purpose |
|---------|---------|
| `OfflineManager.ts` | Offline sync facade (300 lines) |
| `offline/` | Offline sync modules (5 files) |
| `SyncManager.ts` | Data synchronization |
| `RealtimeService.ts` | Supabase real-time channels |
| `CacheService.ts` | Data caching |
| `LocalDatabase.ts` | Local storage management |
| `local-db/` | Local database modules |

### Communication Services
| Service | Purpose |
|---------|---------|
| `PushNotificationService.ts` | Push notification management |
| `NotificationService.ts` | In-app notifications |
| `VideoCallService.ts` | Video calling |
| `VideoService.ts` | Video processing |

### AI & Analysis Services
| Service | Purpose |
|---------|---------|
| `AIAnalysisService.ts` | AI damage analysis |
| `AIPricingEngine.ts` | AI pricing recommendations |
| `AISearchService.ts` | AI-powered search |
| `RealAIAnalysisService.ts` | Real AI analysis integration |
| `UnifiedAIServiceMobile.ts` | Mobile AI service wrapper |

### Additional Services
| Service | Purpose |
|---------|---------|
| `PhotoUploadService.ts` | Photo upload with compression |
| `ImageCompressionService.ts` | Image optimization |
| `LocationService.ts` | GPS/location management |
| `BiometricService.ts` | Biometric authentication |
| `ServiceAreasService.ts` | Service area management |
| `QuoteBuilderService.ts` | Quote creation |
| `SustainabilityEngine.ts` | Sustainability scoring |
| `ModerationService.ts` | Content moderation |
| `NeighborhoodService.ts` | Neighborhood info |

## Extended Hooks List (`apps/mobile/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useJobs()` | Job queries with React Query caching |
| `useAuth()` | Authentication state and methods |
| `useMessaging()` | Message fetching, sending, read tracking |
| `useBiometricAuth()` | Biometric authentication |
| `useOfflineQuery()` | Offline-aware data fetching |
| `useCachedQuery()` | Query caching with AsyncStorage |
| `useRealtime()` | Real-time Supabase subscriptions |
| `useNetworkState()` | Network connectivity detection |
| `useJobTravelTracking()` | Travel time/distance tracking |
| `useAIPricing()` | AI pricing recommendations |
| `useInfiniteScroll()` | Pagination |
| `useForm()` | Form state management |
| `useDebounce()` | Debounced values |
| `useAdvancedSearch()` | Advanced search with filters |
| `useAccessibility()` | Accessibility features |
| `useAccessibleText()` | Accessible text scaling |
| `useI18n()` | Internationalization |
| `useReducedMotion()` | Motion preferences |
| `useResponsive()` | Responsive layout |
| `useFinanceDashboard()` | Financial data |
| `useBusinessSuite()` | Business suite features |
| `useServiceAreas()` | Service area management |
| `useSustainability()` | Sustainability metrics |
| `useNeighborhood()` | Neighborhood data |
| `usePerformance()` | Performance monitoring |
| `useAppInitialization()` | App startup logic |
| `useUnsavedChanges()` | Unsaved changes warning |

## Contexts & Providers

### Contexts (`apps/mobile/src/contexts/`)
| Context | Purpose |
|---------|---------|
| `AuthContext.tsx` | Auth state (user, token, login/logout) |
| `AppStateContext.tsx` | App state (foreground/background) |
| `auth-session-manager.ts` | Session lifecycle management |
| `auth-actions.ts` | Auth action creators |

### Providers (`apps/mobile/src/providers/`)
| Provider | Purpose |
|----------|---------|
| `QueryProvider.tsx` | React Query provider with defaults |
| `StripeProvider.tsx` | Stripe SDK provider |

## Testing (Jest)

```bash
cd apps/mobile && npx jest
```

- 597 test files, 93.8% pass rate (9,743/10,393 tests)
- Uses `__mocks__/` directories for native module mocks
- `test-utils/` for shared test helpers

### Mobile Test Patterns
```typescript
// Mock native modules
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, ... }));
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-notifications', () => ({ ... }));
jest.mock('expo-location', () => ({ ... }));

// Test screens with navigation context
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
render(<Screen navigation={mockNavigation} route={{ params: { jobId: '123' } }} />);
```
