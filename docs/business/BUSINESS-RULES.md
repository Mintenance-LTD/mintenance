# Mintenance Business Rules & Security Enforcement

> Last updated: 2026-04-01 This document defines the business rules that govern the Mintenance
> platform. All API endpoints, state machines, and database policies MUST enforce these rules.

---

## 1. User Roles & Permissions

| Role           | Can Create Jobs | Can Bid | Can Start Work | Can Approve | Admin Panel |
| -------------- | :-------------: | :-----: | :------------: | :---------: | :---------: |
| **Homeowner**  |       Yes       |   No    |       No       |     Yes     |     No      |
| **Contractor** |       No        |   Yes   |      Yes       |     No      |     No      |
| **Admin**      |       No        |   No    |       No       |     Yes     |     Yes     |

### Role Enforcement Layers

1. **JWT claims** — `user.role` set at login, checked by `withApiHandler({ roles: [...] })`
2. **RLS policies** — Database-level row ownership, enforced on every query
3. **Ownership validators** — `requireJobOwnership()` in `lib/security/ownership-validators.ts`
4. **Admin DB verification** — Admin-only mutating routes verify role from database (not just JWT)

---

## 2. Job Lifecycle State Machine

```
                    ┌─────────────────────────────────────────┐
                    │           CONTRACTOR TERMINATED          │
                    │         (escrow refunded, re-open)       │
                    └──────────┬──────────────┬───────────────┘
                               │              │
                               ▼              ▼
  ┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌───────────────┐
  │  posted   │───▶│   assigned   │───▶│  in_progress  │───▶│   completed   │
  └──────────┘    └──────────────┘    └───────────────┘    └───────────────┘
       ▲                │  │                │  │                │
       │                │  │                │  │                │
       └────────────────┘  │                │  │                │
       (terminated)        │                │  ▼                ▼
                           │           ┌──────────┐      ┌──────────┐
                           │           │ disputed │◀─────│ disputed │
                           │           └──────────┘      └──────────┘
                           │                │
                           ▼                ▼
                      ┌──────────┐    ┌──────────┐
                      │cancelled │    │cancelled │
                      └──────────┘    └──────────┘
```

### Status Definitions

| Status        | Description                              |          Who Triggers          | Next States                                                 |
| ------------- | ---------------------------------------- | :----------------------------: | ----------------------------------------------------------- |
| `posted`      | Job visible to contractors for bidding   |     Homeowner creates job      | `assigned`, `cancelled`                                     |
| `assigned`    | Contractor accepted, awaiting work start |     System (on bid accept)     | `in_progress`, `posted` (terminated), `cancelled`           |
| `in_progress` | Contractor actively working              |     Contractor starts job      | `completed`, `disputed`, `posted` (terminated), `cancelled` |
| `completed`   | Work finished, awaiting homeowner review | System (after photos uploaded) | `disputed`                                                  |
| `disputed`    | Homeowner disagrees with work quality    |    Homeowner files dispute     | `in_progress` (rework), `completed` (resolved), `cancelled` |
| `cancelled`   | Job cancelled (terminal)                 |      Either party / Admin      | —                                                           |

### Enforcement Gates (Pre-conditions)

| Transition                         | Required Before Proceeding                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `posted → assigned`                | Homeowner accepts a bid                                                            |
| `assigned → in_progress`           | Contract signed by both parties + Escrow funded + At least 1 before-photo uploaded |
| `in_progress → completed`          | At least 1 after-photo uploaded (auto-triggers completion)                         |
| `completed → escrow release`       | Homeowner approves work + After-photos verified to exist                           |
| `assigned/in_progress → posted`    | Homeowner terminates contractor (reason required, escrow refunded)                 |
| `completed/in_progress → disputed` | Homeowner files dispute with reason + category                                     |

---

## 3. Bid Lifecycle

```
  pending ──┬──▶ accepted     (homeowner accepts → job becomes assigned)
            ├──▶ rejected     (homeowner rejects or another bid accepted)
            └──▶ withdrawn    (contractor withdraws)
```

All terminal states. A contractor can only have **one active bid per job**.

---

## 4. Contract Lifecycle

```
  draft ──┬──▶ pending_homeowner   (contractor signs first)
          ├──▶ pending_contractor  (homeowner signs first)
          └──▶ cancelled

  pending_X ──┬──▶ accepted    (both parties signed)
              ├──▶ rejected
              └──▶ cancelled
```

### Rules

- Contract auto-created when bid is accepted (status: `draft`)
- Cannot sign a draft contract — contractor must fill in details first
- Both parties must sign before work can begin
- Signing is idempotent (double-sign returns error, doesn't corrupt state)
- Only parties to the contract can sign (`roles: ['homeowner', 'contractor']` + ownership check)

---

## 5. Escrow & Payment Lifecycle

```
  pending ──▶ held ──┬──▶ release_pending ──▶ released
                     ├──▶ awaiting_homeowner_approval ──▶ release_pending
                     ├──▶ pending_review (admin) ──▶ release_pending
                     ├──▶ refunded  (contractor terminated)
                     └──▶ cancelled
```

### Rules

- Escrow must be funded (`held`) before contractor can start work
- Escrow stays `held` during disputes — funds are NOT released until resolution
- Homeowner confirmation required before release (with 7-day auto-release safety net)
- After-photos must exist before escrow can be released
- Platform fee deducted during release (Stripe Transfer to contractor's connected account)
- Refund triggers on contractor termination
- All payment operations are idempotent (distributed locking)

---

## 6. Photo Evidence Rules

### Before Photos (Job Start)

- **Minimum**: 1 photo required before job can start
- **Validation**: PhotoVerificationService checks brightness, sharpness, resolution
- **Geolocation**: Browser geolocation captured, Haversine distance check (100m threshold)
- **Storage**: `job_photos_metadata` table with `photo_type: 'before'`

### After Photos (Job Completion)

- **Minimum**: 1 photo required — uploading triggers auto-completion
- **Validation**: Quality check + category-specific requirements
- **Escrow gate**: After-photos must exist before homeowner can confirm completion
- **Storage**: `job_photos_metadata` table with `photo_type: 'after'`

### Homeowner Review

- Before/after comparison via draggable slider (BeforeAfterSlider component)
- Approve → triggers escrow release
- Request Changes → notifies contractor with comments
- No response within 7 days → auto-release safety net

---

## 7. API Security Layers

### Layer 1: Middleware (request interception)

| Protection       | Scope                                         | Details                                |
| ---------------- | --------------------------------------------- | -------------------------------------- |
| JWT verification | All protected routes                          | Token blacklist checked                |
| CSRF validation  | All mutating requests (POST/PUT/PATCH/DELETE) | Skipped for Bearer token auth (mobile) |
| Rate limiting    | All `/api/` routes                            | Default: 30 req/min per IP+URL         |
| Session timeout  | All authenticated routes                      | Hard enforcement mode                  |
| CORS             | All requests                                  | Preflight handled before rate limiting |

### Layer 2: Route Handler (`withApiHandler`)

| Protection            | Config                          | Details                              |
| --------------------- | ------------------------------- | ------------------------------------ |
| Role restriction      | `roles: ['homeowner']`          | Checked after auth                   |
| Per-route rate limits | `rateLimit: { maxRequests: N }` | Overrides middleware defaults        |
| CSRF override         | `csrf: false`                   | For specific routes (e.g., webhooks) |
| DB admin verification | Auto for admin-only mutations   | Prevents JWT forgery escalation      |

### Layer 3: Business Logic (in handler)

| Protection               | Details                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| Ownership validation     | `requireJobOwnership()` or inline query with `.eq('homeowner_id', user.id)`      |
| State machine validation | `validateStatusTransition()` — throws on invalid transitions                     |
| Idempotency guards       | `checkIdempotency()` — prevents duplicate operations (bid accept, payment, etc.) |
| Pre-condition checks     | Contract signed? Escrow funded? Photos exist?                                    |

### Layer 4: Database (RLS)

| Protection              | Details                                                    |
| ----------------------- | ---------------------------------------------------------- |
| Row-level security      | 334 tables with RLS enabled, 806+ policies                 |
| Ownership scoping       | Users can only read/write their own data via `auth.uid()`  |
| Role field immutability | Users cannot modify their own `role` field via RLS         |
| CHECK constraints       | Status columns constrained to valid enum values            |
| Audit triggers          | Job status changes auto-logged to `job_status_transitions` |

---

## 8. Dispute Resolution Flow

```
1. Homeowner files dispute
   POST /api/jobs/:id/dispute
   Body: { reason: "...", category: "quality|incomplete|damage|different_from_agreed|other" }

2. Job status → 'disputed'
   Escrow remains 'held' (funds frozen)
   Contractor notified with reason and category
   Dispute record created in 'disputes' table

3. Resolution Options:
   a. Contractor reworks → job back to 'in_progress' → new after-photos → 'completed'
   b. Parties agree → job marked 'completed' → escrow released
   c. Admin intervenes → partial/full refund or forced release
   d. Escalation → job 'cancelled' → escrow refunded
```

---

## 9. Contractor Termination Flow

```
1. Homeowner terminates contractor
   POST /api/jobs/:id/terminate-contractor
   Body: { reason: "..." } (min 10 chars)

2. Pre-conditions checked:
   - Job must be 'assigned' or 'in_progress'
   - User must be the homeowner who owns the job

3. Actions performed (atomically):
   a. Escrow refunded (if held) → status: 'refunded'
   b. Active contract cancelled → status: 'cancelled'
   c. Contractor's accepted bid rejected → status: 'rejected'
   d. Job reset → status: 'posted', contractor_id: null
   e. Both parties notified

4. Job re-opens for new bids from other contractors
```

---

## 10. Business Constants

Defined in `packages/shared/src/index.ts` under `BUSINESS_RULES`:

| Rule                             | Value    | Purpose                                         |
| -------------------------------- | -------- | ----------------------------------------------- |
| Budget requires photos threshold | £500     | Jobs over this amount require photo attachments |
| Max jobs per hour                | 10       | Prevent spam job creation                       |
| Max login attempts               | 5        | Account lockout threshold                       |
| Lockout duration                 | 15 min   | Time before login re-enabled                    |
| Max password resets/hour         | 3        | Rate limit abuse prevention                     |
| Session duration (default)       | 24 hours | Auto-logout                                     |
| Session duration (remember me)   | 30 days  | Extended session                                |
| Contractor search radius         | 50 km    | Default proximity for matching                  |
| Max photos per job               | 10       | Storage/abuse prevention                        |
| Max skills per contractor        | 20       | Profile completeness cap                        |

---

## 11. Endpoint Security Matrix

### Job Endpoints

| Endpoint                             | Method | Roles      | Ownership Check |     State Machine     | Idempotent |
| ------------------------------------ | ------ | ---------- | :-------------: | :-------------------: | :--------: |
| `/api/jobs`                          | POST   | homeowner  |        —        |           —           |     No     |
| `/api/jobs/:id`                      | GET    | any auth   |       RLS       |           —           |     —      |
| `/api/jobs/:id`                      | PATCH  | homeowner  |       RLS       |          Yes          |     No     |
| `/api/jobs/:id/start`                | POST   | contractor |  contractor_id  | assigned→in_progress  |     No     |
| `/api/jobs/:id/complete`             | POST   | contractor |  contractor_id  | in_progress→completed |     No     |
| `/api/jobs/:id/confirm-completion`   | POST   | homeowner  |  homeowner_id   |  completed (verify)   |    Yes     |
| `/api/jobs/:id/dispute`              | POST   | homeowner  |  homeowner_id   |       →disputed       |     No     |
| `/api/jobs/:id/terminate-contractor` | POST   | homeowner  |  homeowner_id   |        →posted        |     No     |
| `/api/jobs/:id/request-changes`      | POST   | homeowner  |  homeowner_id   |           —           |     No     |

### Bid Endpoints

| Endpoint                             | Method | Roles      | Ownership Check |   State Machine   | Idempotent |
| ------------------------------------ | ------ | ---------- | :-------------: | :---------------: | :--------: |
| `/api/jobs/:id/bids`                 | POST   | contractor |        —        |         —         |     No     |
| `/api/jobs/:id/bids/:bidId/accept`   | POST   | homeowner  |  homeowner_id   | pending→accepted  |    Yes     |
| `/api/jobs/:id/bids/:bidId/reject`   | POST   | homeowner  |  homeowner_id   | pending→rejected  |     No     |
| `/api/jobs/:id/bids/:bidId/withdraw` | POST   | contractor |  contractor_id  | pending→withdrawn |     No     |

### Contract Endpoints

| Endpoint                    | Method | Roles                 | Ownership Check |     State Machine      |        Idempotent        |
| --------------------------- | ------ | --------------------- | :-------------: | :--------------------: | :----------------------: |
| `/api/contracts/:id/accept` | POST   | homeowner, contractor |   party check   | draft→pending→accepted | No (double-sign blocked) |

### Escrow Endpoints

| Endpoint                                     | Method | Roles            | Ownership Check |    State Machine     | Idempotent |
| -------------------------------------------- | ------ | ---------------- | :-------------: | :------------------: | :--------: |
| `/api/escrow/:id/homeowner/approve`          | POST   | homeowner        |  homeowner_id   |          —           |     No     |
| `/api/escrow/:id/homeowner/pending-approval` | GET    | homeowner        |  homeowner_id   |          —           |     —      |
| `/api/payments/release-escrow`               | POST   | homeowner, admin |    ownership    | held→release_pending |    Yes     |
| `/api/payments/refund`                       | POST   | any auth         |        —        |          —           |    Yes     |
| `/api/admin/escrow/approve`                  | POST   | admin            |        —        |          —           |     No     |

---

## 12. Invariants (Must ALWAYS Be True)

These are the hard rules that no code path should ever violate:

1. **A job cannot start without a signed contract, funded escrow, and before-photos**
2. **Escrow cannot be released without after-photos existing**
3. **Only the assigned contractor can start or complete a job**
4. **Only the job's homeowner can accept bids, confirm completion, or terminate the contractor**
5. **Status transitions must follow the state machine — no skipping states**
6. **Escrow stays held during disputes — never auto-released during active dispute**
7. **Users cannot modify their own role**
8. **Admin mutations require database-backed role verification (not just JWT)**
9. **All payment operations must be idempotent**
10. **Cancelled and released are terminal states — no recovery**
