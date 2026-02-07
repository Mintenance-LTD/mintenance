# How Contractor Verification Works

This document describes how contractor verification is implemented in the codebase (APIs, services, database, and UI).

---

## 1. Contractor verification (profile/data)

**API:** `GET` and `POST` `/api/contractor/verification`  
**File:** `apps/web/app/api/contractor/verification/route.ts`

### GET – status

- **Auth:** Contractor only (cookies).
- **Logic:** Reads from `users` table: `business_address`, `license_number`, `latitude`, `longitude`, `company_name`.
- **Response:**  
  `hasBusinessAddress`, `hasLicenseNumber`, `hasGeolocation`, `hasCompanyName`, and **`isFullyVerified`** (true only when all four are present). No document upload or document status here.

### POST – submit verification info

- **Auth:** Contractor only + CSRF.
- **Body (JSON):**  
  `companyName`, `businessAddress`, `licenseNumber` (required).  
  Optional: `licenseType`, `yearsExperience`, `insuranceProvider`, `insurancePolicyNumber`, `insuranceExpiryDate`.
- **Logic:**
  1. **LicenseValidator** – license number format (min 5 chars, `A-Z0-9\-/`, max 50 chars).
  2. **GeocodingService** – geocode `businessAddress` with Google Maps (`GOOGLE_MAPS_API_KEY`); optional, verification continues if geocoding fails.
  3. **DB update** on `users`:  
     `company_name`, `business_address` (or geocoded formatted address), `license_number` (trimmed/uppercase), `years_experience`, `latitude`, `longitude`, `address`, `insurance_provider`, `insurance_policy_number`, `insurance_expiry_date`, `is_visible_on_map`, `last_location_visibility_at`, `updated_at`.
- **No document upload:** This API only accepts the above form-style fields. There is **no** `/api/contractor/verification/upload` route in the codebase; the contractor verification UI that calls it is calling a non-existent endpoint.

---

## 2. Contractor verification UI vs backend

**Page:** `apps/web/app/contractor/verification/page.tsx`

- The UI shows four “steps”: **Identity Verification**, **Business License**, **Insurance Certificate**, **Professional Certifications**, with **file upload** and a call to `/api/contractor/verification/upload`.
- That **upload route does not exist**. Only `/api/contractor/verification` (GET/POST) exists, and it is **form-based only** (company name, address, license number, insurance details).
- So: **document upload in the verification page is not implemented**; the backend verification flow is profile/data only.

---

## 3. Admin verification (automated checks + manual approve/reject)

**Service:** `apps/web/lib/services/admin/VerificationService.ts`  
**Admin user detail:** `GET /api/admin/users/[userId]`  
**Admin approve/reject:** `POST /api/admin/users/[userId]/verify`

### Automated checks (VerificationService)

- **Input:** Contractor `userId`; reads from `users`:  
  `company_name`, `business_address`, `license_number`, `latitude`, `longitude`, `insurance_expiry_date`, `admin_verified`, `background_check_status`.
- **Checks and weights (score 0–100):**
  - Company name (format, length, no test/example/fake) – 15
  - Business address present and length – 15
  - License number format (same rules as API) – 20
  - Geolocation (lat/lng present) – 10
  - Insurance (expiry valid; optional but adds score) – 15
  - Background check (`background_check_status === 'passed'`) – 25
- **Result:**  
  `passed`: all critical checks pass and score ≥ 90.  
  `requiresManualReview` when not passed or score &lt; 80.  
  Results are not stored on the user by this service; they are used for admin UI and for logging when admin approves/rejects.

### Verification history

- **Table:** `verification_history` (see migration `add_verification_history.sql`).
- **Columns (conceptually):** `user_id`, `admin_id`, `action` (e.g. `approved` / `rejected`), `reason`, `verification_score`, `checks_passed` (JSON), `previous_status`, `new_status`, `created_at`.
- **Usage:**  
  `VerificationService.getVerificationHistory(userId)` for admin user detail.  
  `VerificationService.logVerificationAction(...)` when an admin approves or rejects.

### Admin verify endpoint

- **POST `/api/admin/users/[userId]/verify`**  
  Body: `{ action: 'approve' | 'reject', reason?: string }` (reason required for reject).
- **Logic:**
  1. Ensure user is contractor.
  2. Run `VerificationService.automatedVerificationCheck(userId)` to get current score and checks.
  3. Update `users.admin_verified` to `true` (approve) or `false` (reject).
  4. Log to `verification_history` with action, reason, verification score, checks passed, previous/new status.

So **actual “verified” state** for contractors is **`users.admin_verified`**; the automated checks inform the admin but do not by themselves set that flag.

---

## 4. Other verification-related APIs and services

| Area | API / service | Purpose |
|------|----------------|--------|
| DBS (UK) | `POST /api/contractor/dbs-check` | `DBSCheckService` – initiate DBS check (basic/standard/enhanced). |
| Background check | `POST /api/contractor/background-check` | `BackgroundCheckService` – initiate background check; result feeds `users.background_check_status`. |
| Portfolio | `POST /api/contractor/portfolio/verify` | `PortfolioVerificationService` – verify portfolio items. |
| Skills | `POST /api/contractor/skills/verify` | `SkillsVerificationService` – verify skills. |
| Personality | `POST /api/contractor/personality-assessment` | `PersonalityAssessmentService` – assessment. |
| Profile boost | `GET /api/contractor/profile-boost` | `ProfileBoostService` – verification-related boosts for profile. |
| Phone | `POST /api/auth/verify-phone` | `PhoneVerificationService` – send/verify phone code (homeowners/contractors). |
| Admin bulk | `POST /api/admin/users/bulk-verify` | Bulk approve/reject contractors (same idea as single verify). |
| Admin notifications | `POST /api/admin/notifications/pending-verifications` | Send notifications for pending verifications. |

---

## 5. Database fields used for verification

**`users` (contractor-relevant):**

- **Profile/data (filled by contractor via POST `/api/contractor/verification`):**  
  `company_name`, `business_address`, `license_number`, `latitude`, `longitude`, `address`, `years_experience`, `insurance_provider`, `insurance_policy_number`, `insurance_expiry_date`, `is_visible_on_map`, `last_location_visibility_at`.
- **Outcome of admin verification:**  
  `admin_verified` (boolean).
- **Other checks:**  
  `background_check_status` (used by `VerificationService` and background-check API).

**`verification_history`:**

- Audit log of admin verification actions: `user_id`, `admin_id`, `action`, `reason`, `verification_score`, `checks_passed`, `previous_status`, `new_status`, `created_at`.

There is **no** “verification documents” or “verification_uploads” table in the described flow; document upload in the contractor verification UI is not wired to any backend.

---

## 6. Summary

- **Contractor verification** in the codebase is **form-based**: company name, business address, license number, optional insurance and experience. Stored on `users`. No document upload API.
- **“Verified” badge** is set by **admin** via **`users.admin_verified`**, using **admin verify** (and optionally **bulk-verify**). Automated checks (VerificationService) only inform the admin and are logged in `verification_history`.
- The **contractor verification page** shows document upload steps and calls `/api/contractor/verification/upload`, which **does not exist**; those uploads are currently unimplemented.
