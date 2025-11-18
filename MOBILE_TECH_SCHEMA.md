# Mobile App Technical Schema / Tech Pack

**Date:** January 2025  
**Version:** 1.2.4  
**Status:** ✅ **PRODUCTION READY**

---

## 📋 Table of Contents

1. [Framework & Runtime](#framework--runtime)
2. [Dependencies](#dependencies)
3. [Project Structure](#project-structure)
4. [Configuration](#configuration)
5. [Type System](#type-system)
6. [Architecture Patterns](#architecture-patterns)
7. [Build & Deployment](#build--deployment)
8. [Performance Budgets](#performance-budgets)
9. [Testing Setup](#testing-setup)
10. [Environment Variables](#environment-variables)

---

## 🚀 Framework & Runtime

### Core Framework
- **Expo SDK:** `~54.0.23` (Latest stable)
- **React:** `19.1.0` (Latest)
- **React Native:** `0.81.5` (Latest)
- **TypeScript:** `~5.9.3` (Strict mode enabled)
- **Node.js:** `20.x` (Required)
- **npm:** `>=9.0.0` (Required)

### Runtime Features
- ✅ **Hermes Engine:** Enabled (Android)
- ✅ **Fast Resolver:** Enabled (Production)
- ✅ **Code Optimization:** Enabled (Production)
- ✅ **Over-the-Air Updates:** Configured (Expo Updates)

---

## 📦 Dependencies

### Core Dependencies

#### Navigation
- `@react-navigation/native`: `^7.1.19` - Main navigation library
- `@react-navigation/stack`: `^7.6.3` - Stack navigator
- `@react-navigation/bottom-tabs`: `^7.5.0` - Tab navigator
- `@react-navigation/drawer`: `^7.7.2` - Drawer navigator

#### State Management
- `@tanstack/react-query`: `^5.90.5` - Server state management
- `@react-native-async-storage/async-storage`: `2.2.0` - Local storage

#### Database & Backend
- `@supabase/supabase-js`: `^2.76.1` - Supabase client
- Local SQLite (via Expo SQLite) - Offline-first database

#### UI & Styling
- `@expo/vector-icons`: `^15.0.3` - Icon library
- `react-native-safe-area-context`: `5.6.2` - Safe area handling
- `react-native-gesture-handler`: `2.28.0` - Gesture support
- `react-native-reanimated`: `4.1.1` - Animations
- `react-native-screens`: `4.16.0` - Native screens

#### Maps & Location
- `react-native-maps`: `1.20.1` - Maps integration
- `expo-location`: `~19.0.7` - Location services

#### Payments
- `@stripe/stripe-react-native`: `0.50.3` - Stripe integration

#### Monitoring & Analytics
- `@sentry/react-native`: `7.2.0` - Error tracking
- `sentry-expo`: `^7.0.0` - Expo Sentry integration

#### Expo Modules
- `expo-constants`: `18.0.10` - App constants
- `expo-device`: `~8.0.9` - Device info
- `expo-font`: `~14.0.9` - Custom fonts
- `expo-image-picker`: `^17.0.8` - Image selection
- `expo-linking`: `8.0.8` - Deep linking
- `expo-local-authentication`: `^17.0.7` - Biometric auth
- `expo-notifications`: `^0.32.12` - Push notifications
- `expo-splash-screen`: `31.0.10` - Splash screen
- `expo-updates`: `~29.0.12` - OTA updates
- `expo-web-browser`: `15.0.9` - In-app browser

#### Network
- `@react-native-community/netinfo`: `^11.4.1` - Network state

#### Shared Packages (Monorepo)
- `@mintenance/api-client`: Workspace package
- `@mintenance/design-tokens`: Workspace package
- `@mintenance/types`: Workspace package (via TypeScript references)
- `@mintenance/shared`: Workspace package (via TypeScript references)

### Dev Dependencies
- `@babel/core`: `^7.25.2`
- `@testing-library/react-native`: `^13.3.3`
- `@types/jest`: `^29.5.12`
- `@types/react`: `19.1.10`
- `eslint`: `^9.39.1`
- `eslint-config-expo`: `~10.0.0`
- `jest`: `^29.7.0`
- `jest-expo`: `~54.0.13`
- `react-test-renderer`: `^19.2.0`
- `typescript`: `~5.9.3`

---

## 📁 Project Structure

```
apps/mobile/
├── src/
│   ├── components/          # UI Components (120 files)
│   │   ├── ui/              # Base UI components (26 files)
│   │   ├── messaging/       # Messaging components
│   │   ├── finance/         # Finance components (7 files)
│   │   ├── map/             # Map components (5 files)
│   │   ├── video-call/      # Video call components (2 files)
│   │   └── ...
│   ├── screens/             # Screen components (144 files)
│   ├── services/            # Business logic (166 files)
│   │   ├── LocalDatabase.ts # SQLite database
│   │   ├── MessagingService.ts
│   │   ├── SyncManager.ts
│   │   ├── RealtimeService.ts
│   │   └── ...
│   ├── navigation/          # Navigation setup (14 files)
│   │   ├── AppNavigator.tsx
│   │   ├── navigators/      # Feature navigators
│   │   └── types.ts
│   ├── hooks/              # Custom hooks (27 files)
│   ├── contexts/           # React contexts (3 files)
│   ├── config/            # Configuration (10 files)
│   │   ├── supabase.ts
│   │   ├── reactQuery.config.ts
│   │   └── ...
│   ├── types/             # TypeScript types (24 files)
│   │   ├── standardized.ts # Main type definitions
│   │   └── ...
│   ├── utils/             # Utilities (105 files)
│   ├── design-system/     # Design tokens
│   ├── theme/            # Theming
│   └── __tests__/        # Tests (99 files)
├── assets/               # Images, fonts, etc.
├── app.config.js        # Expo configuration
├── eas.json             # EAS Build configuration
├── tsconfig.json        # TypeScript configuration
├── babel.config.js      # Babel configuration
├── metro.config.js      # Metro bundler configuration
├── jest.config.js       # Jest configuration
└── package.json         # Dependencies
```

---

## ⚙️ Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,                    // ✅ Strict mode enabled
    "baseUrl": ".",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "target": "esnext",
    "paths": {
      "@/*": ["./src/*"],
      "@mintenance/types": ["../../packages/types/src"],
      "@mintenance/shared": ["../../packages/shared/src"]
    }
  },
  "references": [
    { "path": "../../packages/types" },
    { "path": "../../packages/shared" }
  ]
}
```

**Key Features:**
- ✅ Strict mode enabled
- ✅ Path aliases configured
- ✅ TypeScript project references for monorepo
- ✅ Modern ES features

### Expo Configuration (`app.config.js`)

**App Info:**
- **Name:** Mintenance
- **Slug:** mintenance
- **Version:** 1.2.3
- **Bundle ID (iOS):** `com.mintenance.app`
- **Package (Android):** `com.mintenance.app`
- **Build Number:** 15

**Platforms:**
- ✅ iOS (deployment target: 15.1)
- ✅ Android (minSdk: 24, targetSdk: 34, compileSdk: 35)
- ✅ Web (optional)

**Permissions:**
- Location (when in use, always)
- Camera
- Photo Library
- Biometric (Face ID / Fingerprint)
- Notifications

**Deep Linking:**
- Scheme: `mintenance`
- Domains: `mintenance.app`, `www.mintenance.app`
- Associated Domains (iOS): `applinks:mintenance.app`

**Updates:**
- OTA Updates: Enabled
- Runtime Version: `appVersion` policy
- Update URL: Expo Updates service

### EAS Build Configuration (`eas.json`)

**Build Profiles:**
1. **development** - Debug builds, internal distribution
2. **stable** - Release builds, internal testing
3. **staging** - Staging environment
4. **preview** - Preview builds
5. **production** - Production builds
6. **production-store** - Store submission builds

**Android:**
- Build Type: `app-bundle` (production), `apk` (others)
- Java: JDK 17
- Gradle: Optimized for release
- ProGuard: Enabled (production)

**iOS:**
- Build Configuration: `Release` (production), `Debug` (development)
- Deployment Target: 15.1
- Frameworks: Static linking

### Metro Configuration (`metro.config.js`)

- Uses Expo default config
- Custom reporter for build time logging
- Optimized for development and production

### Babel Configuration (`babel.config.js`)

- Preset: `babel-preset-expo`
- Reanimated plugin: Temporarily removed (noted in comments)
- Minimal configuration for performance

---

## 🏗️ Type System

### Type Definitions

#### Core Types (`src/types/standardized.ts`)

**User Types:**
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'homeowner' | 'contractor';
  // ... profile fields
}

interface ContractorProfile extends User {
  companyName?: string;
  licenseNumber?: string;
  // ... business fields
}
```

**Job Types:**
```typescript
interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  homeownerId: string;
  contractorId?: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number;
  // ... additional fields
}
```

**Message Types:**
```typescript
interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType: MessageType;
  read: boolean;
  createdAt: string;
  // ... video call fields
}
```

**Database Types:**
```typescript
// Local SQLite schema
type DatabaseMessage = {
  message_text: string;  // Local DB uses message_text
  // ... other fields
};

// App-level types use camelCase
interface Message {
  messageText: string;  // App uses messageText
  // ... other fields
};
```

### Type Conversion

**Conversion Functions:**
- `convertDatabaseMessageToMessage()` - Local DB → App format
- `convertMessageToDatabaseMessage()` - App format → Local DB
- `convertDatabaseJobToJob()` - Job conversion
- `convertDatabaseUserToUser()` - User conversion

**Field Mapping:**
- `message_text` (DB) ↔ `messageText` (App)
- `job_id` (DB) ↔ `jobId` (App)
- `created_at` (DB) ↔ `createdAt` (App)
- etc.

---

## 🏛️ Architecture Patterns

### 1. Service Layer Pattern

**Structure:**
```
services/
├── MessagingService.ts      # Message operations
├── LocalDatabase.ts         # SQLite operations
├── SyncManager.ts          # Offline sync
├── RealtimeService.ts      # Real-time updates
├── AuthService.ts          # Authentication
└── ...
```

**Pattern:**
- Static methods for stateless operations
- Service classes for complex logic
- Separation of concerns
- Error handling via `ServiceErrorHandler`

### 2. Offline-First Architecture

**Components:**
- **LocalDatabase:** SQLite for offline storage
- **SyncManager:** Syncs local ↔ remote
- **RealtimeService:** Real-time updates
- **React Query:** Caching with offline support

**Flow:**
```
User Action → Local DB → Mark Dirty → Sync Manager → Supabase
                                    ↓
                            (if offline, queue for later)
```

### 3. Navigation Architecture

**Structure:**
```
RootStack
├── AuthNavigator (if not authenticated)
└── TabNavigator (if authenticated)
    ├── HomeTab
    ├── JobsTab (JobsNavigator)
    ├── MessagesTab (MessagingNavigator)
    ├── DiscoverTab (DiscoverNavigator)
    └── ProfileTab (ProfileNavigator)
└── ModalNavigator (modals)
```

**Navigators:**
- Stack Navigator for hierarchical navigation
- Tab Navigator for main app sections
- Drawer Navigator (optional)
- Modal Navigator for overlays

### 4. State Management

**React Query (Server State):**
- Queries for data fetching
- Mutations for data updates
- Caching with TTL
- Offline-first mode
- Optimistic updates

**React Context (Client State):**
- `AuthContext` - Authentication state
- `AppStateContext` - App-level state

**Local State:**
- `useState` for component state
- `useReducer` for complex state

### 5. Error Handling

**Layers:**
1. **Global Error Handlers** (`index.ts`)
   - Unhandled promise rejections
   - Uncaught exceptions
   - React Native warnings

2. **Error Boundaries**
   - `AppErrorBoundary` - App-level
   - `ScreenErrorBoundary` - Screen-level
   - `QueryErrorBoundary` - Query-level

3. **Service Error Handling**
   - `ServiceErrorHandler` utility
   - Consistent error formatting
   - User-friendly messages

4. **Sentry Integration**
   - Error tracking
   - Performance monitoring
   - Release tracking

---

## 🔨 Build & Deployment

### Build Commands

```bash
# Development
npm run dev              # Start dev client
npm run start            # Start Expo

# Build
npm run build            # EAS build (all platforms)
npm run build:android    # Android only
npm run build:ios        # iOS only

# Submit
npm run submit           # Submit to stores

# Testing
npm test                 # Run tests
npm run test:coverage    # Coverage report
npm run type-check       # TypeScript check
npm run lint             # ESLint
```

### EAS Build Profiles

**Development:**
- Development client enabled
- Internal distribution
- Debug builds
- Fast refresh enabled

**Production:**
- Release builds
- Code optimization enabled
- Hermes enabled
- ProGuard enabled (Android)
- App bundles (production-store)

### Environment Variables

**Required:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Optional:**
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_ENVIRONMENT`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_SERVICES_PLIST` (iOS)
- `GOOGLE_SERVICES_JSON` (Android)

**Validation:**
- Validated at build time (`app.config.js`)
- Production builds fail if missing
- Development builds warn but continue

---

## 📊 Performance Budgets

### Mobile Performance Targets

```json
{
  "bundle_size": {
    "warning": 18MB,
    "error": 20MB
  },
  "startup_time": {
    "warning": 2500ms,
    "error": 3000ms
  },
  "memory_usage": {
    "warning": 128MB,
    "error": 150MB
  },
  "screen_transition": {
    "warning": 100ms,
    "error": 150ms
  },
  "api_response_p95": {
    "warning": 500ms,
    "error": 800ms
  },
  "fps": {
    "warning": 55,
    "error": 50
  }
}
```

### Optimization Strategies

1. **Code Splitting**
   - Lazy loading for screens
   - Dynamic imports for heavy components
   - Route-based splitting

2. **Image Optimization**
   - Expo Image component
   - Lazy loading
   - Caching

3. **Bundle Optimization**
   - Tree shaking
   - Dead code elimination
   - Hermes bytecode

4. **Performance Monitoring**
   - React Query performance tracking
   - Custom performance utilities
   - Sentry performance monitoring

---

## 🧪 Testing Setup

### Jest Configuration

**Test Environment:** Node.js (for unit tests)

**Coverage Thresholds:**
- Global: 70% branches, 75% lines
- Services: 80% branches, 85% lines (higher standards)

**Mocking:**
- React Native modules mocked
- Supabase client mocked
- Navigation mocked
- Expo modules mocked

**Test Structure:**
```
__tests__/
├── components/      # Component tests
├── services/       # Service tests
├── hooks/          # Hook tests
├── utils/          # Utility tests
└── integration/    # Integration tests
```

### Testing Libraries

- `@testing-library/react-native` - Component testing
- `jest` - Test runner
- `jest-expo` - Expo-specific Jest config
- Custom mocks for React Native modules

---

## 🔐 Security

### Authentication
- Supabase Auth
- Biometric authentication (Face ID / Fingerprint)
- Secure token storage
- Session management

### Data Security
- Encrypted local database (SQLite)
- Secure storage for sensitive data
- HTTPS only for API calls
- Input sanitization

### Code Security
- No hardcoded secrets
- Environment variable validation
- Type-safe API calls
- Input validation middleware

---

## 📱 Platform-Specific Features

### iOS
- Face ID support
- Associated Domains (deep linking)
- App Store Connect integration
- Push notifications
- Background modes

### Android
- Fingerprint authentication
- App Links (deep linking)
- Google Play integration
- Push notifications
- Background services
- ProGuard obfuscation

---

## 🔄 Sync & Offline Support

### Offline-First Design

**Components:**
1. **LocalDatabase** - SQLite storage
2. **SyncManager** - Sync orchestration
3. **React Query** - Cache management
4. **Network State** - Connection monitoring

### Local Database Schema

**Database:** SQLite (`mintenance_local.db`)  
**Version:** 1

#### Tables

**1. Users Table:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  profile_image_url TEXT,
  bio TEXT,
  rating REAL,
  total_jobs_completed INTEGER,
  is_available INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  is_dirty INTEGER DEFAULT 0
);
```

**2. Jobs Table:**
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  homeowner_id TEXT NOT NULL,
  contractor_id TEXT,
  status TEXT NOT NULL,
  budget REAL NOT NULL,
  category TEXT,
  subcategory TEXT,
  priority TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  is_dirty INTEGER DEFAULT 0,
  FOREIGN KEY (homeowner_id) REFERENCES users(id),
  FOREIGN KEY (contractor_id) REFERENCES users(id)
);
```

**3. Messages Table:**
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message_text TEXT NOT NULL,  -- Note: Local DB uses message_text
  message_type TEXT NOT NULL,
  attachment_url TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  is_dirty INTEGER DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);
```

**4. Bids Table:**
```sql
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  synced_at TEXT,
  is_dirty INTEGER DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (contractor_id) REFERENCES users(id)
);
```

**5. Sync Metadata Table:**
```sql
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL UNIQUE,
  last_sync_timestamp INTEGER NOT NULL,
  record_count INTEGER DEFAULT 0,
  is_dirty INTEGER DEFAULT 0
);
```

**6. Offline Actions Table:**
```sql
CREATE TABLE IF NOT EXISTS offline_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action_data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TEXT
);
```

#### Indexes

**Performance Indexes:**
- `idx_users_email` - Fast user lookup by email
- `idx_jobs_homeowner` - Jobs by homeowner
- `idx_jobs_contractor` - Jobs by contractor
- `idx_jobs_status` - Jobs by status
- `idx_messages_job` - Messages by job
- `idx_messages_sender` - Messages by sender
- `idx_messages_receiver` - Messages by receiver
- `idx_bids_job` - Bids by job
- `idx_bids_contractor` - Bids by contractor
- `idx_dirty_*` - Partial indexes for dirty records (sync optimization)

**Sync Strategy:**
- Write to local DB first
- Mark records as dirty (`is_dirty = 1`)
- Sync when online
- Conflict resolution (last write wins)
- Retry logic with exponential backoff
- Queue offline actions for later sync

**Data Flow:**
```
User Action → Local DB → Mark Dirty → Sync Manager → Supabase
                                    ↓
                            (if offline, queue in offline_actions)
                                    ↓
                            (when online, process queue)
```

**Column Mapping (Local ↔ Supabase):**
- `message_text` (local) ↔ `content` (Supabase)
- `job_id` (local) ↔ `job_id` (Supabase)
- `created_at` (local) ↔ `created_at` (Supabase)
- Conversion handled by `SyncManager` and `MessagingService`

---

## 📈 Monitoring & Analytics

### Error Tracking
- **Sentry:** Error tracking and performance
- **React Query:** Query error tracking
- **Global Handlers:** Unhandled errors

### Performance Monitoring
- React Query performance metrics
- Custom performance utilities
- Sentry performance traces
- Bundle size monitoring

### Logging
- Structured logging via `@mintenance/shared`
- Log levels (debug, info, warn, error)
- Performance logging
- Network request logging

---

## 🎨 Design System

### Design Tokens
- Imported from `@mintenance/design-tokens`
- Platform-specific tokens (`mobileTokens`)
- Typography scaling utilities
- Color system
- Spacing system

### Theming
- Light/dark mode support
- Dynamic theming
- Component-level themes
- Consistent styling

---

## 🔌 API Integration

### Supabase Client
- Configured in `src/config/supabase.ts`
- Type-safe with Database types
- Real-time subscriptions
- Offline support
- Mock client for development

### React Query Integration
- Query keys factory pattern
- Optimistic updates
- Cache invalidation
- Offline-first queries
- Retry logic

---

## ✅ Quality Assurance

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint configured
- ✅ Prettier (if configured)
- ✅ Pre-commit hooks (if configured)

### Testing
- ✅ Unit tests
- ✅ Integration tests
- ✅ Component tests
- ✅ Coverage thresholds

### Performance
- ✅ Performance budgets
- ✅ Bundle size monitoring
- ✅ Memory usage tracking
- ✅ FPS monitoring

---

## 📝 Key Technical Decisions

### 1. Expo Managed Workflow
- **Reason:** Faster development, easier updates
- **Trade-off:** Less native customization, but sufficient for needs

### 2. React Query for State
- **Reason:** Excellent caching, offline support, optimistic updates
- **Alternative Considered:** Redux (too complex for needs)

### 3. SQLite for Offline
- **Reason:** Native performance, offline-first design
- **Alternative Considered:** AsyncStorage (not suitable for complex queries)

### 4. TypeScript Strict Mode
- **Reason:** Type safety, catch errors early
- **Trade-off:** More verbose, but worth it

### 5. Monorepo Structure
- **Reason:** Code sharing, consistent types
- **Benefit:** Single source of truth for types

---

## 🚨 Known Limitations

### 1. Babel Configuration
- Reanimated plugin temporarily removed (noted in comments)
- May need re-enabling for complex animations

### 2. Bundle Size
- Currently within budget, but monitor closely
- Consider code splitting if grows

### 3. Test Coverage
- Some services have higher coverage requirements
- Continue improving coverage

---

## 📚 Additional Resources

### Documentation
- Expo Docs: https://docs.expo.dev
- React Native Docs: https://reactnative.dev
- React Query Docs: https://tanstack.com/query
- Supabase Docs: https://supabase.com/docs

### Internal Docs
- `DESIGN_SYSTEM_IMPLEMENTATION.md` - Design system guide
- `src/design-system/STYLE_GUIDE.md` - Style guide
- Test files - Examples of testing patterns

---

## ✅ Verification Checklist

- [x] TypeScript strict mode enabled
- [x] All dependencies up to date
- [x] Environment variables validated
- [x] Build configurations correct
- [x] Performance budgets defined
- [x] Testing setup complete
- [x] Error handling in place
- [x] Offline support implemented
- [x] Security measures in place
- [x] Monitoring configured

---

**Status:** ✅ **TECH SCHEMA COMPLETE**  
**Last Updated:** January 2025

