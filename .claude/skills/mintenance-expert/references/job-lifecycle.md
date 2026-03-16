# Mintenance Job Lifecycle Reference

## Complete Flow (11 Phases)

### Phase 1: Job Creation (Homeowner)
- **Page**: `/jobs/create` (multi-step wizard)
- **API**: `POST /api/jobs` -> status `posted`/`open`
- **Fields**: title, description, category, urgency, budget_min/max, location, photos
- **System**: Notifies nearby contractors via `notifications` table

### Phase 2: Bidding (Contractors)
- **Page**: `/contractor/bid/[jobId]` | `/contractor/discover`
- **API**: `POST /api/jobs/[id]/bids` -> bid status `pending`
- **Fields**: amount, message, estimated_duration_days, materials_included, warranty_months
- **Constraint**: UNIQUE(job_id, contractor_id) - one bid per contractor
- **System**: Homeowner notified of each new bid

### Phase 3: Bid Acceptance (Homeowner)
- **Page**: `/jobs/[id]` (BidCard, BidComparisonTable2025 components)
- **API**: `POST /api/jobs/[id]/bids/[bidId]/accept`
- **Effects**:
  - Winning bid -> `accepted`, all others -> `rejected`
  - Job -> `assigned`, `contractor_id` set
  - Auto-creates draft contract
  - Auto-creates message thread between parties

### Phase 4: Contract Signing (Both Parties)
- **Component**: `ContractManagement` at `/jobs/[id]`
- **API**: `POST /api/contracts/[id]/sign` (or `/accept`)
- **Flow**: `draft` -> `pending_contractor`/`pending_homeowner` -> `accepted`
- **UI**: Shows terms, dates, contractor business details, signature buttons

### Phase 5: Payment into Escrow (Homeowner)
- **Component**: `PaymentForm` (Stripe Elements) or `EmbeddedCheckout`
- **API**: `POST /api/jobs/[id]/payment-intent` -> `POST /api/jobs/[id]/confirm-payment`
- **Escrow**: `pending` -> `held`
- **System**: Contractor notified that payment is secured

### Phase 6: Job Start (Contractor) - REQUIRES PHOTOS
- **Component**: `JobPhotoUpload` (before mode) at `/contractor/jobs/[id]`
- **API**: `POST /api/jobs/[id]/photos/before` -> `POST /api/jobs/[id]/start`
- **Photo Verification**:
  - Quality: brightness >= 0.3, sharpness >= 0.5, resolution >= 800x600
  - Geolocation: Browser GPS, Haversine distance check (100m threshold)
  - Timestamp: Within 24 hours
- **Gate**: Requires >= 1 verified before photo to enable "Start Job" button
- **Job**: `assigned` -> `in_progress`

### Phase 7: Work Execution (Contractor)
- Communication via message thread
- Location sharing via `LocationSharing` component
- "On My Way" status via `OnMyWayButton`

### Phase 8: Job Completion (Auto-Triggered)
- **Component**: `JobPhotoUpload` (after mode) at `/contractor/jobs/[id]`
- **API**: `POST /api/jobs/[id]/photos/after`
- **Auto-completion**: Uploading after photos triggers: `in_progress` -> `completed`
- **NO manual "complete" button** - completion is photo-driven
- **System**: Homeowner notified "Job Completed - Review Required"

### Phase 9: Homeowner Review
- **Component**: `HomeownerPhotoReview` with `BeforeAfterSlider` at `/jobs/[id]`
- **UI**: Draggable slider comparing before/after photos, thumbnail navigation
- **Option A - Approve**: `POST /api/jobs/[id]/confirm-completion`
  - Sets `completion_confirmed_by_homeowner: true`
  - Triggers escrow release
- **Option B - Request Changes**: `POST /api/jobs/[id]/request-changes`
  - Textarea for comments, contractor notified with link back
- **Safety Net**: 7-day auto-release if homeowner doesn't respond

### Phase 10: Payment Release (System)
- Escrow: `held` -> `release_pending` -> `released`
- Platform fee calculated (5% + Stripe fees)
- Stripe Transfer to contractor's connected account
- Both parties notified

### Phase 11: Review (Optional)
- Both parties rate (1-5 stars) + text review
- Stored in `reviews` table
- Contractor average rating updated

## Status State Machines

```
Job:      draft -> open/posted -> assigned -> in_progress -> completed
                                                          -> cancelled (from most states)
Bid:      pending -> accepted | rejected | withdrawn
Contract: draft -> pending_homeowner | pending_contractor -> accepted | rejected | cancelled
Escrow:   pending -> held -> release_pending -> released
                          -> awaiting_homeowner_approval
                          -> refunded (dispute/cancellation)
```

## Enforcement Gates (API-Level)

| Gate | Check | API Route |
|------|-------|-----------|
| Before photos required | `job_photos_metadata` count check | `/api/jobs/[id]/start` |
| After photos auto-complete | Insert triggers status change | `/api/jobs/[id]/photos/after` |
| Contract signed by both | `homeowner_signed_at` + `contractor_signed_at` | `/api/jobs/[id]/payment-intent` |
| Escrow funded | escrow status == 'held' | `/api/jobs/[id]/start` |
| 7-day auto-release | Cron job checks age | `EscrowAutoReleaseService` |

## Key Components

### Job Detail (Homeowner View) - `/jobs/[id]`
| Component | Purpose |
|-----------|---------|
| `JobDetailsProfessional` | Main job info display |
| `BidCard` / `BidComparisonTable2025` | Bid viewing/comparison |
| `ContractManagement` | Contract signing UI |
| `HomeownerPhotoReview` | Before/after photo review with slider |
| `BeforeAfterSlider` | Draggable comparison slider |
| `JobLifecycleTimeline` | Visual workflow progress |
| `JobLocationMap` | Map display |
| `PhotoGallery` | Photo carousel |

### Job Detail (Contractor View) - `/contractor/jobs/[id]`
| Component | Purpose |
|-----------|---------|
| `JobPhotoUpload` | Before/after photo upload with geolocation |
| `LocationSharing` | Real-time location to homeowner |
| `OnMyWayButton` | "On My Way" status update |
| `PrepareContractButton` | Contract creation trigger |
| Stage-based UI | Shows different actions per job status |

## API Route Map

| Route | Method | Phase | Purpose |
|-------|--------|-------|---------|
| `/api/jobs` | POST | 1 | Create job |
| `/api/jobs/[id]/bids` | POST | 2 | Submit bid |
| `/api/jobs/[id]/bids/[bidId]/accept` | POST | 3 | Accept bid |
| `/api/contracts/[id]/sign` | POST | 4 | Sign contract |
| `/api/jobs/[id]/payment-intent` | POST | 5 | Create payment |
| `/api/jobs/[id]/confirm-payment` | POST | 5 | Confirm payment |
| `/api/jobs/[id]/photos/before` | POST | 6 | Upload before photos |
| `/api/jobs/[id]/start` | POST | 6 | Start job |
| `/api/jobs/[id]/photos/after` | POST | 8 | Upload after photos (auto-completes) |
| `/api/jobs/[id]/confirm-completion` | POST | 9 | Homeowner approves |
| `/api/jobs/[id]/request-changes` | POST | 9 | Request rework |
