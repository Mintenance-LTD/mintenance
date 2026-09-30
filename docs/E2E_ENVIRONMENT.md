# Disposable browser-test environment

The E2E workflow creates a separate local Supabase stack in each GitHub runner. It applies the
repository migrations, creates synthetic homeowner, contractor and administrator accounts, and
removes the stack with --no-backup afterward. No hosted Supabase credentials or production records
are used.

Supabase CLI is pinned to 2.118.0. The generated project is mintenance-e2e-ci, with API port 56321
and database port 56322. Preparation refuses to overwrite an existing output/e2e-stack directory.
Default reference seeds are disabled; Playwright adds its own synthetic properties after account
setup.

bootstrap-e2e.cjs accepts only 127.0.0.1:56321, generates ephemeral application secrets, and masks
values before exporting them to GITHUB_ENV. Local runs save configuration beneath ignored
output/e2e-stack instead. Do not upload that directory or its start/status logs as artifacts.

Stripe values are nonfunctional test placeholders: this suite does not verify real sandbox charges
or payouts. Provider integration requires the separate Stripe sandbox acceptance tests. Email
remains in the local Supabase mail service.

The preflight and Playwright setup reject the known live project. E2E_TESTING also forces fresh
authentication, preventing cached sessions from an older stack. Never enable the test-auth endpoint
or E2E_TESTING on a production deployment.

Outstanding verification must be reported from actual workflow results, including login/session
continuity, job creation and bidding, accessibility, and Linux screenshot comparisons. Never approve
new baselines without reviewing images.
