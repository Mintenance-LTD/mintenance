# Operations and release verification, 27 September 2026

Readiness remains unestablished. These are fresh hosted observations, not evidence that the
remaining journeys pass.

## Confirmed production blocker: scheduler disabled

At approximately 16:30 UTC, the Vercel project Cron Jobs settings showed **Disabled**, with all Run
and View Logs buttons disabled. The configured list includes payment reconciliation, refund
recovery, contractor payouts, account deletion recovery, notification processing and evidence
disposal. Repository `vercel.json` contains their schedules, but configuration alone does not run
them.

The production `public.cron_job_runs` table contained four rows total. Its latest `started_at` was
`2026-06-11 20:23:52.024+00`; there were no rows in the preceding 24 hours. A deployment-scoped
one-hour Vercel log query for `/api/cron/` returned no logs. The wider aggregate query timed out and
supplies no additional evidence.

The Alerts list initially labelled the Default Alert Rule **no destinations configured**. The fully
loaded detail drawer instead showed Vercel Notifications and Subscribe Team Owners enabled. Personal
Web and Email notifications are enabled, with only High severity selected. The email is the
account's verified primary address, `admin@mintenance.co.uk`; the owner confirmed keeping this
address. The built-in Test Notification was clicked once; its button disabled during the request and
re-enabled afterward. The owner then confirmed **Test email received** at that address. This
verifies the email channel, not detection of a missed scheduled job or delivery of an actual
recovery-failure alert. No sign-in email was added or changed. These details supersede the initial
list-label reading. The hosting dashboard also displayed an overdue-payment warning and possible
account shutdown. Billing needs the account owner's attention.

No scheduler toggle or Run button was activated. Enabling the global scheduler would activate
production financial, messaging and deletion operations, outside the isolated-test restriction.
Before activation, review pending work and provider mode without exposing personal data; obtain an
explicit production activation decision. Verify recurring runs over at least two scheduled
intervals, successful completion records and an actionable failure notification to a named operator.
Demonstrate the failure path in an isolated environment, not by breaking live jobs.

## Release identity verified

`www.mintenance.co.uk` resolves in Vercel to READY production deployment
`dpl_725U7DcLMyQExb8HKXjVdD3n8NJq`, source commit `ebb93e09adf5f911bc6b3743c550c0824a318579` (merge
PR 1348).

After fetching main, both that commit and tested source `46064ccca` resolve to Git tree
`9e45ff8a6c052ad57e6461cdae2f33b0fb0d9714`. This closes source identity for that deployment, not
full deployed acceptance or environment equivalence. No deployment was initiated in this
verification.

## Migration-history alignment repaired

Three local migration files had different timestamps from the already-applied hosted entries. Each
hosted statements array was compared to the local file after normalizing CRLF and surrounding
whitespace; all three matched exactly. Only filenames were changed, with no SQL edits or hosted
reapplication:

| Previous version | Hosted/canonical version | Migration                              |
| ---------------- | ------------------------ | -------------------------------------- |
| 20260927072513   | 20260927073843           | idempotent_recurring_schedule_creation |
| 20260927100755   | 20260927101642           | durable_push_receipts                  |
| 20260927104701   | 20260927105205           | journal_push_dispatch_attempts         |

Contact replay migration `20260927142309` already matches. This checks today's four migrations, not
the entire historical migration ledger. Full local schema diff remains subject to the previously
recorded concurrent-index shadow replay failure; filename alignment is not a clean schema-diff
result.

## Security review refreshed

Fresh Supabase advisors still flag leaked-password protection and database security updates
(reported version `supabase-postgres-17.4.1.074`). Neither was changed. The earlier dashboard check
found a plan prerequisite for password protection; no subscription purchase is authorized by this
audit.

The eight application SECURITY DEFINER helper signatures reported by the advisor were read from the
hosted catalog. User-parameter helpers require equality to `auth.uid()`; `is_admin()` reads the
current identity and `is_job_participant(uuid)` checks the current user's job participation/admin
status. Callable does not alone mean arbitrary-user access. PostGIS estimated-extent functions still
need review.

`spatial_ref_sys` still has broad client write grants, but its enabled statement trigger
`guard_spatial_reference_writes` rejects INSERT, UPDATE, DELETE and TRUNCATE by untrusted roles. Do
not report those grants as an unmitigated write exploit or remove the guard just to reduce advisor
counts. The 78 no-policy RLS notices are informational and include intentionally private service
tables.

## Other gates remain open

Fresh standalone native interruption/permission/deep-link acceptance; physical Android/iOS; external
evidence-file disposal; backup expiry and isolated restore replay; verified closed-account evidence
export; and end-to-end operator alert delivery. The prior diagnostic Android process-kill proof is
recorded separately in `TENANT-CONTACT-RECOVERY-2026-09-27.md`.
