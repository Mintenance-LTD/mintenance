# 🛠️ Mintenance Tech Stack

**Project**: Mintenance - Contractor Discovery Marketplace  
**Architecture**: Full-stack monorepo (Web + Mobile + Shared Packages)  
**Version**: 1.2.3

---

## 📱 **Mobile App** (React Native/Expo)

### Core Framework
- **React Native**: 0.79.5
- **Expo**: ~53.0.23
- **React**: 19.0.0
- **TypeScript**: ^5

### Navigation
- **React Navigation**: ^6.1.9
  - Bottom Tabs: ^6.5.11
  - Drawer: ^6.6.6
  - Stack: ^6.3.20

### State Management & Data
- **TanStack React Query**: ^5.90.2 (async state management)
- **AsyncStorage**: 2.1.2 (local storage)

### Maps & Location
- **React Native Maps**: ^1.18.0
- **Expo Location**: ~18.1.0
- **Google Maps API**: AIzaSyDCtPcCQqECwanf7tn9avJU4gvT6nezSi8

### Authentication & Security
- **Supabase JS**: ^2.39.0
- **Expo Local Authentication**: ^17.0.7 (biometrics)
- **Custom JWT Auth** (@mintenance/auth package)

### Payments
- **Stripe React Native**: ^0.54.0

### Media & UI
- **Expo Image Picker**: ^17.0.8
- **Expo Vector Icons**: ^14.0.0
- **React Native Gesture Handler**: ~2.24.0
- **React Native Reanimated**: ~3.17.4
- **React Native Screens**: ~4.11.1
- **Safe Area Context**: 5.4.0

### Notifications & Communication
- **Expo Notifications**: ^0.32.12
- **NetInfo**: ^11.4.1 (network status)

### Development Tools
- **Expo Dev Client**: ~5.2.4
- **EAS Build**: For production builds
- **Jest**: ^29.5.12
- **Testing Library**: ^13.3.3

---

## 💻 **Web App** (Next.js)

### Core Framework
- **Next.js**: ^15.0.0 (App Router)
- **React**: ^19.0.0
- **React DOM**: ^19.0.0
- **TypeScript**: ^5

### Backend & Database
- **Supabase**: ^2.39.0
  - Supabase SSR: ^0.7.0 (server-side rendering)
  - PostgreSQL with PostGIS (geospatial)
- **Custom Auth System** (@mintenance/auth)

### Authentication & Security
- **JOSE**: ^5.1.3 (JWT handling)
- **bcryptjs**: ^2.4.3 (password hashing)
- **Zod**: ^3.23.8 (validation)
- **DOMPurify**: ^3.2.7 (XSS prevention)

### Payments
- **Stripe**: ^19.0.0 (full server SDK)

### Styling
- **Tailwind CSS**: ^3.3.0
- **PostCSS**: ^8
- **Autoprefixer**: ^10.0.1
- **Custom Theme System** (@/lib/theme)

### Testing
- **Playwright**: ^1.55.1 (E2E testing - 384 tests)
- **Jest**: ^29.7.0 (unit testing)
- **ts-jest**: ^29.1.1

### Build Tools
- **Webpack**: (via Next.js)
- **SWC**: (via Next.js for fast compilation)

---

## 📦 **Shared Packages** (Internal Monorepo)

### @mintenance/types
- Shared TypeScript interfaces
- Common type definitions
- Cross-platform types

### @mintenance/shared
- Shared utilities
- Logger system
- Common helpers
- Business logic

### @mintenance/auth
- JWT generation & validation
- Password hashing
- Token management
- Refresh token rotation
- Security utilities

---

## 🗄️ **Backend & Infrastructure**

### Database
- **Supabase (PostgreSQL)**: 17.4.1.074
- **PostGIS Extension**: Geospatial queries
- **Row Level Security (RLS)**: Enabled
- **Realtime**: Enabled

### Database Features
- 25+ tables with relationships
- Geolocation fields (latitude, longitude)
- Service areas with PostGIS geography
- Audit logging
- GDPR compliance tools

### APIs & Services
- **REST APIs**: Next.js API routes
- **Stripe Webhooks**: Payment processing
- **Google Maps Geocoding API**: Address → coordinates
- **Real-time messaging**: Supabase Realtime

### Hosting & Deployment
- **Web**: Vercel (likely)
- **Mobile**: Expo EAS (iOS + Android)
- **Database**: Supabase Cloud (eu-west-2)

---

## 🎨 **Design & UI**

### Component Library
- Custom UI components (Button, Card, Input, etc.)
- **Icon System**: 40+ professional SVG icons
- **Design Tokens**: Centralized theme system
- **Layout Components**: PageLayout, StandardCard, StatCard

### Design System
- **Colors**: Navy blue (#0F172A) + Emerald (#10B981)
- **Typography**: 9 font sizes (10px - 48px)
- **Spacing**: 14 standard sizes (4px - 96px)
- **Border Radius**: 6 sizes (4px - 24px)
- **Shadows**: 4 elevation levels

### Responsive Design
- **Mobile**: React Native (iOS + Android)
- **Web**: Responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **PWA**: Progressive Web App support

---

## 🔐 **Security & Compliance**

### Authentication
- JWT tokens (1-hour access, 7-day refresh)
- Refresh token rotation
- Secure HttpOnly cookies
- Remember Me support (30 days)
- 5-minute grace period
- Activity tracking

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)

### Data Protection
- GDPR compliance tools
- Data Subject Rights (DSR) requests
- Audit logging
- Data retention policies
- Secure token storage
- Password strength validation

### Rate Limiting
- Login attempts tracking
- API rate limits
- Webhook retry logic
- Token refresh limits

---

## 🧪 **Testing & Quality**

### E2E Testing
- **Playwright**: 384 automated tests
- Browser testing suite
- Screenshot comparison
- Network request monitoring

### Unit Testing
- **Jest**: Component + API tests
- Test coverage tracking
- Payment flow testing

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Security Audit**: Automated scans

---

## 🚀 **DevOps & Tools**

### Version Control
- Git
- Monorepo structure (npm workspaces)

### CI/CD
- Automated testing
- Build verification
- Deployment checks

### Development Tools
- **tsx**: TypeScript execution
- **rimraf**: Cross-platform file deletion
- **Hot Module Replacement** (HMR)
- **Fast Refresh**: React hot reload

### Monitoring & Logging
- Custom logger system
- Performance metrics
- Security event logging
- Audit trails

---

## 🌐 **Third-Party Services**

### Payments
- **Stripe**: Full payment processing
  - Checkout Sessions
  - Payment Intents
  - Webhooks
  - Refunds
  - Escrow

### Maps & Location
- **Google Maps API**: 
  - Geocoding
  - Place search
  - Distance calculations
  - Map display

### Backend as a Service
- **Supabase**:
  - PostgreSQL database
  - Authentication
  - Realtime subscriptions
  - Storage
  - Edge Functions

---

## 📊 **Architecture Patterns**

### Design Patterns
- **OOP**: Manager, Service, Coordinator classes
- **MVVM**: ViewModel pattern (mobile)
- **Single Responsibility**: Each file does one thing
- **Composition over Inheritance**
- **Dependency Injection**

### Code Organization
- **Monorepo**: Apps + shared packages
- **Modular**: Lego-style components
- **Type-Safe**: 100% TypeScript
- **File Size Limit**: <500 lines per file

---

## 📦 **Project Structure**

```
mintenance-clean/
├── apps/
│   ├── web/              # Next.js 15 App
│   │   ├── app/          # App Router
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & services
│   │   └── public/       # Static assets
│   └── mobile/           # Expo/React Native App
│       ├── src/
│       │   ├── screens/  # Screen components
│       │   ├── components/ # Reusable components
│       │   ├── services/ # Business logic
│       │   └── utils/    # Helper functions
│       └── app.json      # Expo config
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── shared/           # Shared utilities
│   └── auth/             # Authentication package
├── supabase/
│   └── migrations/       # Database migrations
└── scripts/              # Build & deployment scripts
```

---

## 🔢 **Tech Stack Summary**

### Frontend
- **Web**: Next.js 15 + React 19 + TypeScript
- **Mobile**: Expo 53 + React Native 0.79 + TypeScript

### Backend
- **Database**: Supabase (PostgreSQL 17 + PostGIS)
- **API**: Next.js API Routes
- **Auth**: Custom JWT + Refresh Tokens

### Services
- **Payments**: Stripe
- **Maps**: Google Maps API
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

### Testing
- **E2E**: Playwright (384 tests)
- **Unit**: Jest
- **Performance**: Custom budgets

### DevOps
- **Monorepo**: npm workspaces
- **CI/CD**: Automated testing
- **Deployment**: Vercel (web) + EAS (mobile)

---

## 💡 **Key Technologies Explained**

### Why Next.js 15?
- ✅ App Router for modern routing
- ✅ Server Components for performance
- ✅ API Routes for backend
- ✅ Built-in optimization
- ✅ SEO friendly

### Why Expo?
- ✅ Rapid mobile development
- ✅ Over-the-air updates
- ✅ EAS Build for production
- ✅ Cross-platform (iOS + Android)

### Why Supabase?
- ✅ PostgreSQL (enterprise-grade)
- ✅ Built-in auth
- ✅ Realtime subscriptions
- ✅ PostGIS for geolocation
- ✅ RLS for security

### Why Monorepo?
- ✅ Share code between web/mobile
- ✅ Type safety across platforms
- ✅ Single source of truth
- ✅ Easier maintenance

---

## 🎯 **Current Capabilities**

### What Your App Can Do:

**For Contractors**:
- ✅ Professional profile management
- ✅ Job bidding system
- ✅ Quote builder
- ✅ Invoice management
- ✅ Finance tracking
- ✅ Service area management with geocoding
- ✅ License verification
- ✅ Portfolio/gallery
- ✅ Social networking
- ✅ CRM system
- ✅ Analytics dashboard

**For Homeowners**:
- ✅ Browse contractors (List + Map view)
- ✅ Swipe-style discovery
- ✅ Job posting
- ✅ Payment processing
- ✅ Messaging
- ✅ Reviews & ratings
- ✅ Find contractors by location
- ✅ Distance calculations

**Platform Features**:
- ✅ Real-time messaging
- ✅ Payment escrow
- ✅ Stripe integration
- ✅ Geolocation tracking
- ✅ Map-based search
- ✅ Session management
- ✅ GDPR compliance
- ✅ Audit logging
- ✅ Security monitoring

---

## 🚀 **Modern & Scalable**

Your tech stack is:
- ✅ **Enterprise-grade** (Supabase, Stripe, Next.js)
- ✅ **Production-ready** (Security, testing, monitoring)
- ✅ **Scalable** (Serverless, monorepo, modular)
- ✅ **Type-safe** (100% TypeScript)
- ✅ **Modern** (React 19, Next.js 15, Expo 53)
- ✅ **Professional** (Testing, documentation, best practices)

---

## 📈 **Performance**

- **Web**: Next.js optimizations (SSR, ISR, code splitting)
- **Mobile**: Expo optimizations (OTA updates, lazy loading)
- **Database**: PostgreSQL with indexes
- **Caching**: React Query, Supabase cache
- **CDN**: Static asset delivery

---

**Your tech stack is SOLID and PRODUCTION-READY!** 🎉

