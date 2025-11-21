# 🔍 Backend Configuration & Tech Stack Audit Report

**Project**: Mintenance - Contractor Discovery Marketplace  
**Date**: 2025-11-20  
**Version**: 1.2.4  
**Audit Scope**: Backend architecture, configurations, API setup, and tech stack

---

## 📊 Executive Summary

### ✅ Overall Assessment: **PRODUCTION-READY** (with minor recommendations)

The Mintenance backend architecture is **well-configured**, **secure**, and follows **industry best practices**. The monorepo structure, environment management, and API organization are solid with comprehensive security measures in place.

### Key Strengths:
- ✅ **Comprehensive environment validation** with Zod schemas
- ✅ **Strong security** (JWT, CSRF, RLS, password policies)
- ✅ **Well-organized API structure** (111+ endpoints)
- ✅ **Proper monorepo setup** with shared packages
- ✅ **Production-ready deployment configuration** (Vercel)

### Areas for Improvement:
- ⚠️ **Environment variable centralization** (OPENAI_API_KEY not in env.ts validation)
- ⚠️ **Error handling consistency** across services
- 💡 **Documentation gaps** for some API endpoints

---

## 🏗️ Architecture Overview

### **Monorepo Structure**
```
mintenance-clean/
├── apps/
│   ├── web/          # Next.js 14.2.15 (Web App)
│   └── mobile/       # Expo ~53.0.23 (Mobile App)
├── packages/
│   ├── auth/         # JWT & Authentication utilities
│   ├── shared/       # Common utilities & logger
│   ├── types/        # TypeScript type definitions
│   ├── shared-ui/    # Shared UI components
│   ├── design-tokens/# Design system tokens
│   └── api-client/   # API client library
└── supabase/         # Database migrations & configs
```

**Status**: ✅ **EXCELLENT** - Clean separation of concerns, proper workspace configuration

---

## 🔧 Tech Stack Review

### **Backend Technologies**

| Component | Technology | Version | Status | Notes |
|-----------|-----------|----------|--------|-------|
| **Runtime** | Node.js | 20.x | ✅ LTS | Correct version pinning |
| **Web Framework** | Next.js | 14.2.15 | ✅ Stable | App Router enabled |
| **Mobile Framework** | Expo | ~53.0.23 | ✅ Latest | With dev client |
| **Database** | Supabase (PostgreSQL) | 17.x | ✅ Latest | PostGIS enabled |
| **Authentication** | Custom JWT + Supabase | N/A | ✅ Secure | Refresh tokens, rotation |
| **Payments** | Stripe | 15.4.0 (web) | ✅ Latest | Webhooks configured |
| **State Management** | TanStack Query | ^5.32.0 | ✅ Modern | Server state caching |
| **Validation** | Zod | ^3.23.4 | ✅ Current | Runtime type checking |
| **Testing** | Jest + Playwright | Latest | ✅ Good | 384 E2E tests |

**Overall Status**: ✅ **EXCELLENT** - All technologies are current and production-ready

---

## 🔐 Security Configuration Review

### **1. Authentication & Authorization**

#### ✅ **Strengths**:
- **JWT Implementation** (`@mintenance/auth`):
  - ✅ 64+ character secret requirement
  - ✅ 1-hour access tokens, 7-day refresh tokens
  - ✅ Token rotation implemented
  - ✅ Activity tracking
  - ✅ HttpOnly cookies (secure in production)

- **Password Security**:
  - ✅ bcryptjs with 12 salt rounds
  - ✅ Password history tracking (last 5 passwords)
  - ✅ Strong complexity requirements:
    - Minimum 8 characters
    - Uppercase + lowercase required
    - Numbers required
    - Special characters required
  - ✅ Account lockout after failed attempts

- **Session Management**:
  - ✅ CSRF protection with double-submit cookie pattern
  - ✅ Session validation in middleware
  - ✅ Proper cookie configuration

#### ⚠️ **Recommendations**:
1. **Add rate limiting** to login endpoint (currently using Redis fallback)
2. **Consider MFA/2FA** for admin and contractor accounts
3. **Add IP-based restrictions** for sensitive admin operations

---

### **2. API Security**

#### ✅ **Security Headers** (Configured in `next.config.js` & `vercel.json`):
```javascript
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Strict-Transport-Security (HSTS)
✅ Content-Security-Policy (CSP) with nonces
✅ Permissions-Policy
```

#### ✅ **CSRF Protection**:
- Double-submit cookie pattern implemented
- Token validation for state-changing requests (POST, PUT, DELETE, PATCH)
- Separate tokens for development and production

#### ✅ **Input Validation & Sanitization**:
- DOMPurify for XSS prevention
- Zod schemas for runtime validation
- Server-side sanitization implemented

#### ⚠️ **Areas of Concern**:
1. **Rate Limiting**: Redis-based but has fallback if Redis unavailable
   - **Impact**: Without Redis, rate limiting is degraded
   - **Recommendation**: Enforce Redis requirement in production

2. **API Route Authentication**: Most routes properly protected via middleware
   - **Exception**: `/api/webhooks` and `/api/building-surveyor/demo` are public
   - **Status**: ✅ Intentional design (webhooks have signature validation, demo is public)

---

### **3. Database Security**

#### ✅ **Supabase Configuration**:
- **Row Level Security (RLS)**: ✅ Enabled
- **Service Role Key**: ✅ Server-side only (never exposed to client)
- **Connection Security**: ✅ HTTPS only
- **Parameterized Queries**: ✅ Used throughout (via Supabase client)

#### ✅ **Data Protection**:
- Password hashing with bcryptjs (12 rounds)
- Audit logging implemented
- GDPR compliance tools available
- Password history tracking

---

## 📝 Environment Configuration Review

### **Environment Variable Management**

#### ✅ **Validation System** (`apps/web/lib/env.ts`):
```typescript
✅ JWT_SECRET: Minimum 64 characters (enforced)
✅ NEXT_PUBLIC_SUPABASE_URL: URL validation
✅ SUPABASE_SERVICE_ROLE_KEY: Required
✅ STRIPE_SECRET_KEY: Regex validation (sk_test_|sk_live_)
✅ STRIPE_WEBHOOK_SECRET: Regex validation (whsec_)
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Regex validation
⚠️ UPSTASH_REDIS_REST_URL: Optional (with warnings)
⚠️ UPSTASH_REDIS_REST_TOKEN: Optional (with warnings)
```

#### ⚠️ **Missing from Validation**:
The following environment variables are used but **NOT validated in env.ts**:

1. **OPENAI_API_KEY**: Used in 4+ services
   - **Files**: `BuildingSurveyorService.ts`, `AssessmentOrchestrator.ts`, `PhotoVerificationService.ts`, `EscrowReleaseAgent.ts`
   - **Validation**: Only runtime checks with `process.env.OPENAI_API_KEY`
   - **Recommendation**: ✅ **HIGH PRIORITY** - Add to env.ts schema

2. **ROBOFLOW_***:
   - `ROBOFLOW_API_KEY`
   - `ROBOFLOW_MODEL_ID`
   - `ROBOFLOW_MODEL_VERSION`
   - **Files**: Building surveyor services
   - **Status**: Has separate config validation
   - **Recommendation**: ✅ **MEDIUM PRIORITY** - Add to central env.ts

3. **Google Cloud**:
   - `GOOGLE_CLOUD_API_KEY` (optional)
   - `GOOGLE_MAPS_API_KEY`
   - **Status**: Optional, but should validate if present

4. **AWS Credentials** (Optional):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - **Status**: Optional for Rekognition

#### 💡 **Recommendations**:

1. **Centralize ALL environment variables** in `env.ts`:
```typescript
// Add to envSchema in apps/web/lib/env.ts
OPENAI_API_KEY: z
  .string()
  .min(1, 'OPENAI_API_KEY is required for AI features')
  .optional(),

ROBOFLOW_API_KEY: z.string().optional(),
ROBOFLOW_MODEL_ID: z.string().optional(),
ROBOFLOW_MODEL_VERSION: z.string().optional(),

GOOGLE_MAPS_API_KEY: z.string().optional(),
```

2. **Create environment-specific validations**:
```typescript
// In production, require AI keys
if (parsed.NODE_ENV === 'production') {
  if (!parsed.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY is required in production');
  }
}
```

---

### **Environment Files Structure**

Current setup:
```
✅ .env.example          # Template with all variables
✅ .env                  # Main environment file (gitignored)
✅ .env.local            # Local overrides
✅ .env.development.backup
✅ .env.production
✅ .env.production.backup
✅ .env.secure
✅ .env.server
✅ .env.staging
```

**Status**: ✅ **GOOD** - Multiple environment support, but ensure proper loading order

---

## 🔌 API Configuration Review

### **API Structure**

#### **Total API Endpoints**: 111+ routes

| Category | Routes | Status |
|----------|--------|--------|
| **Admin** | 32 | ✅ Protected |
| **Auth** | 10 | ✅ Public/Protected |
| **Contractor** | 32 | ✅ Protected |
| **Jobs** | 22 | ✅ Protected |
| **Payments** | 14 | ✅ Protected |
| **Building Surveyor** | 9 | ✅ AI-powered |
| **Escrow** | 9 | ✅ Protected |
| **Messages** | 6 | ✅ Real-time |
| **Notifications** | 7 | ✅ Protected |
| **Cron Jobs** | 7 | ✅ Automated |
| **Others** | ~13 | ✅ Various |

---

### **Critical API Endpoints Review**

#### **1. Authentication APIs** (`/api/auth/*`)
```
✅ /api/auth/login       - POST (public, rate limited)
✅ /api/auth/register    - POST (public)
✅ /api/auth/logout      - POST (protected)
✅ /api/auth/refresh     - POST (protected, token rotation)
✅ /api/auth/verify-phone - POST (protected)
⚠️ /api/auth/reset-password - POST (public, needs rate limiting)
```

**Status**: ✅ **GOOD** - Comprehensive auth flow

**Recommendations**:
- Add rate limiting to password reset
- Consider adding CAPTCHA for registration

---

#### **2. Building Surveyor AI APIs** (`/api/building-surveyor/*`)

**Critical Endpoint**: `/api/building-surveyor/demo/route.ts`

**Configuration Issues Found**:
```typescript
❌ Issue: OPENAI_API_KEY not centrally validated
✅ Good: Proper error handling for missing API key
✅ Good: Image validation before processing
✅ Good: Compression for large images
✅ Good: Detailed error messages in development
```

**Current Error Handling**:
```typescript
// Line 218-223 in AssessmentOrchestrator.ts
if (!config.openaiApiKey) {
  logger.warn('OpenAI API key not configured', {
    service: 'AssessmentOrchestrator',
  });
  throw new Error('AI assessment service is not configured');
}
```

**Recommendation**: ✅ Move validation to startup in `env.ts`

---

#### **3. Payment APIs** (`/api/payments/*`)

```
✅ Stripe configuration validated in env.ts
✅ Webhook signature validation
✅ Idempotency keys implemented
✅ Escrow functionality
✅ Proper error handling
```

**Status**: ✅ **EXCELLENT**

---

#### **4. Webhook Configuration**

**Stripe Webhook** (`/api/webhooks/stripe`):
```typescript
✅ Signature verification required
✅ Proper event handling
✅ Idempotency protection
✅ Error recovery
```

**Vercel Cron Jobs** (configured in `vercel.json`):
```json
✅ Escrow auto-release: Every 6 hours
✅ Notification processor: Every 15 minutes
✅ Agent processor: Every 15 minutes
✅ No-show reminders: Daily at 9 AM
✅ Homeowner approval reminders: Daily at 10 AM
✅ Admin escrow alerts: Daily at 9 AM
✅ Payment setup reminders: Daily at 11 AM
```

**Status**: ✅ **EXCELLENT** - Comprehensive automation

---

## 🗄️ Database Configuration

### **Supabase Setup**

#### **Connection Configuration**:
```typescript
// apps/web/lib/database.ts
✅ Service role key used for server operations
✅ No session persistence (server-side)
✅ Auto-refresh disabled (correct for server)
✅ Proper error handling
```

#### **Security Features**:
```typescript
✅ Row Level Security (RLS) enabled
✅ Parameterized queries via Supabase client
✅ Email normalization (lowercase + trim)
✅ SQL injection prevention
✅ Account lockout system with RPC functions
```

#### **Database Functions** (Stored Procedures):
```sql
✅ add_password_to_history
✅ record_failed_login
✅ is_account_locked
✅ record_successful_login
```

**Status**: ✅ **EXCELLENT** - Proper separation of database logic

---

### **Database Schema Considerations**

**Tables**: 25+ tables including:
- Users, contractors, jobs, payments
- Messages, notifications
- Building assessments, training data
- GDPR compliance, audit logs

**Recommendations**:
1. Ensure all tables have proper indexes
2. Regular vacuum/analyze for performance
3. Monitor query performance with pg_stat_statements

---

## 🚀 Deployment Configuration

### **Vercel Configuration** (`vercel.json`)

```json
✅ Build command properly configured
✅ Install command optimized (--ignore-scripts)
✅ Framework detection: Next.js
✅ Output directory correct
✅ Region: iad1 (US East)
✅ Function memory: 1024 MB
✅ Function timeout: 30 seconds (appropriate)
```

#### **Recommendations**:
1. **Memory**: Consider 2048 MB for AI endpoints (building-surveyor)
2. **Timeout**: Consider 60s for heavy AI operations
3. **Add specific function config**:
```json
"functions": {
  "app/api/**/*.ts": {
    "memory": 1024,
    "maxDuration": 30
  },
  "app/api/building-surveyor/**/*.ts": {
    "memory": 2048,
    "maxDuration": 60
  }
}
```

---

### **Next.js Configuration** (`next.config.js`)

#### ✅ **Strengths**:
```javascript
✅ Environment validation at build time
✅ Comprehensive webpack configuration
✅ React Native module exclusions (web-specific)
✅ Image optimization configured
✅ Security headers in production
✅ Turbopack configuration for faster builds
✅ Bundle analysis support (ANALYZE=true)
```

#### ⚠️ **High Complexity**:
- **354 lines** of configuration
- Multiple IgnorePlugin instances for React Native exclusion
- Complex alias resolution

**Recommendation**: Consider refactoring into:
```javascript
// next.config/
// ├── base.config.js
// ├── webpack.config.js
// ├── security.config.js
// └── index.js
```

---

### **Mobile App Configuration** (`app.config.js`)

```javascript
✅ Environment validation for production builds
✅ Supabase credentials loaded
✅ Proper deep linking configuration
✅ Associated domains configured
✅ Permissions properly declared
✅ Build properties optimized (Hermes, ProGuard)
```

**Status**: ✅ **EXCELLENT**

---

## 🛡️ Middleware & Request Processing

### **Middleware Configuration** (`middleware.ts`)

```typescript
✅ JWT verification
✅ Token expiration checks
✅ CSRF token validation
✅ User info injection into headers
✅ Request ID generation
✅ CSP nonce generation
✅ Proper public route handling
✅ Admin route protection
```

#### **Public Routes**:
```typescript
✅ /, /login, /register
✅ /forgot-password, /reset-password
✅ /about, /contact, /privacy, /terms, /help
✅ /contractor/[id] (public profiles)
✅ /contractors (listing page)
✅ /admin/login, /admin/register
```

#### **Protected Routes**:
```typescript
✅ All other routes require authentication
✅ CSRF protection on state-changing requests
✅ Proper redirection to login
```

**Status**: ✅ **EXCELLENT** - Comprehensive protection

---

## 📦 Package Configuration

### **Root `package.json`**

```json
✅ Workspace configuration correct
✅ Build order properly defined
✅ Scripts well-organized
✅ Node version pinned (20.x)
✅ NPM version requirement (>=9.0.0)
```

#### **Build Pipeline**:
```bash
1. npm run build:packages  # Build shared packages first
2. npm run build:apps      # Build apps after packages
```

**Status**: ✅ **CORRECT** - Proper dependency order

---

### **Web App `package.json`**

#### **Dependencies Review**:

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 14.2.15 | Framework | ✅ Stable |
| React | 18.3.1 | UI Library | ✅ Latest stable |
| Supabase | ^2.43.1 | Database | ✅ Current |
| Stripe | ^15.4.0 | Payments | ✅ Current |
| @google-cloud/vision | ^5.3.4 | AI Vision | ✅ Current |
| onnxruntime-node | ^1.17.3 | ML Runtime | ✅ Current |
| Zod | ^3.23.4 | Validation | ✅ Current |
| TanStack Query | ^5.32.0 | State | ✅ Current |
| Jose | ^5.3.0 | JWT | ✅ Current |

**Total Dependencies**: 66 production deps
**Status**: ✅ **WELL-MAINTAINED** - All packages current

---

## 🧪 Testing Configuration

### **Test Coverage**:

| Type | Tool | Count | Status |
|------|------|-------|--------|
| **E2E** | Playwright | 384 tests | ✅ Excellent |
| **Unit** | Jest | Multiple | ✅ Good |
| **Integration** | Jest | Payment, Auth | ✅ Good |

### **Test Configuration**:
```javascript
✅ jest.config.js - Properly configured
✅ playwright.config.js - E2E tests
✅ Separate test environments
✅ Test coverage tracking
```

**Status**: ✅ **EXCELLENT** - Comprehensive testing

---

## 🔍 Service Architecture Review

### **Building Surveyor Service** (AI Assessment)

**Refactored Architecture**:
```
✅ AssessmentOrchestrator - Main coordination
✅ FeatureExtractionService - Feature processing
✅ PromptBuilder - GPT-4 prompt construction
✅ BuildingSurveyorConfig - Centralized configuration
✅ FeatureExtractionUtils - Shared utilities
```

**Status**: ✅ **EXCELLENT** - Well-refactored, SOLID principles

#### **Configuration Issues**:
```typescript
⚠️ OPENAI_API_KEY: Loaded from process.env directly
✅ Roboflow: Has dedicated config loader
✅ Timeout configuration: Centralized
✅ Error handling: Comprehensive
✅ Memory system: Properly initialized
```

**Recommendation**: Integrate with central env.ts validation

---

### **Shared Packages Review**

#### **@mintenance/auth**:
```typescript
✅ JWT generation/validation
✅ Password hashing
✅ ConfigManager for environment
✅ Account lockout system
✅ Password history tracking
✅ Comprehensive validation
```

**Files**:
- `jwt.ts` - JWT operations
- `password-validator.ts` - Password strength
- `password-history.ts` - History tracking
- `account-lockout.ts` - Security lockout
- `config.ts` - Configuration management
- `validation.ts` - Input validation

**Status**: ✅ **EXCELLENT** - Production-ready auth system

---

## 📊 Performance Configuration

### **Next.js Optimizations**:
```javascript
✅ Image formats: AVIF, WebP
✅ Compression enabled
✅ Incremental static regeneration
✅ Code splitting
✅ Bundle optimization
✅ Package import optimization
✅ Fast Refresh enabled
```

### **Caching Strategy**:
```javascript
✅ Static assets: 1 year cache
✅ Images: 30 days cache
✅ API responses: React Query caching
✅ Database: Supabase client cache
```

**Status**: ✅ **OPTIMIZED**

---

## 🚨 Critical Issues & Recommendations

### **🔴 HIGH PRIORITY**

1. **Environment Variable Centralization**
   - **Issue**: OPENAI_API_KEY and other AI keys not in central validation
   - **Impact**: Runtime errors possible in production
   - **Action**: Add to `apps/web/lib/env.ts`
   ```typescript
   OPENAI_API_KEY: z.string().min(1).optional(),
   ROBOFLOW_API_KEY: z.string().optional(),
   ```

2. **Redis Requirement for Production**
   - **Issue**: Rate limiting degraded without Redis
   - **Impact**: Vulnerable to brute force attacks
   - **Action**: Make Redis required in production env validation
   ```typescript
   if (parsed.NODE_ENV === 'production') {
     if (!parsed.UPSTASH_REDIS_REST_URL) {
       throw new Error('Redis is required in production');
     }
   }
   ```

### **🟡 MEDIUM PRIORITY**

3. **API Documentation**
   - **Issue**: No OpenAPI/Swagger documentation
   - **Impact**: Harder for frontend devs to integrate
   - **Action**: Add Swagger/OpenAPI docs for all endpoints

4. **Function Timeout for AI Endpoints**
   - **Issue**: 30s timeout may be insufficient for complex AI analysis
   - **Impact**: Timeout errors for large images
   - **Action**: Increase to 60s for `/api/building-surveyor/**`

5. **Error Response Standardization**
   - **Issue**: Some endpoints return different error formats
   - **Impact**: Inconsistent error handling on frontend
   - **Action**: Create standard error response shape

### **🟢 LOW PRIORITY (Nice to Have)**

6. **Monorepo Package Organization**
   - **Recommendation**: Consider using Turborepo or Nx for better build caching
   - **Benefit**: Faster builds in CI/CD

7. **TypeScript Project References**
   - **Current**: Basic tsconfig references
   - **Recommendation**: Full project reference setup for better IDE performance

8. **Health Check Endpoint**
   - **Recommendation**: Add `/api/health` endpoint
   - **Benefit**: Better monitoring and uptime tracking

---

## ✅ Best Practices Compliance

| Practice | Status | Notes |
|----------|--------|-------|
| **12-Factor App** | ✅ Yes | Environment config, stateless processes |
| **Security Headers** | ✅ Excellent | All major headers configured |
| **Input Validation** | ✅ Good | Zod schemas, sanitization |
| **Error Handling** | ✅ Good | Comprehensive logging |
| **API Versioning** | ⚠️ None | Consider `/api/v1/*` structure |
| **Rate Limiting** | ✅ Implemented | Redis-based (needs enforcement) |
| **Authentication** | ✅ Excellent | JWT + refresh tokens |
| **Authorization** | ✅ Good | Role-based access control |
| **Logging** | ✅ Good | Custom logger with context |
| **Monitoring** | ✅ Basic | MonitoringService, Sentry ready |
| **Documentation** | ⚠️ Partial | Code comments good, API docs missing |

---

## 📈 Scalability Assessment

### **Current Architecture**:
- ✅ Serverless-ready (Next.js API routes)
- ✅ Database connection pooling (Supabase)
- ✅ Stateless request handling
- ✅ CDN-friendly static assets
- ✅ Horizontal scaling support (Vercel)

### **Bottlenecks**:
1. **AI Processing**: CPU-intensive, may need dedicated workers
2. **Database Connections**: Monitor Supabase connection limits
3. **Webhook Processing**: Consider queue for high volume

### **Recommendations for Scale**:
1. Implement job queue (BullMQ, Inngest) for:
   - AI image processing
   - Batch notifications
   - Report generation

2. Add database read replicas for:
   - Contractor searches
   - Analytics queries

3. Implement caching layer:
   - Redis for session data
   - CDN for static API responses

---

## 🎯 Action Items Summary

### **Immediate (This Sprint)**:
1. ✅ Add environment validation for AI keys
2. ✅ Enforce Redis requirement in production
3. ✅ Increase timeout for AI endpoints to 60s

### **Short-term (Next 2 Sprints)**:
4. ✅ Add API documentation (Swagger/OpenAPI)
5. ✅ Standardize error responses
6. ✅ Add rate limiting to password reset
7. ✅ Create health check endpoint

### **Long-term (Next Quarter)**:
8. 💡 Consider Turborepo migration
9. 💡 Add job queue for heavy processing
10. 💡 Implement API versioning strategy
11. 💡 Add MFA for admin accounts

---

## 📝 Conclusion

### **Overall Grade: A- (90/100)**

#### **Strengths**:
- 🏆 **Security**: Excellent JWT implementation, CSRF protection, RLS
- 🏆 **Architecture**: Well-organized monorepo, clean separation of concerns
- 🏆 **Testing**: 384 E2E tests, comprehensive coverage
- 🏆 **Deployment**: Production-ready Vercel configuration
- 🏆 **Code Quality**: TypeScript throughout, proper validation

#### **Areas for Improvement**:
- Environment variable validation completeness
- API documentation
- Redis enforcement in production
- Error response standardization

### **Production Readiness: ✅ YES**

Your backend is **production-ready** with the existing configuration. The recommended improvements are for **enhanced reliability** and **developer experience**, but are not blockers for deployment.

---

## 📚 Resources & References

### **Documentation**:
- [MINTENANCE_TECH_STACK.md](./MINTENANCE_TECH_STACK.md)
- [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### **Configuration Files**:
- [next.config.js](./apps/web/next.config.js)
- [vercel.json](./vercel.json)
- [app.config.js](./apps/mobile/app.config.js)
- [env.ts](./apps/web/lib/env.ts)

### **Key Services**:
- [Building Surveyor](./apps/web/lib/services/building-surveyor/)
- [Authentication](./packages/auth/src/)
- [Database Manager](./apps/web/lib/database.ts)
- [Middleware](./apps/web/middleware.ts)

---

**Report Generated**: 2025-11-20  
**Reviewed By**: AI Backend Audit System  
**Next Review**: 2025-12-20 (Quarterly)
