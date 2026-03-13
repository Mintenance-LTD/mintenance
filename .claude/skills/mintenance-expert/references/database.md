# Mintenance Database Reference

## Overview
- **Engine**: PostgreSQL via Supabase
- **Tables**: 334+ with RLS enabled, 806 RLS policies
- **Migrations**: 105 files in `supabase/migrations/`
- **Extensions**: `uuid-ossp`, `pgcrypto`, `postgis`
- **Currency**: GBP (default), Country: UK

## Core Tables

### profiles (links to auth.users)
```sql
id UUID PK REFERENCES auth.users(id), email TEXT UNIQUE NOT NULL,
first_name TEXT, last_name TEXT,
role TEXT CHECK ('homeowner'|'contractor'|'admin') NOT NULL,
phone TEXT, avatar_url TEXT, bio TEXT, verified BOOLEAN DEFAULT false,
deleted_at TIMESTAMPTZ,  -- soft delete
total_jobs_completed INTEGER DEFAULT 0,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
-- Indexes: email, role
-- RLS: SELECT own + public contractors; UPDATE own (cannot self-promote to admin)
```

### jobs (central entity)
```sql
id UUID PK, homeowner_id UUID FK profiles, contractor_id UUID FK profiles (nullable),
title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
status TEXT DEFAULT 'draft' CHECK ('draft'|'open'|'posted'|'assigned'|'in_progress'|'completed'|'cancelled'),
budget_min DECIMAL(10,2), budget_max DECIMAL(10,2),
urgency TEXT CHECK ('low'|'medium'|'high'|'emergency'),
location JSONB,  -- { lat, lng, address, city, postcode }
images TEXT[], metadata JSONB,
published_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
-- Indexes: homeowner_id, contractor_id+status, status, category, created_at DESC
-- RLS: SELECT non-draft or own; INSERT/UPDATE/DELETE own
```

### bids
```sql
id UUID PK, job_id UUID FK jobs, contractor_id UUID FK profiles,
amount DECIMAL(10,2) NOT NULL, message TEXT,
status TEXT DEFAULT 'pending' CHECK ('pending'|'accepted'|'rejected'|'withdrawn'),
estimated_duration_days INTEGER, materials_included BOOLEAN DEFAULT true,
warranty_months INTEGER DEFAULT 12,
UNIQUE(job_id, contractor_id)  -- one bid per contractor per job
-- Partial unique index: only ONE accepted bid per job
-- RLS: contractor reads/inserts own; homeowner reads bids on own jobs
```

### contracts
```sql
id UUID PK, job_id UUID FK jobs,
homeowner_id UUID FK profiles, contractor_id UUID FK profiles,
title TEXT, description TEXT, amount DECIMAL(10,2),
start_date DATE, end_date DATE, terms JSONB DEFAULT '{}',
status TEXT DEFAULT 'draft' CHECK ('draft'|'pending_homeowner'|'pending_contractor'|'accepted'|'rejected'|'cancelled'),
homeowner_signed_at TIMESTAMPTZ, contractor_signed_at TIMESTAMPTZ,
contractor_company_name TEXT, contractor_license_registration TEXT,
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
-- RLS: Both parties read; contractor inserts; both update (signing); service_role full
```

### escrow_transactions
```sql
id UUID PK, job_id UUID FK jobs,
payer_id UUID FK profiles (homeowner), payee_id UUID FK profiles (contractor),
amount DECIMAL(10,2) NOT NULL DEFAULT 0,
status TEXT DEFAULT 'pending' CHECK ('pending'|'held'|'released'|'refunded'|'awaiting_homeowner_approval'|'pending_review'|'failed'|'cancelled'),
payment_intent_id TEXT, stripe_charge_id TEXT,
description TEXT, released_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ,
metadata JSONB DEFAULT '{}',
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
-- RLS: service_role full; payer/payee read own
```

### payments
```sql
id UUID PK, job_id UUID FK jobs, bid_id UUID FK bids,
payer_id UUID FK profiles, payee_id UUID FK profiles,
amount DECIMAL(10,2) NOT NULL, platform_fee DECIMAL(10,2), net_amount DECIMAL(10,2),
currency TEXT DEFAULT 'GBP',
status TEXT DEFAULT 'pending' CHECK ('pending'|'processing'|'in_escrow'|'released'|'completed'|'failed'|'refunded'|'disputed'),
payment_method TEXT CHECK ('stripe'|'paypal'|'bank_transfer'),
stripe_payment_intent_id TEXT, stripe_charge_id TEXT,
stripe_transfer_id TEXT, stripe_refund_id TEXT,
escrow_released_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ,
metadata JSONB, error_message TEXT
```

### job_photos_metadata (photo evidence)
```sql
id UUID PK, job_id UUID FK jobs NOT NULL,
photo_url TEXT NOT NULL,
photo_type TEXT NOT NULL CHECK ('before'|'after'),
geolocation JSONB,  -- { lat, lng, accuracy }
timestamp TIMESTAMPTZ, verified BOOLEAN DEFAULT false,
quality_score NUMERIC(5,2), angle_type TEXT,
created_by UUID FK profiles
-- Indexes: job_id, (job_id + photo_type), created_by
-- RLS: Homeowner reads own job photos; contractor reads/inserts assigned; service_role full
```

### reviews
```sql
id UUID PK, job_id UUID FK jobs,
reviewer_id UUID FK profiles, reviewee_id UUID FK profiles,
rating INTEGER CHECK (1-5) NOT NULL,
comment TEXT, response TEXT,  -- reviewee can respond
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
-- RLS: Public read; reviewer inserts/updates own
```

### notifications
```sql
id UUID PK, user_id UUID FK profiles NOT NULL,
type TEXT NOT NULL, title TEXT NOT NULL, message TEXT,
data JSONB, priority TEXT DEFAULT 'normal', action_url TEXT,
read BOOLEAN DEFAULT false, read_at TIMESTAMPTZ
-- RLS: User manages own only
```

### message_threads & messages
```sql
-- message_threads:
id UUID PK, job_id UUID FK jobs,
participant_ids UUID[] NOT NULL,  -- array of user UUIDs
last_message_at TIMESTAMPTZ
-- RLS: auth.uid() = ANY(participant_ids)

-- messages:
id UUID PK, thread_id UUID FK message_threads,
sender_id UUID FK profiles,
content TEXT NOT NULL, message_type TEXT ('text'|'image'|'file'|'system'),
metadata JSONB, read_by UUID[] DEFAULT '{}'
-- RLS: Thread participants read; sender inserts (must be participant)
```

## Supporting Tables

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `companies` | owner_id, name, license_number, rating | Contractor businesses |
| `properties` | owner_id, property_name, property_type, bedrooms | Homeowner properties |
| `subscriptions` | user_id, plan_type (free/basic/pro/enterprise), stripe_subscription_id | Plans |
| `homeowner_subscriptions` | homeowner_id, amount=9.99, currency=gbp | Premium homeowner plan |
| `disputes` | job_id, raised_by, against, status | Payment disputes |
| `contractor_skills` | contractor_id, skill_name, years_experience | UNIQUE(contractor_id, skill_name) |
| `contractor_certifications` | contractor_id, name, issuing_body, expiry_date | Credentials |
| `payment_methods` | user_id, stripe_payment_method_id, last4 | Saved cards |
| `cron_job_runs` | job_name, status, duration_ms | Cron execution log (90-day retention) |
| `security_events` | user_id, event_type, severity, ip_address | Security audit |
| `audit_logs` | table_name, record_id, action, old/new_values | Data changes |
| `webhook_events` | idempotency_key UNIQUE, event_type, status | Webhook dedup |
| `contractor_meetings` | job_id, meeting_type, scheduled_datetime, status | Scheduling |
| `job_milestones` | job_id, title, amount, status | Payment milestones |
| `user_push_tokens` | user_id, push_token, device_type | Mobile push |
| `early_access_grants` | user_id, grant_type | Immutable feature grants |

## RLS Policy Patterns

```sql
-- Pattern 1: Owner-Only
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())

-- Pattern 2: Both Parties
USING (homeowner_id = auth.uid() OR contractor_id = auth.uid())

-- Pattern 3: Array Contains (Messaging)
USING (auth.uid() = ANY(participant_ids))

-- Pattern 4: Cross-Table Subquery
USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = table.job_id AND j.homeowner_id = auth.uid()))

-- Pattern 5: Service Role Full Access
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')

-- Pattern 6: Admin Read
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
```

## Key DB Functions
- `cleanup_old_cron_runs()` - Delete cron logs >90 days
- `cleanup_old_webhook_events()` - Delete webhook events >30 days
- `check_webhook_idempotency()` - Atomic webhook dedup
- `update_updated_at()` - Trigger for auto-timestamps
- `is_admin(user_id)` - SECURITY DEFINER admin check (avoids RLS recursion)

## Querying Patterns

```typescript
// Service Role (bypasses RLS) - for server-side operations
import { serverSupabase } from '@/lib/api/supabaseServer';
const { data } = await serverSupabase.from('jobs').select('*, bids(*)').eq('id', jobId).single();

// User-Scoped (respects RLS) - for user-facing queries
import { createUserScopedClient } from '@/lib/api/supabaseServer';
const client = createUserScopedClient(jwt);
const { data } = await client.from('notifications').select('*').eq('read', false);

// Batch + Lookup Map (dashboard pattern - avoids N+1)
const [jobs, bids] = await Promise.all([
  serverSupabase.from('jobs').select('*').eq('homeowner_id', userId),
  serverSupabase.from('bids').select('*').in('job_id', jobIds),
]);
const bidsByJob = new Map(bids.data?.map(b => [b.job_id, b]));
```

## Migration Naming
```
001-009: Consolidated initial schema (core, jobs, payments, security, AI, meetings, missing tables)
20260NNN...: Date-prefixed incremental changes (YYYYMMDDHHMMSS)
Latest: 20260307200000_week3_week4_fixes.sql (105 total)
```
