# API Routes Skill - Next.js Secure API Development

## Skill Overview
Expert knowledge for building secure, performant Next.js API routes for the Mintenance platform. Covers authentication, validation, error handling, and integration with Supabase.

### User Flow Reference
For complete context on how these APIs fit into the user journey, see: [USER_INTERACTION_FLOW_COMPLETE.md](../../../USER_INTERACTION_FLOW_COMPLETE.md)

## Critical Workflow API Endpoints

### Homeowner Job Creation Flow

```typescript
// Step 1: Create Job (with AI analysis triggered automatically)
POST /api/jobs
Body: {
  title: "Fix leaking kitchen tap",
  description: "Tap has been dripping for a week...",
  photos: ["https://...photo1.jpg", "https://...photo2.jpg"],
  category: "plumbing",
  budget: 350,
  urgency: "medium",
  preferred_start_date: "2025-01-15"
}
// Triggers: Photo upload → AI damage assessment → Job posting → Contractor notifications

// Step 2: View Bids on Job
GET /api/jobs/{job_id}/bids
// Returns: All bids with contractor profiles, ratings, line items, portfolio

// Step 3: Accept Bid
POST /api/jobs/{job_id}/bids/{bid_id}/accept
// Triggers: Status change posted→assigned → Reject other bids → Notify contractor → Create contract

// Step 4: Confirm Work Completion
POST /api/jobs/{job_id}/confirm-completion
// Required before homeowner can make payment

// Step 5: Create Payment (Escrow)
POST /api/payments/create-intent
Body: { job_id, amount, contractor_id }
// Creates Stripe PaymentIntent with 7-day escrow hold
```

### Contractor Job Discovery Flow

```typescript
// Method 1: Map-based Discovery (Most Popular)
GET /api/contractor/discover/jobs
Query: ?latitude=51.5014&longitude=-0.1419&radius=10&categories=["plumbing"]
// Uses PostGIS ST_Distance for proximity search
// Returns jobs sorted by distance

// Method 2: Save/Unsave Jobs (Swipe Interface)
POST /api/contractor/saved-jobs
Body: { job_id }

GET /api/contractor/saved-jobs
// Returns contractor's saved jobs

// Submit Detailed Bid
POST /api/bids
Body: {
  job_id,
  bid_amount: 375,
  proposal_text: "15 years experience...",
  line_items: [
    { description: "Call-out", quantity: 1, unit_price: 50 },
    { description: "Labour", quantity: 2, unit_price: 80 }
  ],
  estimated_duration: 2,
  proposed_start_date: "2025-01-16",
  terms: "Payment due upon completion..."
}

// Start Work (Changes status)
PUT /api/jobs/{job_id}/start
// Changes status: assigned → in_progress

// Upload Progress Photos
POST /api/jobs/{job_id}/photos/before
POST /api/jobs/{job_id}/photos/after
// Stored in Supabase Storage: job-photos bucket

// Mark Work Complete
POST /api/jobs/{job_id}/complete
Body: { completion_notes: "Tap fixed, tested for 15 minutes..." }
// Changes status: in_progress → completed
// Homeowner receives notification to inspect and pay
```

### Review & Rating Flow

```typescript
// Submit Review (After payment, mutual reviews)
POST /api/reviews
Body: {
  job_id,
  rating: 5,
  comment: "Excellent work!",
  categories: {
    quality: 5,
    timeliness: 4,
    communication: 5,
    professionalism: 5,
    value: 5
  },
  photos: ["review_photo.jpg"]
}
// Triggers: Update contractor rating → Auto-add to portfolio if ≥4 stars

// Respond to Review (Contractor only)
POST /api/reviews/{review_id}/response
Body: { response_text: "Thank you! It was a pleasure..." }
```

### Escrow & Payment Flow

```typescript
// Automatic Escrow Release (Cron Job - runs daily at 2am)
GET /api/cron/release-escrow
Headers: { Authorization: "Bearer {CRON_SECRET}" }
// Finds escrow records ≥7 days old with no disputes
// Transfers funds to contractor via Stripe Connect

// Manual Release (Admin only)
POST /api/payments/release-escrow
Body: { escrow_id }

// Refund (Dispute resolution - Admin only)
POST /api/payments/refund
Body: { payment_intent_id, reason }
```

### Real-time Messaging

```typescript
// Send Message
POST /api/messages/send
Body: {
  job_id,
  receiver_id,
  content: "Can you confirm you'll bring replacement parts?",
  message_type: "text"
}
// Triggers: Supabase Realtime broadcast → Push notification (if offline)

// Get Conversation History
GET /api/messages/conversation/{job_id}
// Returns all messages for a job, ordered by timestamp
```

## Standard API Route Template

```typescript
// apps/web/app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/supabase-server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

// =====================================================
// INPUT VALIDATION SCHEMA
// =====================================================
const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  metadata: z.record(z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

// =====================================================
// GET - List/Retrieve Resources
// =====================================================
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication (no CSRF for GET)
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Query with RLS (automatic filtering by user_id)
    let query = serverSupabase
      .from('resources')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Optional filters
    if (id) query = query.eq('id', id);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[API] GET /api/feature error', { error, userId: user.id });
      throw error;
    }

    // 4. Success response with pagination metadata
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    logger.error('[API] GET /api/feature unhandled error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create New Resource
// =====================================================
export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection (REQUIRED for mutations)
    await requireCSRF(req);

    // 2. Authentication
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Rate Limiting (5 requests per 15 minutes)
    const identifier = user.id || req.headers.get('x-forwarded-for') || 'unknown';
    await checkRateLimit(identifier, 'create-resource');

    // 4. Parse and validate request body
    const body = await req.json();
    const validatedData = createSchema.parse(body);

    // 5. Business logic validation (if needed)
    // Example: Check subscription limits
    const { count } = await serverSupabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= 50 && user.subscription_tier === 'free') {
      return NextResponse.json(
        { error: 'Resource limit reached. Upgrade to create more.' },
        { status: 403 }
      );
    }

    // 6. Create resource with RLS
    const { data, error } = await serverSupabase
      .from('resources')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('[API] POST /api/feature create error', {
        error,
        userId: user.id,
        data: validatedData,
      });
      throw error;
    }

    logger.info('[API] Resource created', {
      resourceId: data.id,
      userId: user.id,
    });

    // 7. Success response (201 Created)
    return NextResponse.json(
      { data },
      { status: 201 }
    );

  } catch (error) {
    // Validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Rate limit errors
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // CSRF errors
    if (error instanceof Error && error.message.includes('CSRF')) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // Generic error
    logger.error('[API] POST /api/feature unhandled error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update Existing Resource
// =====================================================
export async function PATCH(req: NextRequest) {
  try {
    // 1. CSRF Protection
    await requireCSRF(req);

    // 2. Authentication
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Rate Limiting
    await checkRateLimit(user.id, 'update-resource');

    // 4. Parse and validate
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    const validatedUpdates = updateSchema.parse(updates);

    // 5. Check ownership (RLS will also check, but explicit is better)
    const { data: existing } = await serverSupabase
      .from('resources')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // 6. Update with RLS
    const { data, error } = await serverSupabase
      .from('resources')
      .update(validatedUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('[API] PATCH /api/feature update error', {
        error,
        resourceId: id,
        userId: user.id,
      });
      throw error;
    }

    logger.info('[API] Resource updated', {
      resourceId: id,
      userId: user.id,
    });

    // 7. Success response
    return NextResponse.json({ data });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('[API] PATCH /api/feature unhandled error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Remove Resource (Soft Delete)
// =====================================================
export async function DELETE(req: NextRequest) {
  try {
    // 1. CSRF Protection
    await requireCSRF(req);

    // 2. Authentication
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Rate Limiting
    await checkRateLimit(user.id, 'delete-resource');

    // 4. Get resource ID
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    // 5. Soft delete (set deleted_at)
    const { data, error } = await serverSupabase
      .from('resources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    logger.info('[API] Resource deleted', {
      resourceId: id,
      userId: user.id,
    });

    // 6. Success response (204 No Content or 200 with data)
    return NextResponse.json({ data });

  } catch (error) {
    logger.error('[API] DELETE /api/feature unhandled error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Common API Patterns

### Pattern 1: Dynamic Route Parameters

```typescript
// apps/web/app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id } = params;

  const { data, error } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
```

### Pattern 2: File Upload

```typescript
// apps/web/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    await requireCSRF(req);
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${user.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await serverSupabase.storage
      .from('job-attachments')
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = serverSupabase.storage
      .from('job-attachments')
      .getPublicUrl(filename);

    return NextResponse.json({
      data: {
        path: data.path,
        url: urlData.publicUrl,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Stripe Webhook

```typescript
// apps/web/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverSupabase } from '@/lib/supabase-server';
import { logger } from '@mintenance/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    logger.info('[Webhook] Stripe event received', {
      type: event.type,
      id: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await serverSupabase
          .from('escrow_payments')
          .update({ status: 'held' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await serverSupabase
          .from('escrow_payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;

        await serverSupabase
          .from('escrow_payments')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', charge.payment_intent as string);

        break;
      }

      default:
        logger.info('[Webhook] Unhandled event type', { type: event.type });
    }

    // Always return 200 to Stripe
    return NextResponse.json({ received: true });

  } catch (error) {
    logger.error('[Webhook] Stripe webhook error', error);

    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
```

### Pattern 4: Complex Query with Joins

```typescript
// apps/web/app/api/jobs/search/route.ts
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const status = searchParams.get('status');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '50'); // km

    // Complex query with joins
    let dbQuery = serverSupabase
      .from('jobs')
      .select(`
        *,
        homeowner:users!jobs_homeowner_id_fkey (
          id,
          name,
          avatar_url
        ),
        bids (
          id,
          amount,
          status,
          contractor:users!bids_contractor_id_fkey (
            id,
            name,
            avatar_url,
            avg_rating
          )
        )
      `)
      .eq('contractor_id', user.id)
      .is('deleted_at', null);

    // Text search
    if (query) {
      dbQuery = dbQuery.textSearch('search_vector', query);
    }

    // Status filter
    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    // Location filter (using PostGIS)
    if (lat && lng) {
      // This requires a custom PostgreSQL function
      dbQuery = dbQuery.rpc('jobs_within_radius', {
        lat,
        lng,
        radius_km: radius,
      });
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    return NextResponse.json({ data });

  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

### Pattern 5: Cron Job / Scheduled Task

```typescript
// apps/web/app/api/cron/auto-release-escrow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase-server';
import { logger } from '@mintenance/shared';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Verify this is being called by Vercel Cron
export async function GET(req: NextRequest) {
  try {
    // Verify authorization header (Vercel Cron secret)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[Cron] Auto-release escrow job started');

    // Find payments eligible for auto-release
    const { data: payments, error } = await serverSupabase
      .from('escrow_payments')
      .select(`
        *,
        job:jobs (
          id,
          status,
          contractor_id,
          homeowner_id
        )
      `)
      .eq('status', 'held')
      .lte('auto_release_at', new Date().toISOString())
      .limit(100);

    if (error) throw error;

    let released = 0;
    let failed = 0;

    // Process each payment
    for (const payment of payments || []) {
      try {
        // Release funds to contractor via Stripe
        await stripe.paymentIntents.capture(payment.stripe_payment_intent_id);

        // Update database
        await serverSupabase
          .from('escrow_payments')
          .update({
            status: 'released',
            released_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Create notification
        await serverSupabase.from('notifications').insert({
          user_id: payment.job.contractor_id,
          type: 'payment_released',
          title: 'Payment Released',
          message: `Payment of $${payment.contractor_amount} has been released.`,
          metadata: { job_id: payment.job.id },
        });

        released++;

      } catch (err) {
        logger.error('[Cron] Failed to release escrow', {
          paymentId: payment.id,
          error: err,
        });
        failed++;
      }
    }

    logger.info('[Cron] Auto-release escrow job completed', {
      total: payments?.length || 0,
      released,
      failed,
    });

    return NextResponse.json({
      success: true,
      total: payments?.length || 0,
      released,
      failed,
    });

  } catch (error) {
    logger.error('[Cron] Auto-release escrow job failed', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
```

## Security Checklist

### ✅ Required for ALL Mutating Routes (POST, PATCH, DELETE)

```typescript
// 1. CSRF Protection
await requireCSRF(req);

// 2. Authentication
const user = await getCurrentUserFromCookies();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 3. Rate Limiting
await checkRateLimit(user.id, 'action-type');

// 4. Input Validation
const schema = z.object({ /* ... */ });
const validatedData = schema.parse(body);

// 5. Authorization (check ownership/permissions)
// Either via RLS or explicit checks

// 6. Logging
logger.info('[API] Action performed', { userId: user.id });
```

### ✅ Required for ALL GET Routes

```typescript
// 1. Authentication (if data is private)
const user = await getCurrentUserFromCookies();

// 2. Query parameter validation
const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

// 3. RLS-enforced queries
const { data } = await serverSupabase
  .from('table')
  .select('*')
  .eq('user_id', user.id); // RLS ensures this
```

## Error Handling Best Practices

### Structured Error Responses

```typescript
// Validation error (400)
if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    },
    { status: 400 }
  );
}

// Authentication error (401)
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
);

// Authorization error (403)
return NextResponse.json(
  { error: 'Forbidden' },
  { status: 403 }
);

// Not found (404)
return NextResponse.json(
  { error: 'Resource not found' },
  { status: 404 }
);

// Rate limit (429)
return NextResponse.json(
  {
    error: 'Too many requests',
    retryAfter: 900, // seconds
  },
  { status: 429 }
);

// Server error (500)
logger.error('[API] Unhandled error', error);
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
);
```

## Response Patterns

### Success with Data

```typescript
return NextResponse.json({ data: result });
```

### Success with Pagination

```typescript
return NextResponse.json({
  data: results,
  pagination: {
    total: count,
    limit,
    offset,
    hasMore: count > offset + limit,
  },
});
```

### Success with Metadata

```typescript
return NextResponse.json({
  data: result,
  meta: {
    processingTime: Date.now() - startTime,
    version: '1.0',
  },
});
```

### Created Resource (201)

```typescript
return NextResponse.json(
  { data: newResource },
  { status: 201 }
);
```

### No Content (204)

```typescript
return new NextResponse(null, { status: 204 });
```

## Common Pitfalls

### ❌ Missing CSRF on Mutations

```typescript
// WRONG
export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromCookies();
  // ... missing CSRF check
}

// CORRECT
export async function POST(req: NextRequest) {
  await requireCSRF(req);
  const user = await getCurrentUserFromCookies();
  // ...
}
```

### ❌ Not Validating Input

```typescript
// WRONG
const body = await req.json();
await serverSupabase.from('table').insert(body); // Unsafe!

// CORRECT
const body = await req.json();
const validated = schema.parse(body);
await serverSupabase.from('table').insert(validated);
```

### ❌ Exposing Sensitive Data

```typescript
// WRONG
const { data } = await serverSupabase.from('users').select('*');
return NextResponse.json({ data }); // Includes password_hash!

// CORRECT
const { data } = await serverSupabase
  .from('users')
  .select('id, name, email, avatar_url'); // Only public fields
return NextResponse.json({ data });
```

### ❌ Not Handling Errors

```typescript
// WRONG
export async function POST(req: NextRequest) {
  const { data } = await serverSupabase.from('table').insert({ /* ... */ });
  return NextResponse.json({ data });
}

// CORRECT
export async function POST(req: NextRequest) {
  try {
    const { data, error } = await serverSupabase.from('table').insert({ /* ... */ });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('[API] Error', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

## Testing API Routes

```typescript
// __tests__/api/feature.test.ts
import { describe, it, expect } from 'vitest';

describe('POST /api/feature', () => {
  it('should require authentication', async () => {
    const res = await fetch('http://localhost:3000/api/feature', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('should require CSRF token', async () => {
    const res = await fetch('http://localhost:3000/api/feature', {
      method: 'POST',
      headers: {
        'Cookie': 'mintenance-auth=valid-token',
      },
    });
    expect(res.status).toBe(403);
  });

  it('should validate input', async () => {
    const res = await fetch('http://localhost:3000/api/feature', {
      method: 'POST',
      headers: {
        'Cookie': 'mintenance-auth=valid-token',
        'x-csrf-token': 'valid-csrf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'data' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });
});
```

## When to Use This Skill

Load this skill for:
- Creating new API endpoints
- Implementing authentication/authorization
- Handling file uploads
- Processing Stripe webhooks
- Building cron jobs
- Implementing complex queries
- Error handling strategies
- Security best practices
- Testing API routes
