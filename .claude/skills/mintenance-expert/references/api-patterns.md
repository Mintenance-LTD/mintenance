# Mintenance API Patterns Reference

## withApiHandler - The Standard API Wrapper

**Location**: `apps/web/lib/api/with-api-handler.ts` (179 lines)

Every API route (except cron jobs and Stripe webhooks) MUST use this wrapper.

### Configuration

```typescript
interface HandlerConfig {
  rateLimit?: RateLimitConfig | false;    // Default: 30 req/min
  auth?: boolean;                          // Default: true
  csrf?: boolean;                          // Default: auto (ON for POST/PUT/PATCH/DELETE without Bearer)
  roles?: Array<'homeowner' | 'contractor' | 'admin'>;
}
```

### Execution Flow
1. **Rate Limiting** - Configurable, default 30 req/min per IP+URL
2. **Bearer Token Detection** - Mobile clients send `Authorization: Bearer <jwt>`; skips CSRF for Bearer tokens
3. **CSRF Validation** - Double-submit cookie pattern for browser requests (mutations only)
4. **Route Params Resolution** - Resolves Next.js App Router's Promise-based params
5. **Authentication** - Cookie-first, Bearer token fallback
6. **Role Check** - Validates user role against allowed roles
7. **Error Handling** - Catches all errors, maps to HTTP status codes

### Usage Examples

**Standard authenticated route:**
```typescript
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler({}, async (request, { user }) => {
  const data = await fetchData(user.id);
  return NextResponse.json({ data });
});
```

**Role-restricted route:**
```typescript
export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user }) => {
    // Only homeowners can access
    const body = await request.json();
    return NextResponse.json({ created: true }, { status: 201 });
  }
);
```

**Public route (no auth):**
```typescript
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 60, windowMs: 60000 } },
  async (request) => {
    return NextResponse.json({ stats: await getPublicStats() });
  }
);
```

**Custom rate limit:**
```typescript
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5, windowMs: 3600000 } }, // 5 per hour
  async (request, { user }) => { /* ... */ }
);
```

### The handler callback receives:
```typescript
async (request: NextRequest, context: {
  user: { id: string; email: string; role: 'homeowner' | 'contractor' | 'admin' };
  params: Record<string, string>;  // Already resolved, no await needed
}) => NextResponse
```

## withCronHandler - Cron Job Wrapper

**Location**: `apps/web/lib/cron-handler.ts` (227 lines)

All cron jobs in `apps/web/app/api/cron/` use this.

### Features
- Rate limiting: 1 req/min (prevents abuse)
- Cron secret auth via `requireCronAuth()`
- Execution logging to `cron_job_runs` table
- Duration tracking
- Error logging with full error details

### Usage
```typescript
import { withCronHandler } from '@/lib/cron-handler';

export const GET = withCronHandler('payment-reconciliation', async () => {
  const result = await PaymentReconciliationService.reconcile();
  return { processed: result.count, errors: result.errors };
});
```

### Existing Cron Jobs
- `admin-alerts` - Smart admin alerts (every 6 hours)
- `admin-escrow-alerts` - Overdue escrow notifications
- `agent-processor` - AI agent task processing
- `payment-reconciliation` - Payment sync with Stripe
- `payment-setup-reminders` - Contractor payment setup reminders

## Error Classes

**Location**: `apps/web/lib/errors/`

```typescript
import { BadRequestError, UnauthorizedError, ForbiddenError,
         NotFoundError, RateLimitError } from '@/lib/errors';

// Usage in handlers:
throw new BadRequestError('Invalid job ID');           // 400
throw new UnauthorizedError('Token expired');           // 401
throw new ForbiddenError('Not your job');               // 403
throw new NotFoundError('Job not found');               // 404
throw new RateLimitError('Too many requests');           // 429
```

`withApiHandler` catches these and returns proper JSON responses with the correct HTTP status.

## Request Validation

Always validate request bodies with Zod:

```typescript
import { z } from 'zod';

const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  category: z.string(),
  budget_min: z.number().positive(),
  budget_max: z.number().positive(),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.issues);
    }
    // Use parsed.data (fully typed)
  }
);
```

## Response Formatting

```typescript
// Success
return NextResponse.json({ data: result });
return NextResponse.json({ data: created }, { status: 201 });

// Pagination
return NextResponse.json({ data: items, nextCursor, totalCount });

// Empty success
return NextResponse.json({ success: true });
```

## Authentication Flow

### Middleware (middleware.ts, 771 lines)

**Cookie names:**
- Dev: `mintenance-auth`, `csrf-token`
- Prod: `__Host-mintenance-auth`, `__Host-csrf-token`

**JWT validation flow:**
1. Check auth cookie
2. Fallback: Supabase auth cookie (`sb-<ref>-auth-token`)
3. Verify JWT signature
4. Check token blacklist (Redis)
5. Check expiration
6. Session timeouts: 12h absolute, 30min idle
7. Set user info headers: `x-user-id`, `x-user-email`, `x-user-role`, `x-request-id`

**CSRF pattern:**
- Double-submit cookie (httpOnly: false)
- Client reads cookie, sends in `x-csrf-token` header
- Server compares header vs cookie
- Skipped for Bearer token auth (mobile) and GET requests

### Auth in API Routes (via withApiHandler)

The `user` object in the handler callback is extracted from:
1. `getCurrentUserFromCookies()` - reads `x-user-id`, `x-user-email`, `x-user-role` headers set by middleware
2. `getCurrentUserFromBearerToken(request)` - fallback for mobile clients

## API Route Directory Structure

```
apps/web/app/api/
├── account/              # Profile & account management
├── admin/               # Admin operations
├── auth/                # Login, register, password reset, session
├── bids/                # Bid management
├── building-surveyor/   # AI property assessment
├── contracts/           # Contract management & signing
├── cron/                # Background jobs (withCronHandler)
├── disputes/            # Payment disputes
├── escrow/              # Escrow management & release
├── jobs/                # Job CRUD and sub-resources
│   └── [id]/
│       ├── bids/        # Job-specific bids
│       ├── photos/      # Before/after photos
│       ├── start/       # Start job
│       ├── confirm-completion/
│       ├── request-changes/
│       ├── payment-intent/
│       └── confirm-payment/
├── messages/            # Direct messaging
├── notifications/       # Notifications
├── payments/            # Payment processing
│   ├── release-escrow/
│   └── process-job-payment/
├── properties/          # Property management
├── webhooks/
│   └── stripe/          # Stripe webhook (NO withApiHandler - needs raw body)
└── ...
```

## Adding a New API Route

1. Create `route.ts` in appropriate `app/api/` subdirectory
2. Wrap with `withApiHandler()` (or `withCronHandler` for cron)
3. Define Zod schema for request validation
4. Use `serverSupabase` for database queries
5. Use typed errors for error cases
6. Return `NextResponse.json()`

```typescript
// apps/web/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });

export const POST = withApiHandler(
  { roles: ['admin'] },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new BadRequestError('Invalid input');

    const { data, error } = await serverSupabase
      .from('example_table')
      .insert({ name: parsed.data.name, created_by: user.id })
      .select()
      .single();

    if (error) throw new BadRequestError(error.message);
    return NextResponse.json({ data }, { status: 201 });
  }
);
```
