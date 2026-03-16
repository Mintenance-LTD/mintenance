# Mintenance Shared Packages Reference

## Overview

8 packages in `packages/` directory, shared between web (`apps/web`) and mobile (`apps/mobile`).

## packages/types

**Purpose**: Cross-platform TypeScript interfaces for all entities.

**Modules exported:**
| Module | Key Types |
|--------|-----------|
| `jobs.ts` | `Job`, `Bid`, `Review`, `ContractorSkill`, `JobPhoto` |
| `payments.ts` | `PaymentIntent`, `EscrowTransaction`, `EscrowStatus`, `PaymentStatus` |
| `contractor.ts` | `ContractorCertification`, `LicenseVerification`, `InsuranceVerification` |
| `contracts.ts` | `Contract`, `ContractStatus`, `Dispute`, `DisputeStatus` |
| `auth.ts` | `User`, `AuthResult`, `LoginCredentials`, `RegisterData`, `JWTPayload` |
| `messaging.ts` | `Message`, `MessageThread` |
| `notifications.ts` | `Notification`, `NotificationType` |
| `location.ts` | `Location`, `Coordinates` |
| `meetings.ts` | `Meeting`, `MeetingStatus` |
| `business.ts` | `Company`, `BusinessProfile` |
| `features.ts` | `FeatureFlag`, `FeatureGate` |
| `api.ts` | `ApiResponse`, `PaginatedResponse`, `ApiError` |
| `google-places.ts` | `PlacePrediction`, `PlaceDetails` |

**Key interfaces:**
```typescript
interface Job {
  id: string; title: string; description: string;
  homeowner_id: string; contractor_id?: string;
  status: 'draft' | 'posted' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget_min?: number; budget_max?: number;
  category?: string; urgency?: 'low' | 'medium' | 'high' | 'emergency';
  location: string | Record<string, unknown>; // JSONB
  images?: string[]; metadata?: Record<string, unknown>;
  bids?: Bid[]; homeowner?: {...}; contractor?: {...};
}

interface Bid {
  id: string; job_id: string; contractor_id: string;
  amount: number; message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  estimated_duration_days?: number; materials_included?: boolean; warranty_months?: number;
}

type EscrowStatus = 'pending' | 'held' | 'release_pending' | 'released' | 'refunded'
  | 'awaiting_homeowner_approval' | 'pending_review' | 'failed' | 'cancelled';
```

**Usage:**
```typescript
import type { Job, Bid, Review, ContractorProfile } from '@mintenance/types';
import type { EscrowTransaction, EscrowStatus } from '@mintenance/types';
```

## packages/shared

**Purpose**: Shared utilities, formatters, constants, business rules.

**Exports:**
```typescript
// Utilities
export { logger } from './logger';
export { formatDate, formatCurrency, formatPhone } from './formatters';
export { debounce, throttle, hashString } from './utils';
export { generateId, sanitizeString } from './helpers';

// Material types and utilities
export type { Material, MaterialCategory, MaterialUnit, ... };
export { formatMaterialPrice, calculateMaterialCost, ... };

// Property types
export type { Property, PropertyType, PropertyWithStats, ... };
```

**Constants (critical for business logic):**
```typescript
export const APP_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  PAGINATION_SIZE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export const BUSINESS_RULES = {
  BUDGET_REQUIRES_PHOTOS_THRESHOLD: 500,  // GBP
  MAX_JOBS_PER_HOUR: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION_MINUTES: 15,
  MAX_PASSWORD_RESETS_PER_HOUR: 3,
  DEFAULT_SEARCH_RADIUS_KM: 50,
  MAX_PHOTOS_PER_JOB: 10,
  MAX_SKILLS_PER_CONTRACTOR: 20,
  REMEMBER_ME_DURATION_DAYS: 30,
  DEFAULT_SESSION_DURATION_HOURS: 24,
};

export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 1000,
  AI_ANALYSIS_PER_MINUTE: 5,
  AI_USER_REQUESTS_PER_MINUTE: 3,
  WEBHOOK_REQUESTS_PER_MINUTE: 100,
  MAX_FALLBACK_ENTRIES: 1000,
};

export const TIME_MS = { SECOND: 1000, MINUTE: 60000, HOUR: 3600000, DAY: 86400000 };
```

## packages/security

**Purpose**: Unified sanitization and security across all platforms. Auto-detects web/server/mobile.

**Main API (`sanitize` object):**

| Method | Purpose | Example |
|--------|---------|---------|
| `sanitize.html(input, options?)` | HTML sanitization (DOMPurify on web, regex on mobile) | `sanitize.html(userHtml)` |
| `sanitize.text(input, maxLength?)` | Strip HTML, normalize whitespace | `sanitize.text(title, 200)` |
| `sanitize.sql(input)` | Basic SQL injection protection | `sanitize.sql(searchTerm)` |
| `sanitize.sqlAdvanced(input)` | Detailed SQL threat analysis → `SqlScanResult` | `sanitize.sqlAdvanced(query)` |
| `sanitize.email(input)` | Email address validation/sanitization | `sanitize.email(rawEmail)` |
| `sanitize.phone(input)` | Phone number (10-14 digits, international) | `sanitize.phone(rawPhone)` |
| `sanitize.url(input)` | URL sanitization | `sanitize.url(rawUrl)` |
| `sanitize.fileName(input)` | File name sanitization | `sanitize.fileName(upload.name)` |
| `sanitize.numeric(input, opts?)` | Number with min/max/decimals | `sanitize.numeric(price, {min:0})` |
| `sanitize.jobDescription(input)` | Job description content | `sanitize.jobDescription(desc)` |
| `sanitize.contractorBio(input)` | Contractor bio content | `sanitize.contractorBio(bio)` |
| `sanitize.message(input)` | Chat message content | `sanitize.message(msg)` |
| `sanitize.searchQuery(input)` | Search query sanitization | `sanitize.searchQuery(q)` |
| `sanitize.address(input)` | Address sanitization | `sanitize.address(addr)` |
| `sanitize.companyName(input)` | Company name | `sanitize.companyName(name)` |
| `sanitize.personName(input)` | Person name | `sanitize.personName(name)` |
| `sanitize.reviewContent(input)` | Review text | `sanitize.reviewContent(review)` |
| `sanitize.invoiceDescription(input)` | Invoice description | |
| `sanitize.milestoneTitle(input)` | Milestone title | |
| `sanitize.tag(input)` | Tag sanitization | |
| `sanitize.jsonString(input)` | JSON string | |
| `sanitize.apiKey(input)` | API key validation | |
| `sanitize.webhookUrl(input)` | Webhook URL | |
| `sanitize.createILIKEPattern(term, pattern)` | PostgreSQL ILIKE pattern | |
| `sanitize.isValidSearchTerm(input, maxLen?)` | Search term validation | |
| `sanitize.escapeSQLWildcards(input)` | Escape `%` and `_` | |

**Mobile-only methods** (added on React Native):
- `sanitize.amount(input)` - Amount (0-1M, 2 decimals)
- `sanitize.rating(input)` - Rating (1-5, 1 decimal)
- `sanitize.object(obj, fieldSanitizers?)` - Recursive object sanitization
- `sanitize.forReactNative(input)` - React Native specific

**Rate Limiters:**
```typescript
import { SanitizationRateLimiter, SqlQueryRateLimiter, AuthRateLimiter, RateLimiterFactory } from '@mintenance/security';
const limiter = RateLimiterFactory.getInstance('sanitization' | 'sql' | 'auth');
```

**Utility functions:**
```typescript
import { utils } from '@mintenance/security';
utils.getPlatform()       // 'web' | 'server' | 'mobile'
utils.isProduction()      // boolean
utils.sanitizeFields(data, { name: 'text', email: 'email' })  // Batch sanitize
utils.logSecurityThreat('xss', details, { userId, ip, endpoint })
utils.containsXSSPatterns(input)  // boolean
```

## packages/auth

**Purpose**: Authentication utilities (JWT, password, sessions, lockout).

**Exports:**
```typescript
// Validation
export { validateEmail, validatePassword, hashPassword, comparePassword } from './validation';

// JWT
export { generateJWT, verifyJWT, decodeJWTPayload, generateRefreshToken, hashRefreshToken, generateTokenPair } from './jwt';

// Configuration
export { ConfigManager } from './config';  // Singleton: ConfigManager.getInstance()

// Security managers
export { PasswordValidator } from './password-validator';
export { PasswordHistoryManager } from './password-history';
export { AccountLockoutManager } from './account-lockout';
export { SessionValidator } from './session-validator';

// Server-only (uses Node.js crypto + argon2)
export { checkPasswordBreach, validatePasswordStrength, generateSecurePassword, passwordPolicy } from './password-security';
```

**ConfigManager** (important for testing):
```typescript
const config = ConfigManager.getInstance();
const value = config.get('KEY');           // Returns undefined if missing
const required = config.getRequired('KEY'); // Throws if missing
```

**Testing mock pattern:**
```typescript
vi.mock('@mintenance/auth', () => ({
  ConfigManager: { getInstance: () => ({ get: mockGet, getRequired: mockGetRequired }) },
}));
```

## packages/shared-ui

**Purpose**: Cross-platform UI components. Web uses `.web.tsx` variants; mobile uses `.native.tsx` variants.

**Components:**
| Component | Web Export | Props |
|-----------|-----------|-------|
| `Button` | `Button.web.tsx` | `WebButtonProps`: variant, size, loading, disabled, onClick |
| `Card` | `Card.web.tsx` | `WebCardProps`: variant, padding + `CardHeader/Footer/Title/Description/Content` |
| `Input` | `Input.web.tsx` | `WebInputProps`: type, size, error, label, placeholder |
| `Badge` | `Badge.web.tsx` | `WebBadgeProps`: variant, size, label |
| `TextInput` | Legacy | Being migrated |
| `StatusBadge` | Shared | status, label |
| `MetricCard` | Shared | title, value, change, icon |
| `DataTable` | Shared | columns, data, sortable, filterable |
| `CircularProgress` | Shared | value, size, color |
| `Icon` | Shared | name, size, color |

**Usage:**
```typescript
// Web
import { Button, Card, Input, Badge } from '@mintenance/shared-ui';
// Mobile (auto-resolves to .native.tsx)
import { Button, Card } from '@mintenance/shared-ui';
```

**Platform resolution:**
- Web builds import `.web.tsx` variants directly (no unified wrapper to avoid React Native bundling)
- Mobile builds use `.native.tsx` variants via React Native module resolution

## packages/design-tokens

**Purpose**: Design tokens for consistent styling across platforms.

**Token categories:**
| Category | Examples |
|----------|---------|
| `colors` | Primary, secondary, success, error, warning, info, neutral scales |
| `typography` | Font families, sizes, weights, line heights |
| `spacing` | Scale from 0-20 (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96...) |
| `shadows` | sm, md, lg, xl elevation shadows |
| `borderRadius` | none, sm, md, lg, xl, full |
| `gradients` | Primary, secondary, success gradients |
| `effects` | Transitions, animations, opacity values |

**Usage:**
```typescript
import { colors, spacing, typography, designTokens } from '@mintenance/design-tokens';
// Platform-specific adapters
import { webTokens } from '@mintenance/design-tokens/adapters/web';
import { mobileTokens } from '@mintenance/design-tokens/adapters/mobile';
```

## packages/ai-core

**Purpose**: AI/ML service integration.

**Exports:**
```typescript
export * from './types';                          // AI type definitions
export { UnifiedAIService } from './services/UnifiedAIService';  // Main AI service
```

Used for: damage detection, pricing recommendations, job matching, image analysis.

## packages/api-client

**Purpose**: API client utilities for HTTP communication.

**Exports:**
```typescript
export { ApiClient } from './ApiClient';                    // HTTP client with auth
export { ErrorHandler } from './ErrorHandler';              // Error handling utilities
export { SupabaseClientWrapper } from './SupabaseClientWrapper';  // Supabase wrapper

export type { ApiClientConfig, RequestOptions } from './ApiClient';
export type { SupabaseClientConfig } from './SupabaseClientWrapper';
```

Used primarily by the mobile app for API communication with Bearer token auth.

## Import Patterns

```typescript
// Types (used everywhere)
import type { Job, Bid, EscrowTransaction } from '@mintenance/types';

// Shared utilities (used everywhere)
import { logger, formatCurrency, BUSINESS_RULES } from '@mintenance/shared';

// Security (used in API routes and forms)
import { sanitize } from '@mintenance/security';

// Auth (used in API routes and middleware)
import { verifyJWT, ConfigManager } from '@mintenance/auth';

// UI components (used in React components)
import { Button, Card, Input } from '@mintenance/shared-ui';

// Design tokens (used in styling)
import { colors, spacing } from '@mintenance/design-tokens';
```
