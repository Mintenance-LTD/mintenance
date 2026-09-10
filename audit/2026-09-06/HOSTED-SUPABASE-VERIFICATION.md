# Hosted Supabase verification — 7 September 2026

**Not ready for public users.** This read-only MCP verification supplements the local audit. It
materially narrows F1: production blocks the demonstrated profile-role UPDATE and the older
sensitive RPCs; staging does not. Production still has permissive lifecycle INSERT authority and
exposes two newer reward-writing RPCs. Do not treat the local/staging privilege-escalation
reproduction as a demonstrated production exploit.

## Targets and evidence

- Production: **MintEnance**, `ukrjudtlvapiajkjbcrd`, eu-west-2. This is the Supabase host
  referenced by the inspected local web/root environment configuration. Healthy according to MCP
  project metadata.
- Staging: **Mintenance Staging**, `pzothyoipifjwnypzcuv`, eu-west-1. Healthy according to MCP
  project metadata.
- Older inactive Mintenance projects were not used.

Used Supabase MCP `list_projects`, `execute_sql`, `list_migrations`, `get_advisors`,
`list_edge_functions` and `get_edge_function`. SQL inspected system catalogs, effective privileges,
policies, constraints, triggers, function definitions, default ACLs and bucket configuration. **No
hosted customer rows were selected, no hosted users were created, no mutation RPC was invoked, and
no migration was applied.**

Also executed narrow read-only HTTP requests against production with the configured public API key,
kept in memory. Auth settings and JWKS returned 200. REST requests for profiles and escrow used
`select=id&limit=0`, returned 200 and zero rows. Those responses establish endpoint reachability,
not permission to read actual customer records. The deprovisioned payout Edge Function returned 410.
No key or signed URL appears in this report.

Full metadata evidence is retained in `hosted-mcp-evidence.json`, `hosted-mcp-additional.json` and
`hosted-api-readonly.json` in this directory. The local exploit logs remain separate. The
checked-out web application was not proven identical to the currently deployed web bundle;
application-code findings remain findings against the audited working tree unless explicitly
supported by hosted database evidence below.

## Environment comparison

| Control                                                                                                        | Production, inspected through MCP                                      | Staging, inspected through MCP                                      | Fresh local, exercised previously                                          |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Authenticated UPDATE of profile role                                                                           | **Denied by effective column privilege**                               | **Allowed**; own-profile UPDATE policy present                      | Self-admin escalation reproduced through SQL and REST                      |
| Anonymous/authenticated execution of `delete_user_data`, `accept_bid_atomic`, both idempotency claim overloads | **Denied**                                                             | **Allowed**                                                         | Effective exposure demonstrated; destructive RPCs not invoked              |
| INSERT escrow status/amount/payment-intent fields                                                              | **Allowed**; payer/admin INSERT policy, no initial-pending restriction | **Allowed**; matching broad INSERT policy                           | Held escrow with no provider payment inserted                              |
| INSERT accepted contract/signature timestamps                                                                  | **Allowed**; participant INSERT policy                                 | **Allowed**; matching participant policy                            | Accepted contract with the other party's timestamp inserted                |
| Bid amount/status INSERT and UPDATE                                                                            | **Allowed**, participant policies; no freeze trigger found             | Broad corresponding policies                                        | Accepted bid amount changed                                                |
| UPDATE escrow financial state / contract signatures                                                            | Restricted column grants exist                                         | Broader baseline access remains                                     | Do not infer production UPDATE permissions from local baseline             |
| `Job-storage`, `job-attachments`, `contractor-documents`, `assessment-photos` bucket visibility                | **Private**                                                            | **Private**                                                         | Direct unrelated private-PNG download denied; web signer bypass reproduced |
| Application views                                                                                              | Inspected ordinary application views use `security_invoker`            | Same for inspected ordinary views                                   | Not a reason to claim all views bypass RLS                                 |
| Nine materialized views                                                                                        | Anonymous/authenticated SELECT denied in direct catalog check          | Advisor reports selectable by API roles                             | Part of baseline privilege drift; no hosted rows read                      |
| New contribution counter and milestone RPCs                                                                    | **Anonymous/authenticated EXECUTE allowed**                            | September 4 functions absent from staging migration history         | Source reproduces unsafe grant pattern                                     |
| Completed-job rework trigger                                                                                   | **Still rejects all transitions from completed**                       | Local baseline evidence applies; not separately re-exercised hosted | Rework failed against actual trigger                                       |
| Idempotency uniqueness                                                                                         | **Key + operation**, not actor/resource/payload                        | Baseline functions present                                          | Cross-user cached-result collision reproduced                              |

## F1 correction and new production evidence

**Severity: Critical for staging/fresh-baseline privilege escalation; High for the additional
production reward-state authority defect. Confidence: high in effective metadata and function
behavior; no hosted exploit mutation attempted.**

Production currently has
`has_column_privilege('authenticated','public.profiles','role','UPDATE') = false`. It also denies
anonymous/authenticated execution of the inspected deletion, bid-acceptance and idempotency
functions. These are real mitigations. F1's local self-admin demonstration must not be described as
a production self-admin demonstration.

However, production's default ACLs still explicitly grant anonymous and authenticated roles broad
table privileges and function EXECUTE for new public objects created by `postgres`. Revoking PUBLIC
alone does not remove those explicit grants. This is the mechanism behind the fresh-baseline/staging
drift, and it has already affected newer production functions:

- `increment_contractor_contribution_stats(uuid,integer,numeric)` is SECURITY DEFINER and executable
  by anonymous and authenticated callers. It accepts a caller-selected contractor ID, image count
  and credit amount, then inserts/updates the contribution row. Its body contains input-range checks
  but no caller authorization or proof of an uploaded image.
- `claim_contractor_contribution_milestone(uuid)` has the same exposure. It increments stored
  credit/premium rewards at milestone counts. It does not record a unique claimed milestone before
  awarding, so a row remaining at a threshold can be rewarded repeatedly by repeated calls.

**Exact local source:**
[migration:4](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/supabase/migrations/20260904100000_atomic_contractor_contribution_stats.sql:4),
[grant pattern:57](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/supabase/migrations/20260904100000_atomic_contractor_contribution_stats.sql:57);
real API consumers
[training-contribution route:179](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/contractor/training-contribution/route.ts:179)
and
[reward claim:196](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/contractor/training-contribution/route.ts:196).
Hosted bodies and grants were retrieved, not inferred from migration names.

**Concrete scenario:** A caller knowing an existing contractor ID can submit arbitrary positive
contribution increments through the exposed RPC without submitting a real training image. At a
milestone the claim function can increase reward records repeatedly. This is confirmed unauthorized
reward-record authority; conversion into Stripe cash or an activated premium subscription was not
established and is not claimed.

**Smallest complete repair:** Correct default privileges, explicitly revoke anon/authenticated
EXECUTE from these server-only functions, reapply safe grants to existing objects, and make
milestone claims uniquely recorded/idempotent. Do not remove necessary policy helpers
indiscriminately. Test both fresh and upgraded schemas, including objects created after the lockdown
migration. Treat this as the same underlying grant defect as F1, not an unrelated reason to rewrite
the app.

## F2 and F7 are not explained away by deployment drift

Production permits authenticated INSERT of escrow `status`, `amount` and `payment_intent_id`, and
contract `status`, `homeowner_signed_at` and `contractor_signed_at`. The policies only require the
corresponding payer/participant identity. CHECK constraints permit held/accepted states rather than
requiring safe initial states. The inspected trigger set does not validate escrow funding or
independent signature ownership on INSERT. Restricting UPDATE alone is insufficient.

This confirms the hosted authority prerequisites for F2. The complete fabrication was reproduced
only locally to avoid modifying hosted data. Repair client INSERT authority and introduce trusted
state creation, then test direct REST attempts as well as API authorization.

Production's attached `trg_validate_job_status` calls the same trigger function that unconditionally
raises when leaving completed. The comment mentioning an administrator override does not implement
an override. F7 therefore has hosted trigger evidence in addition to the local rework reproduction.

## Classification of all original findings after MCP

| Finding                            | Updated scope                                                                                                                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 — grants/escalation             | Local/staging confirmed; specific production self-admin and old RPC paths blocked. New production contribution RPC exposure confirmed by grants/body.                                                                             |
| F2 — fabricated lifecycle records  | Local exploit reproduced; production INSERT privileges, policies, constraints and trigger prerequisites confirmed. No hosted mutation.                                                                                            |
| F3 — idempotency scope             | Local request reproduction plus production function bodies/unique constraint confirm key+operation identity and unfiltered cached return. Deployed web bundle not fingerprinted.                                                  |
| F4 — pending-intent recovery       | Confirmed against local route implementation/diagnostic. No hosted provider transaction.                                                                                                                                          |
| F5 — credit principal reduction    | Confirmed local amount diagnostic and consumer trace. No hosted payment executed.                                                                                                                                                 |
| F6 — webhook/release interleaving  | Local real-handler diagnostic; production escrow has no protective state trigger. No concurrent hosted workers invoked.                                                                                                           |
| F7 — rework                        | Local database failure; matching attached production trigger confirmed.                                                                                                                                                           |
| F8 — bearer mismatch               | Real local Supabase token rejected by local web proxy; hosted Auth is reachable. Hosted JWKS response had no public signing keys, which does not by itself prove its active user-token algorithm. No production login/token test. |
| F9 — partial refunds               | Source-level accounting/state defect; no hosted Stripe refund.                                                                                                                                                                    |
| F10 — signature durability         | Source-level sequencing/persistence defect. No hosted signing attempt.                                                                                                                                                            |
| F11 — acceptance capacity/recovery | Source/RPC locking analysis; no concurrent hosted acceptance.                                                                                                                                                                     |
| F12 — geolocation policy           | Current local web configuration; deployed web response policy not checked in this MCP pass.                                                                                                                                       |
| F13 — private-object signing       | Complete local HTTP exploit; hosted bucket is private. Deployed signer behavior not exercised with customer objects.                                                                                                              |
| F14 — shared client identity       | Real local SDK/runtime reproduction; current source. Deployed warm-worker behavior not independently exercised.                                                                                                                   |
| F15 — test assertions              | Local test fixture/SDK-contract defect; corrected audit copy passed without changing original tests.                                                                                                                              |

## Advisors and deployed services: findings versus noise

- Production reports leaked-password protection disabled and an available PostgreSQL security
  update. These are platform hardening tasks, not demonstrated account compromise. Coordinate a
  tested database upgrade rather than changing versions during an audit.
  [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
  [upgrade guidance](https://supabase.com/docs/guides/platform/upgrading).
- Production Auth settings report signup enabled and email auto-confirmation disabled. That is
  configuration evidence for requiring confirmation, not proof that delivery/reset links work.
- The 47 “RLS enabled, no policy” notices do not mean unrestricted access; they ordinarily deny
  client rows. Internal service-only tables may intentionally have no client policy.
  [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- `contractor_payout_credit_events` has RLS disabled, but direct catalog checks show
  anon/authenticated SELECT and INSERT revoked. No client exposure was established. Add
  defense-in-depth RLS if appropriate; do not inflate this into a demonstrated payout exploit.
- The `spatial_ref_sys`/PostGIS warnings concern extension objects, not observed customer-data
  exposure.
  [RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
- Production has two deployed payout-named Edge Functions. Their actual retrieved code returns 410
  without payment operations. The ungated function was not misclassified as an anonymous payout
  endpoint; its HTTP 410 was verified.
- Production performance advisors report four tables without primary keys, one duplicate-index group
  and 841 unused-index notices. These are review inputs, not measured latency or permission to drop
  indexes. No production load test or query-data sampling was performed.
  [Index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).

## Repair sequence that avoids repeating this audit

1. **Establish one canonical effective-permission contract.** Record intended table/column/function
   privileges and default ACLs, not just migration filenames. Fix F1/F2 and the newly exposed
   contribution functions. Staging currently has eight baseline-oriented history entries while
   production has 308; production includes September 3–4 changes absent from staging. Do not equate
   those history counts with semantic equivalence.
2. **Validate both creation and upgrade.** Recreate a disposable database from checked-in
   migrations, and upgrade a disposable snapshot of the prior schema without customer data. Run
   [the read-only authority snapshot](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/audit/2026-09-06/hosted-readonly-checks.sql)
   and real owner/contractor/admin/unrelated/anonymous behavioral tests. Compare staging's effective
   schema to the approved result before it is used as a release gate.
3. **Repair immutable service identity and object authority (F14/F13).** Test warm and cold workers
   with concurrent users. Verify direct Storage and web signing give the same ownership decision.
4. **Repair transaction/recovery and money invariants (F3–F11).** Convert each defect observation to
   an expected-safe regression test. Use actual database state and Stripe test mode, including lost
   responses, duplicate keys, barriers between workers, provider-success/database-failure, partial
   refunds and credit-funded principal. Make milestone reward claims idempotent too.
5. **Close client/provider acceptance gates.** Mobile bearer through proxy, email/reset/MFA,
   complete browser work/rework/sign/payment journeys and device handoffs. Only test-mode/synthetic
   services may mutate data during acceptance; hosted production checks stay read-only until a
   separately authorized release.
6. **Verify the eventual deployment.** Identify the deployed application commit, apply only reviewed
   migrations through the normal release path, rerun the catalog snapshot, and compare it to the
   approved staging result. A migration marked applied is not proof that broad default grants or
   existing privileges are correct.

Completion means these gates pass with persisted state and provider outcomes, not a particular
number of green mocked tests. This audit supplies the concrete repair targets and environment
distinctions; it does not claim all remaining provider/device journeys have now been tested or that
future changes cannot regress.
