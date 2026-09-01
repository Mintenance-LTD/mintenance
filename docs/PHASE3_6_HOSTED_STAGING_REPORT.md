# Mintenance Beta Stabilisation — Phase 3.6 Hosted Staging Report

Date: 2026-09-01 Scope: hosted staging setup and final controlled-beta verification Environment
labels: LOCAL = repository/local Docker environment; STAGING = Supabase project
`pzothyoipifjwnypzcuv`; LIVE = Supabase project `ukrjudtlvapiajkjbcrd`.

## A. Hosted Staging

Project/environment confirmed: **YES — STAGING `pzothyoipifjwnypzcuv`**.

Supabase MCP verifies project `pzothyoipifjwnypzcuv` (`Mintenance Staging`) is ACTIVE_HEALTHY in
`eu-west-1`, with URL `https://pzothyoipifjwnypzcuv.supabase.co`. It is distinct from LIVE
`ukrjudtlvapiajkjbcrd`. The project had no migrations, no public tables, and no application rows
before this work. Its publishable-key inventory contains enabled legacy anon and publishable keys;
key values were not displayed.

The repository contains a staging workflow, `.env.staging`, and documented `STAGING_*` variables,
but `.env.staging` contains placeholders and is not a usable environment. Supabase branch inspection
found only the LIVE `main` branch. The organization also contains an older project named
`Mintenance app` (`hhzwsqfwcgnwmwiecofw`, `eu-west-2`), but its status is `INACTIVE` and it has no
branches. It has not been restored, seeded, or used as staging.

Exact safe setup required before testing:

1. Configure the application/deployment with STAGING URL, non-production Supabase keys, database
   connection, Stripe TEST MODE values, and staging application URL in the secret manager only.
2. Configure the exact `STAGING_*` GitHub/Vercel secrets documented in
   `.github/workflows/deploy-staging.yml`; do not commit or paste values into chat.
3. Use only disposable, prefixed test rows and create the five independent STAGING Auth users.

If manual configuration is required, add these names in GitHub repository Settings → Secrets and
variables → Actions: `STAGING_SUPABASE_DB_URL`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`,
`STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_STRIPE_SECRET_KEY`, `STAGING_STRIPE_WEBHOOK_SECRET`,
`STAGING_STRIPE_PUBLISHABLE_KEY`, `STAGING_JWT_SECRET`, `STAGING_CRON_SECRET`, `STAGING_URL`,
`STAGING_UPSTASH_REDIS_REST_URL`, and `STAGING_UPSTASH_REDIS_REST_TOKEN`. The workflow also needs
its deployment credentials `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID`. For Vercel, configure the corresponding application variables in Project
Settings → Environment Variables for Preview; the workflow maps them from these GitHub staging
secrets. Never place values in this report or chat.

## B. Migration State

Required Phase 3.6 staging baseline: `20260805194939`. LIVE remains at `20260901115208` from the
separately authorized Phase 3.5 jobs RLS promotion. STAGING was empty and has now received the exact
repository baseline snapshot in five statement-boundary chunks, followed by the two required
security migrations.

| Item                                                              | STAGING result                                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Baseline                                                          | APPLIED; exact repository snapshot, five chunks; schema verified with 342 public tables before seeding |
| Jobs hardening `20260831224315_fix_jobs_select_rls_isolation.sql` | APPLIED as `phase36_staging_jobs_select_isolation`; policy verified                                    |
| Payments hardening `20260831231341_harden_payments_write_rls.sql` | APPLIED as `phase36_staging_payments_write_lockdown`; policies/grants verified                         |
| Seven-migration reconciliation                                    | Completed in `PHASE3_MIGRATION_RECONCILIATION.md`; only the two security candidates were applied       |

Recorded STAGING migration head: `20260901134628_phase36_staging_payments_write_lockdown`.

Current disposable fixture counts: 2 properties, 4 jobs, 1 message, 1 bid, 1 contract, and 1
payment.

The LIVE jobs policy was separately verified after the authorized Phase 3.5 migration. No LIVE
payment-write change was made.

## C. RLS Results

Five disposable STAGING Auth users were created with separate UUIDs and real password-grant JWT
sessions: HOMEOWNER_A, HOMEOWNER_B, CONTRACTOR_A, CONTRACTOR_B, and ADMIN_A. Test data was prefixed
`PHASE36_*`; the core fixture was restored after mutation tests.

| Resource                        | Homeowner B  | Contractor B                | Result                                                                        |
| ------------------------------- | ------------ | --------------------------- | ----------------------------------------------------------------------------- |
| Property A                      | DENY         | DENY                        | PASS; HOMEOWNER_A owner read/update/delete works                              |
| Private Job A                   | DENY         | DENY                        | PASS                                                                          |
| Marketplace Job A               | DENY         | ALLOWED by marketplace rule | PASS                                                                          |
| Assigned Job A                  | DENY         | DENY                        | PASS; CONTRACTOR_A assigned access and update work                            |
| Messages A read                 | DENY         | DENY                        | PASS                                                                          |
| Messages A insert               | **ALLOWED**  | **ALLOWED**                 | **FAIL; sender-only policy permits injection**                                |
| Documents A (`job_attachments`) | DENY         | DENY                        | PASS; assigned CONTRACTOR_A can read the attachment                           |
| Property photos                 | DENY         | DENY                        | PASS; owner-only policy observed                                              |
| Quote/bid A                     | DENY         | DENY                        | PASS; owner/own contractor/admin mutation paths observed                      |
| Contract A                      | DENY         | DENY                        | PASS; owner/contractor/admin mutation paths observed                          |
| Payment A                       | DENY         | DENY                        | PASS for reads                                                                |
| Tenant report A                 | NOT ASSESSED | NOT ASSESSED                | No `tenant_reports` table exists; `property_tenants` owner isolation verified |

HOMEOWNER_A saw the three Property-A jobs; HOMEOWNER_B saw only PRIVATE_JOB_B; CONTRACTOR_A saw
MARKETPLACE_JOB_A and ASSIGNED_JOB_A; CONTRACTOR_B saw only MARKETPLACE_JOB_A; ADMIN_A saw all four
jobs and the seeded message/bid/contract/payment. ADMIN_A did not bypass owner-only property, photo,
attachment, or tenant policies.

## D. Payment Security

| Check                              | Result                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Direct client INSERT               | PASS — all four non-admin JWTs denied with HTTP 403                             |
| Direct client UPDATE               | PASS — all four non-admin JWTs denied with HTTP 403                             |
| Direct client DELETE               | PASS — all four non-admin JWTs denied with HTTP 403                             |
| Server/service-role payment writes | PASS — privileged SQL path succeeded; service_role retains INSERT/UPDATE/DELETE |

The payment policy permits authenticated SELECT only for payer/payee/admin and removes arbitrary
client ledger writes. No payment secret or production money was used.

## E. Stripe TEST MODE

| Check                                 | Result                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| PaymentIntent                         | NOT RUN — STAGING Stripe configuration is not present in the repository environment |
| Payment                               | NOT RUN                                                                             |
| Amount manipulation (£1/£100/£10,000) | NOT RUN                                                                             |
| Relationship manipulation             | NOT RUN                                                                             |
| Idempotency                           | NOT RUN in hosted STAGING; prior local mocked/unit evidence only                    |
| Webhook                               | NOT RUN                                                                             |
| Webhook replay                        | NOT RUN                                                                             |
| Invalid signature                     | NOT RUN                                                                             |
| Refund                                | NOT RUN                                                                             |
| Transfer/release                      | NOT RUN                                                                             |

Stripe TEST MODE cannot be claimed until the exact staging secret, webhook endpoint, and test
Connect configuration are provisioned and programmatically checked without displaying values.

## F. Core Journey

The complete hosted journey is **NOT RUN**. Login, property, job, contractor discovery, quote,
contract, server PaymentIntent, test payment, messaging, job progress, completion evidence,
completion confirmation, release, review, and property history still require the application’s
STAGING deployment and Stripe TEST MODE configuration.

## G. Beta Cohorts

| Cohort                 | Classification                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| Homeowner + Contractor | BLOCKED — message injection and missing Stripe/core-journey evidence |
| Landlord               | BLOCKED pending limited tenant/compliance smoke                      |
| Agency                 | NOT ASSESSED — no agency smoke run                                   |

These classifications are based on the required hosted acceptance evidence.

## H. Remaining P0/P1 Blockers

- **P1:** `messages_insert_policy` allows any authenticated user to insert a message where they set
  themselves as sender, without proving participation in the target job. HOMEOWNER_B and
  CONTRACTOR_B successfully injected messages into ASSIGNED_JOB_A; test rows were removed.
- **P1:** Real Stripe TEST MODE PaymentIntent, trusted-amount/relationship manipulation,
  idempotency, webhook/replay/signature, refund, and transfer/release evidence is missing.
- **P1:** The staging application/deployment has not been configured with verified non-test Supabase
  and Stripe values; checked-in `.env.staging` remains placeholders.
- **P1:** Landlord compliance/tenant-report smoke and Agency smoke are not assessed.
- **P1:** Baseline was applied as five statement-boundary migration records because the MCP channel
  rejected the 1.46 MB snapshot as one payload. Source SHA-256 is
  `868A40B78E12266ECE58DD1E03AB2A8B1485DEC8E86207CCFBE8B3083CCA4474`.

## I. Production Promotion Recommendation

No promotion is authorized by this report. After STAGING passes, stop and obtain explicit
authorization before LIVE changes. The minimal procedure is:

1. Confirm STAGING is separate and healthy; snapshot schema, policy/grant state, and test results.
2. Take and verify a LIVE backup; record LIVE head `20260901115208`.
3. Apply only `20260831231341_harden_payments_write_rls.sql` to LIVE if still required and
   explicitly authorized; the jobs fix is already present.
4. Verify LIVE grants, policies, server payment writes, webhook idempotency, visibility, logs, and
   smoke journeys.
5. Roll back only with an approved compensating migration; never restore arbitrary client payment
   writes.
6. Handle managed Supabase/Postgres platform patches separately with their own backup and
   verification.

## J. Decision

**NO — CONTROLLED BETA STILL BLOCKED**

Reason: STAGING schema/RLS evidence exists, but message injection failed and real Stripe TEST MODE,
end-to-end core journey, landlord smoke, and agency assessment remain unverified. Stop; do not
modify LIVE.
