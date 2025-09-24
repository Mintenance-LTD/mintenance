# Mintenance Monorepo Architecture

This document describes the architectural restructuring of the Mintenance project into a clean monorepo structure.

## 🏗️ Repository Structure

```
mintenance/
├── apps/
│   ├── web/                    # Next.js Web Application
│   │   ├── app/               # Next.js App Router
│   │   ├── lib/               # Web-specific utilities
│   │   ├── middleware.ts      # Authentication middleware
│   │   ├── next.config.js     # Next.js configuration
│   │   ├── package.json       # Web app dependencies
│   │   └── tsconfig.json      # Web TypeScript config
│   │
│   └── mobile/                # React Native/Expo Mobile App
│       ├── src/               # Mobile app source code
│       ├── android/           # Android platform files
│       ├── assets/            # Mobile app assets
│       ├── App.tsx            # Mobile app entry point
│       ├── app.json           # Expo configuration
│       ├── app.config.js      # Expo config file
│       ├── babel.config.js    # Babel configuration
│       ├── metro.config.js    # Metro bundler config
│       ├── eas.json           # EAS Build configuration
│       ├── package.json       # Mobile app dependencies
│       └── tsconfig.json      # Mobile TypeScript config
│
├── packages/
│   ├── types/                 # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts       # Main type exports
│   │   │   ├── database.ts    # Database types
│   │   │   └── schemas.ts     # Schema definitions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth/                  # Shared authentication utilities
│   │   ├── src/
│   │   │   ├── index.ts       # Main auth exports
│   │   │   ├── validation.ts  # Password/email validation
│   │   │   ├── jwt.ts         # JWT utilities
│   │   │   └── config.ts      # Configuration management
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                # Shared utilities and helpers
│       ├── src/
│       │   ├── index.ts       # Main exports
│       │   ├── logger.ts      # Logging utilities
│       │   ├── formatters.ts  # Data formatters
│       │   ├── utils.ts       # General utilities
│       │   └── helpers.ts     # Helper functions
│       ├── package.json
│       └── tsconfig.json
│
├── archive/                   # Archived old structure
│   ├── app-backups/          # Old App.tsx backup files
│   └── old-structure/        # Pre-monorepo structure
│
├── package.json              # Root workspace configuration
├── MONOREPO_ARCHITECTURE.md  # This file
└── SECURITY_ARCHITECTURE.md  # Security documentation
```

## 🚀 Platform-Specific Authentication

### Web Application (`apps/web`)
- **Authentication**: Custom JWT-based authentication
- **Backend**: Next.js API routes with middleware
- **Database**: Direct Supabase integration with server-side operations
- **Security**: bcrypt password hashing, rate limiting, secure cookies
- **Framework**: Next.js 14 with App Router

### Mobile Application (`apps/mobile`)
- **Authentication**: Supabase client SDK
- **Backend**: Supabase real-time subscriptions
- **Database**: Supabase client operations
- **Security**: Supabase built-in security features
- **Framework**: React Native with Expo

## 📦 Shared Packages

### `@mintenance/types`
Shared TypeScript types and interfaces used across both applications.

**Key exports:**
- `User`, `AuthResult`, `LoginCredentials`
- `ApiResponse`, `RateLimitInfo`
- `JWTPayload`
- Database schema types

### `@mintenance/auth`
Authentication utilities and validation functions.

**Key exports:**
- `validateEmail()`, `validatePassword()`
- `hashPassword()`, `comparePassword()`
- `generateJWT()`, `verifyJWT()`
- `ConfigManager` for environment validation

### `@mintenance/shared`
Common utilities and helper functions.

**Key exports:**
- `logger` for consistent logging
- `formatDate()`, `formatCurrency()`, `formatPhone()`
- `debounce()`, `throttle()`, `retry()`
- `generateId()`, `sanitizeString()`

## 🛠️ Development Commands

### Root Level Commands
```bash
# Install all dependencies
npm install

# Development
npm run dev              # Start web app (default)
npm run dev:web          # Start web app explicitly
npm run dev:mobile       # Start mobile app

# Build
npm run build            # Build all packages and apps
npm run build:web        # Build web app only
npm run build:mobile     # Build mobile app only

# Testing
npm run test            # Run all tests
npm run test:web        # Test web app only
npm run test:mobile     # Test mobile app only

# Linting
npm run lint            # Lint all projects
npm run lint:web        # Lint web app only
npm run lint:mobile     # Lint mobile app only

# Utilities
npm run clean           # Clean build artifacts
npm run reset           # Full reset (clean + reinstall)
```

### Web App Commands
```bash
cd apps/web

npm run dev             # Development server (port 3000)
npm run build           # Production build
npm run start           # Start production server
npm run lint            # ESLint
npm run type-check      # TypeScript validation
```

### Mobile App Commands
```bash
cd apps/mobile

npm run start           # Start Expo development server
npm run android         # Run on Android
npm run ios             # Run on iOS
npm run web             # Run on web (Expo web)
npm run build           # EAS Build
npm run test            # Jest tests
npm run lint            # ESLint
```

## 🔧 Environment Configuration

### Web App Environment Variables
```bash
# Required
JWT_SECRET=your-very-strong-secret-minimum-32-characters
NODE_ENV=production
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_URL=postgresql://...
```

### Mobile App Environment Variables
```bash
# Expo Public Variables (client-side)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App Configuration
EXPO_PUBLIC_APP_NAME=Mintenance
EXPO_PUBLIC_APP_VERSION=1.2.3
EXPO_PUBLIC_ENVIRONMENT=development
```

## 🔄 Workspace Management

This monorepo uses npm workspaces for dependency management:

- **Shared dependencies** are hoisted to the root `node_modules`
- **App-specific dependencies** remain in their respective directories
- **Workspace references** allow packages to depend on each other
- **Type checking** works across package boundaries

### Adding Dependencies

```bash
# Add to web app
npm install express -w @mintenance/web

# Add to mobile app
npm install react-native-vector-icons -w @mintenance/mobile

# Add to shared package
npm install lodash -w @mintenance/shared

# Add development dependency to root
npm install prettier -D
```

## 🚦 Migration Benefits

### ✅ **Separation of Concerns**
- Web and mobile apps are clearly separated
- No more platform-specific code intermixing
- Independent deployment pipelines possible

### ✅ **Code Reuse**
- Shared types ensure consistency
- Common utilities reduce duplication
- Authentication logic is centralized where appropriate

### ✅ **Security Improvements**
- Platform-appropriate authentication systems
- No more mock authentication
- Proper environment variable management

### ✅ **Developer Experience**
- Clear project structure
- Type safety across packages
- Consistent tooling and scripts

### ✅ **Maintainability**
- Independent versioning possible
- Easier testing and CI/CD setup
- Clear dependency relationships

## 🎯 Next Steps

### Immediate Actions Required
1. **Install Dependencies**: Run `npm install` at root level
2. **Build Packages**: Run `npm run build:packages` to compile shared code
3. **Test Applications**: Verify both apps start correctly
4. **Update CI/CD**: Modify build scripts for monorepo structure

### Future Improvements
1. **Dependency Optimization**: Review and optimize shared dependencies
2. **Build Optimization**: Implement efficient build caching
3. **Testing Strategy**: Set up cross-package testing
4. **Documentation**: Update API documentation for new structure

## 🔍 Troubleshooting

### Common Issues

**Module Resolution Errors**
```bash
# Rebuild packages
npm run build:packages

# Clear caches
npm run clean
npm run reset
```

**TypeScript Errors**
```bash
# Check workspace references
npm run type-check

# Rebuild type definitions
npm run build -w packages/types
```

**Dependency Issues**
```bash
# Check workspace setup
npm ls --depth=0

# Reinstall from clean state
npm run reset
```

---

**Migration Completed**: January 2025
**Architecture Review**: Required every 6 months
**Next Review**: July 2025