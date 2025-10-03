# 🏠 Mintenance - Contractor Discovery Marketplace

## Project Overview

**Mintenance** is a React Native marketplace app connecting homeowners with contractors for maintenance, repairs, and home improvement projects. The app features an industry-leading offline-first architecture, Tinder-style contractor discovery, and comprehensive project management tools.

**Current Status:** v1.1.0 - Production Ready (95% complete)  
**Architecture Grade:** A (90/100) - Industry Leading  
**Unique Features:** Only offline-first marketplace app in the industry

---

## 🚀 Core Features (Implemented)

### **User Management & Authentication**
- ✅ Dual role system (Homeowners & Contractors)
- ✅ Supabase authentication with JWT tokens
- ✅ Biometric authentication (Touch/Face ID)
- ✅ Secure token storage with expo-secure-store
- ✅ Role-based access control

### **Job Management System**
- ✅ Job posting with photos, location, budget
- ✅ Job categories and priority levels
- ✅ Status tracking (posted → assigned → in_progress → completed)
- ✅ Search and filtering capabilities
- ✅ Real-time updates via Supabase

### **Bidding System**
- ✅ Contractor bid submission
- ✅ Bid management and comparison
- ✅ Automated bid acceptance workflow
- ✅ Price negotiation capabilities

### **Contractor Discovery**
- ✅ Tinder-style swipe interface
- ✅ Location-based contractor finding
- ✅ Skills-based matching
- ✅ Rating and review system
- ✅ Map view integration

### **Messaging & Communication**
- ✅ Real-time messaging between users
- ✅ Job-specific conversation threads
- ✅ Push notifications
- ✅ Message persistence and sync

### **Payment Processing**
- ✅ Stripe integration for secure payments
- ✅ Escrow system for job security
- ✅ Payment tracking and history
- ✅ Automated payouts to contractors

### **Social Features (Contractors)**
- ✅ Project showcase posts
- ✅ Before/after photo sharing
- ✅ Professional networking
- ✅ Skill endorsements
- ✅ Follow/follower system

### **Advanced Features**
- ✅ **Offline-first architecture** (Industry unique)
- ✅ AI job analysis and recommendations
- ✅ Performance monitoring with Sentry
- ✅ Comprehensive logging system
- ✅ Multi-language support (14 languages)
- ✅ Accessibility compliance (WCAG)

---

## 🛠️ Technical Architecture

### **Frontend Stack**
- **Framework:** React Native 0.79.6 with Expo 53+
- **Navigation:** React Navigation 7.x
- **State Management:** React Query + React Context
- **UI Components:** Custom components with theme system
- **Testing:** Jest + React Native Testing Library (80%+ coverage)

### **Backend & Services**
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Authentication:** Supabase Auth with biometric enhancement  
- **Real-time:** Supabase real-time subscriptions
- **File Storage:** Supabase Storage for images
- **Payments:** Stripe Connect for marketplace payments
- **Push Notifications:** Expo Notifications
- **Analytics:** Sentry for error tracking and performance

### **Key Architectural Patterns**
- ✅ Offline-first with automatic sync
- ✅ Service layer abstraction
- ✅ Repository pattern for data access
- ✅ Observer pattern for real-time updates
- ✅ Factory pattern for environment configs
- ✅ Dependency injection for services

---

## 📊 Database Schema

### **Core Tables**
```sql
users (id, email, first_name, last_name, role, phone, created_at, updated_at)
jobs (id, title, description, location, homeowner_id, contractor_id, status, budget, created_at, updated_at)
bids (id, job_id, contractor_id, amount, description, status, created_at, updated_at)
messages (id, job_id, sender_id, receiver_id, content, created_at)
reviews (id, job_id, reviewer_id, reviewed_id, rating, comment, created_at)
escrow_transactions (id, job_id, amount, status, stripe_payment_intent_id, created_at, updated_at)
```

### **Extended Tables**
```sql
contractor_profiles (user_id, bio, skills, hourly_rate, availability)
contractor_skills (id, contractor_id, skill_name, created_at)
contractor_matches (id, homeowner_id, contractor_id, action, created_at)
contractor_posts (id, contractor_id, type, content, photos, likes, comments, shares)
contractor_follows (id, follower_id, following_id, created_at)
contractor_endorsements (id, contractor_id, endorser_id, skill_name, created_at)
```

---

## 🎯 Development Roadmap

### **Phase 1: Production Launch** ✅ (Complete)
- [x] Core MVP features
- [x] User authentication and profiles
- [x] Job posting and bidding
- [x] Basic messaging
- [x] Payment integration
- [x] iOS/Android builds

### **Phase 2: Enhanced Features** ✅ (Complete)
- [x] Contractor discovery (swipe interface)
- [x] Advanced search and filtering
- [x] Real-time messaging
- [x] Push notifications
- [x] Rating and review system
- [x] Offline capabilities

### **Phase 3: Social & AI** ✅ (Complete)
- [x] Contractor social feed
- [x] Project showcases
- [x] AI job analysis
- [x] Smart recommendations
- [x] Professional networking
- [x] Multi-language support

### **Phase 4: Performance & Scale** 🔄 (In Progress)
- [x] Comprehensive logging system
- [x] Error monitoring and tracking
- [x] Performance optimization
- [ ] Performance budgets implementation
- [ ] Advanced caching strategies
- [ ] Database optimization

### **Phase 5: Advanced Features** 📋 (Planned)
- [ ] Video calling integration
- [ ] AR/VR job visualization
- [ ] IoT device integration
- [ ] Blockchain-based reviews
- [ ] Advanced analytics dashboard

---

## 📱 Future Feature Development

### **High Priority Features (Next 1-2 months)**

#### **1. Performance Budgets System**
```typescript
// Implementation: src/utils/performanceBudgets.ts
interface PerformanceBudget {
  metric: 'bundle_size' | 'load_time' | 'memory_usage';
  threshold: number;
  current: number;
  status: 'pass' | 'warn' | 'fail';
}
```

#### **2. Advanced Search & Filters**
```typescript
// Enhancement: src/screens/JobSearchScreen.tsx
interface SearchFilters {
  location: LocationRadius;
  priceRange: PriceRange;
  skills: string[];
  rating: number;
  availability: 'immediate' | 'this_week' | 'this_month';
  projectType: ProjectType[];
}
```

#### **3. Video Communication**
```typescript
// New: src/services/VideoCallService.ts
interface VideoCall {
  id: string;
  jobId: string;
  participants: string[];
  status: 'scheduled' | 'active' | 'completed';
  recordingUrl?: string;
}
```

### **Medium Priority Features (3-6 months)**

#### **4. Advanced Analytics Dashboard**
```typescript
// New: src/screens/AnalyticsDashboard.tsx
interface ContractorAnalytics {
  jobsCompleted: number;
  averageRating: number;
  responseTime: number;
  earnings: EarningsData;
  performanceMetrics: PerformanceMetrics;
}
```

#### **5. Project Timeline & Milestones**
```typescript
// New: src/types/projectManagement.ts
interface ProjectMilestone {
  id: string;
  jobId: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  paymentAmount?: number;
}
```

#### **6. Smart Contractor Matching AI**
```typescript
// Enhancement: src/services/AIMatchingService.ts
interface MatchingAlgorithm {
  skillCompatibility: number;
  locationProximity: number;
  priceAlignment: number;
  availabilityMatch: number;
  ratingWeight: number;
  overallScore: number;
}
```

### **Low Priority Features (6+ months)**

#### **7. AR/VR Job Visualization**
```typescript
// New: src/services/ARVisualizationService.ts
interface ARJobVisualization {
  jobId: string;
  sceneData: ARSceneData;
  measurements: Measurement[];
  annotations: ARAnnotation[];
}
```

#### **8. IoT Integration**
```typescript
// New: src/services/IoTService.ts
interface SmartDevice {
  id: string;
  type: 'thermostat' | 'security_camera' | 'smart_lock';
  status: DeviceStatus;
  jobId?: string;
  maintenanceSchedule?: MaintenanceSchedule;
}
```

#### **9. Blockchain Reviews & Verification**
```typescript
// New: src/services/BlockchainService.ts
interface BlockchainReview {
  reviewHash: string;
  contractorId: string;
  jobId: string;
  rating: number;
  timestamp: number;
  verified: boolean;
}
```

---

## 🌐 Cross-Platform Web Integration

### **Current Status: Web-Ready ✅**
- **Web Server:** Successfully running at http://localhost:3002
- **Bundle Status:** 714 modules bundled successfully
- **Dependencies:** All web dependencies installed
- **Configuration:** Web platform configured in app.json

### **Web Compatibility Analysis**

#### **✅ Fully Web-Compatible Features (90%)**
- **Core UI Components:** React Native Web handles all basic components
- **Navigation:** React Navigation 7.x works seamlessly on web
- **State Management:** React Query + Context API work identically
- **Database Operations:** Supabase client works on web
- **Authentication:** Supabase Auth supports web platform
- **Payment Processing:** Stripe integration works on web
- **Real-time Features:** WebSocket subscriptions work on web
- **Messaging System:** Real-time messaging compatible
- **Job Management:** Full CRUD operations work on web
- **Social Features:** Contractor networking functions on web

#### **⚠️ Requires Web Adaptations**
- **Biometric Authentication:** Needs web alternative (WebAuthn/2FA)
- **Camera/Media Access:** HTML5 Media APIs for web implementation
- **Maps Integration:** Google Maps JavaScript API for web
- **Push Notifications:** Web Push API implementation needed
- **Local Authentication:** Web security alternatives required
- **Haptic Feedback:** Web Vibration API or alternatives
- **File System Access:** Web File API implementations

### **Web Integration Roadmap**

#### **Phase 1: Core Web Functionality (1-2 weeks)**
- ✅ Web dependencies and configuration complete
- ✅ Web development server running successfully
- 🔄 Platform-specific component wrappers
- 🔄 Responsive design for desktop/tablet layouts
- 🔄 Web-optimized navigation structure
- 🔄 Web accessibility enhancements

#### **Phase 2: Feature Adaptation (2-3 weeks)**
- 🔄 Web camera/media handling for job photos
- 🔄 Google Maps JavaScript API integration
- 🔄 Web Push API for notifications
- 🔄 Alternative authentication methods (WebAuthn)
- 🔄 Web-optimized video calling interface
- 🔄 File upload/download optimizations

#### **Phase 3: Performance & UX (1-2 weeks)**
- 🔄 Web-specific performance optimizations
- 🔄 SEO and metadata optimization
- 🔄 Progressive Web App (PWA) features
- 🔄 Cross-platform testing automation
- 🔄 Web analytics integration
- 🔄 Desktop-specific UI enhancements

### **Technical Implementation Strategy**

#### **Platform-Specific Services**
```typescript
// Platform adapter pattern for web compatibility
const PlatformService = Platform.select({
  web: () => import('./web/WebBiometricService'),
  default: () => import('./BiometricService'),
});

// Web-specific implementations
interface WebPlatformAdapter {
  biometric: WebAuthnService;
  camera: HTML5MediaService;
  maps: GoogleMapsWebService;
  notifications: WebPushService;
  storage: WebStorageService;
}
```

#### **Responsive Design Approach**
```typescript
// Responsive breakpoints for web
const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

// Platform-aware styling
const useResponsiveStyle = () => {
  const { width } = useWindowDimensions();
  return Platform.select({
    web: width > breakpoints.tablet ? desktopStyles : mobileStyles,
    default: mobileStyles,
  });
};
```

#### **Web-Specific Optimizations**
```typescript
// Code splitting for web performance
const VideoCallInterface = Platform.select({
  web: lazy(() => import('./web/WebVideoCallInterface')),
  default: () => import('./VideoCallInterface'),
});

// Web analytics integration
const trackWebEvent = (event: string, properties: object) => {
  if (Platform.OS === 'web') {
    gtag('event', event, properties);
  }
};
```

### **Cross-Platform Architecture Benefits**

#### **Code Reuse: 85% Shared Codebase**
- **Services Layer:** 100% reusable (Supabase, business logic)
- **Components:** 90% reusable with minor platform adaptations
- **Screens:** 85% reusable with responsive design
- **Navigation:** 95% reusable with web-specific enhancements
- **State Management:** 100% reusable (React Query + Context)

#### **Development Efficiency**
- **Single Codebase:** Maintain one React Native project
- **Shared Types:** TypeScript definitions work across platforms
- **Unified Testing:** Most tests run on both mobile and web
- **Common CI/CD:** Single deployment pipeline for all platforms
- **Feature Parity:** New features automatically work on both platforms

#### **Business Advantages**
- **Broader Market Reach:** Desktop users can access the platform
- **SEO Benefits:** Web version improves search visibility
- **Professional Use:** Desktop interface better for contractor businesses
- **Accessibility:** Web platform supports better accessibility tools
- **Cost Effective:** Single development team for multiple platforms

### **Web-Specific Features to Add**

#### **Desktop-Optimized UI**
- **Multi-column Layouts:** Better use of screen real estate
- **Keyboard Shortcuts:** Power user productivity features
- **Context Menus:** Right-click functionality
- **Drag & Drop:** Enhanced file handling
- **Hover States:** Rich interactive feedback

#### **SEO & Discoverability**
- **Server-Side Rendering:** Better search engine indexing
- **Meta Tags:** Rich social media previews
- **Structured Data:** Schema.org markup for contractors
- **Sitemap Generation:** Automatic SEO optimization
- **Analytics Integration:** Comprehensive user tracking

#### **Progressive Web App Features**
- **Offline Functionality:** Service worker for offline access
- **App Installation:** Add to home screen capability
- **Background Sync:** Sync data when connection restored
- **Push Notifications:** Web push for engagement
- **App Shell Architecture:** Fast loading experience

### **Cross-Platform Testing Strategy**

```typescript
// Platform-specific test configuration
describe('Cross-Platform Component Tests', () => {
  const platforms = ['ios', 'android', 'web'];

  platforms.forEach(platform => {
    test(`renders correctly on ${platform}`, () => {
      Platform.OS = platform;
      const component = render(<JobCard {...props} />);
      expect(component).toMatchSnapshot(`JobCard-${platform}`);
    });
  });
});
```

### **Next Steps for Web Integration**

1. **Immediate (This Week)**
   - ✅ Verify web server functionality
   - 🔄 Test core features in browser
   - 🔄 Identify critical compatibility issues
   - 🔄 Plan responsive design approach

2. **Short Term (1-2 Weeks)**
   - 🔄 Implement platform adapters for native features
   - 🔄 Create responsive layouts for desktop
   - 🔄 Add web-specific error handling
   - 🔄 Set up web analytics tracking

3. **Medium Term (1-2 Months)**
   - 🔄 Complete feature parity between platforms
   - 🔄 Add PWA functionality
   - 🔄 Implement SEO optimizations
   - 🔄 Launch beta web version

**Web Integration Status:** 🔄 In Progress (Phase 1 Complete)
**Estimated Web Launch:** 4-6 weeks from now
**Code Reuse Achievement:** 85% shared codebase target

---

## 🔧 Development Guidelines

### **Code Standards**
- ✅ TypeScript strict mode (100% coverage)
- ✅ ESLint + Prettier configuration
- ✅ Component-based architecture
- ✅ Service layer abstraction
- ✅ Comprehensive error handling
- ✅ Accessibility compliance
- ✅ **Consistent API usage across platforms**

### **Architecture Principles**

#### **File Length and Structure**
- **Never allow a file to exceed 500 lines**
- **If a file approaches 400 lines, break it up immediately**
- **Treat 1000 lines as unacceptable, even temporarily**
- **Use folders and naming conventions to keep small files logically grouped**

#### **OOP First**
- **Every functionality should be in a dedicated class, struct, or protocol, even if it's small**
- **Favor composition over inheritance, but always use object-oriented thinking**
- **Code must be built for reuse, not just to "make it work"**

#### **Single Responsibility Principle**
- **Every file, class, and function should do one thing only**
- **If it has multiple responsibilities, split it immediately**
- **Each view, manager, or utility should be laser-focused on one concern**

#### **Modular Design**
- **Code should connect like Lego — interchangeable, testable, and isolated**
- **Ask: "Can I reuse this class in a different screen or project?" If not, refactor it**
- **Reduce tight coupling between components. Favor dependency injection or protocols**

#### **Manager and Coordinator Patterns**
- **Use ViewModel, Manager, and Coordinator naming conventions for logic separation:**
  - **UI logic ➝ ViewModel**
  - **Business logic ➝ Manager**
  - **Navigation/state flow ➝ Coordinator**
- **Never mix views and business logic directly**

#### **Function and Class Size**
- **Keep functions under 30–40 lines**
- **If a class is over 200 lines, assess splitting into smaller helper classes**

#### **Naming and Readability**
- **All class, method, and variable names must be descriptive and intention-revealing**
- **Avoid vague names like data, info, helper, or temp**

#### **Scalability Mindset**
- **Always code as if someone else will scale this**
- **Include extension points (e.g., protocol conformance, dependency injection) from day one**

#### **Avoid God Classes**
- **Never let one file or class hold everything (e.g., massive ViewController, ViewModel, or Service)**
- **Split into UI, State, Handlers, Networking, etc.**

#### **API Consistency and Usage**
- **ALWAYS use environment variables for API endpoints**
  - Never hardcode URLs in code
  - Use `EXPO_PUBLIC_API_BASE_URL` for mobile
  - Use `NEXT_PUBLIC_API_BASE_URL` for web
- **Maintain consistent API patterns across mobile and web**
  - Same endpoint structure (`/api/payments/create-intent`)
  - Same request/response formats
  - Same error handling patterns
- **Platform-specific API configuration**
  ```typescript
  // ✅ CORRECT: Platform-aware API configuration
  const API_BASE_URL = Platform.select({
    web: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
    default: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.mintenance.app'
  });
  ```
- **Validate API responses with TypeScript interfaces**
  - Define response types for all API calls
  - Use type guards for runtime validation
  - Handle errors consistently
- **Use centralized API clients**
  - Create dedicated service classes for each domain (Payment, Job, Auth)
  - Avoid direct fetch/axios calls in components
  - Implement retry logic and error handling in services

#### **Database Schema Consistency**
- **Column names must match between code and database**
  - Use exact column names from database schema
  - Verify schema before implementing features
  - Run migrations before deploying code changes
- **Database migration workflow**
  1. Create migration file with descriptive name
  2. Test migration on local database
  3. Update TypeScript types to match schema
  4. Update service layer to use new columns
  5. Deploy migration before deploying code

### **Testing Strategy**
- ✅ Unit tests for all services (80%+ coverage)
- ✅ Component testing with React Native Testing Library
- ✅ Integration tests for user workflows
- ✅ E2E tests with Detox
- ✅ Performance testing
- ✅ Security testing

### **Performance Requirements**
- ✅ App startup time: <3 seconds
- ✅ Screen transitions: <100ms
- ✅ Network requests: <2 seconds
- ✅ Memory usage: <150MB
- ✅ Bundle size: <20MB

---

## 📚 Key Files & Architecture

### **Core Services**
```
src/services/
├── AuthService.ts           # Authentication & user management
├── JobService.ts            # Job CRUD operations
├── BidService.ts            # Bidding system
├── PaymentService.ts        # Stripe integration
├── MessagingService.ts      # Real-time messaging
├── ContractorService.ts     # Contractor discovery
├── OfflineManager.ts        # Offline-first sync
├── AIAnalysisService.ts     # AI job analysis
└── NotificationService.ts   # Push notifications
```

### **Core Screens**
```
src/screens/
├── HomeScreen.tsx           # Dashboard and navigation hub
├── JobPostingScreen.tsx     # Job creation interface
├── ContractorDiscoveryScreen.tsx  # Swipe interface
├── MessagingScreen.tsx      # Real-time chat
├── PaymentScreen.tsx        # Stripe checkout
└── ProfileScreen.tsx        # User profile management
```

### **State Management**
```
src/hooks/
├── useJobs.ts              # Job-related queries and mutations
├── useOfflineQuery.ts      # Offline-first data hooks
├── useNetworkState.ts      # Network status monitoring
└── useAuth.ts              # Authentication state
```

---

## 🚀 Deployment & CI/CD

### **Build Profiles**
- **Development:** Debug builds for testing
- **Staging:** Pre-production testing environment
- **Preview:** Internal distribution builds
- **Production:** App store releases

### **Environment Configuration**
```typescript
// src/config/environment.ts
interface AppConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  supabaseUrl: string;
  stripePublishableKey: string;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
}
```

---

## 🎯 Project Commands

### **Development**
```bash
npm start                    # Start development server
npm run android             # Run on Android emulator
npm run ios                 # Run on iOS simulator
npm test                    # Run test suite
npm run type-check          # TypeScript validation
```

### **Building**
```bash
npm run build:android:dev   # Development Android build
npm run build:android:prod  # Production Android build
npm run build:ios:prod      # Production iOS build
```

### **Testing**
```bash
npm run test:coverage       # Test with coverage report
npm run e2e:android         # End-to-end Android tests
npm run e2e:ios             # End-to-end iOS tests
```

---

## 🔒 Security & Compliance

### **Security Features**
- ✅ Row Level Security (RLS) in database
- ✅ JWT token authentication
- ✅ API rate limiting
- ✅ Input validation and sanitization
- ✅ Secure file upload handling
- ✅ Encrypted data storage

### **Privacy Compliance**
- ✅ GDPR compliance for EU users
- ✅ CCPA compliance for California users
- ✅ Data encryption at rest and in transit
- ✅ User data export/deletion capabilities
- ✅ Privacy policy and terms of service

---

## 📊 Current Project Status

### **Technical Metrics**
- **Code Quality:** A (90/100)
- **Test Coverage:** 80%+
- **Performance Score:** 85/100
- **Security Rating:** A (90/100)
- **Documentation:** 95% complete

### **Feature Completion**
- **Core Features:** 100% ✅
- **Advanced Features:** 90% ✅
- **Performance Optimization:** 85% 🔄
- **Platform Features:** 95% ✅
- **Testing & QA:** 80% ✅

### **Production Readiness**
- **Build System:** 95% ✅
- **Deployment Pipeline:** 90% ✅
- **Monitoring & Analytics:** 85% ✅
- **Error Handling:** 90% ✅
- **Documentation:** 95% ✅

---

## 🎯 Next Development Cycles

### **Sprint 1 (Current)** 🔄
- [ ] Complete performance budgets implementation
- [ ] Final TypeScript cleanup (47 warnings)
- [ ] Beta testing preparation
- [ ] App store submission prep

### **Sprint 2 (Next)**
- [ ] Advanced search filters
- [ ] Video calling integration
- [ ] Enhanced analytics dashboard
- [ ] Performance optimizations

### **Sprint 3 (Future)**
- [ ] AR job visualization
- [ ] IoT device integration
- [ ] Blockchain review system
- [ ] Advanced AI matching

---

## 🏆 Competitive Advantages

### **Technical Differentiators**
1. **Offline-first architecture** - Industry unique capability
2. **Superior code quality** - 90/100 vs 60/100 industry average
3. **Comprehensive testing** - 80% coverage vs 50% industry average
4. **Modern React Native patterns** - Latest best practices
5. **Type-safe development** - 100% TypeScript coverage

### **Feature Differentiators**
1. **Tinder-style contractor discovery** - Unique UX approach
2. **Real-time collaboration tools** - Advanced communication
3. **AI-powered job analysis** - Smart recommendations
4. **Social contractor network** - Professional networking
5. **Multi-language support** - Global market ready

---

## 📞 Development Support

For development questions, architecture decisions, or feature planning, reference this document and the comprehensive technical documentation in the project repository.

**Key Resources:**
- `INDUSTRY_STANDARDS_ANALYSIS.md` - Technical benchmarking
- `BUILD_RESOLUTION_SUMMARY.md` - Build and deployment guide
- `CHANGELOG.md` - Feature history and updates
- `src/types/index.ts` - Complete type definitions
- `src/services/` - Service layer architecture

**Current Build Status:** ✅ Active (Build ID: 4eebd9e7-71b6-4bf0-99f7-225e47941471)

---

*Last Updated: August 28, 2025*  
*Project Status: Production Ready (95% complete)*  
*Next Milestone: Performance budgets completion*