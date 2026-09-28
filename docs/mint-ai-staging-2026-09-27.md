# Mint AI staging verification — 27 September 2026

## Deployment

- Verified preview: https://mintenance-clean-7n14lpna1-mintenance.vercel.app
- Deployment: `dpl_sdsGqYEKu7FK7SLWoNE9wBHrL6Jf`, Ready.
- CLI upload includes the working changes described below. Its Git metadata is the parent commit,
  not a claim that the working changes were committed at upload time.
- Preview shares live Supabase project `ukrjudtlvapiajkjbcrd`.
- No production promotion performed in this test.

## Fixes verified

1. Production `/api/building-surveyor/assess` returned 503 because sharp could not load
   `libvips-cpp.so.8.18.3` on Linux. Explicitly trace the Linux sharp and libvips package files from
   both workspace and root locations. The same authenticated GET now returns 200 on preview; a real
   model POST also returns 200.
2. Admin login ignored the MFA challenge response. It now redirects to the existing MFA screen
   before entering the admin dashboard. Verified in Edge on preview.
3. Expert review submission required recent MFA but offered no verification dialog. It now opens the
   shared step-up dialog and retries after successful verification. Verified through a real browser
   save on preview.
4. The job analysis UI now displays a string `error` returned by the API instead of replacing it
   with an opaque status-code message.

## Test account and data

- Dedicated account ID: `89494f22-6212-48f7-b22b-50c0d084a0d9`.
- Account was created through Supabase Auth, enrolled in TOTP through the app's normal APIs, then
  granted the requested admin role. No sessions were minted manually or MFA checks bypassed.
- Synthetic review fixture: `d7e8df69-8810-4077-b027-dbfdefe3be6f`.
- Generic analysis fixture: `c567f3f2-1fbe-4cab-b7f1-364397d07b49`.
- Saved-analysis fixture: `ec91cde1-aa87-4c30-8cc6-3799ba4b55ba`.
- Photo: a generated uniform grey square, with no customer information.
- Review expertise and notes explicitly identify software QA, not professional surveying. All
  reviews label the image insufficient evidence.
- Cleanup initially blocked by automatic approval review because this is a shared live database;
  explicit user approval requested. Do not assume cleanup completed from this document alone.

## Verification evidence

| Check                              | Result                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Password login and TOTP            | 200, live and preview                                                                              |
| Preview admin browser login        | Admin dashboard reached through MFA                                                                |
| Assessment source and signed image | Both 200                                                                                           |
| Review save without fresh MFA      | 403                                                                                                |
| Step-up verification               | 200                                                                                                |
| Stale fingerprint                  | 409                                                                                                |
| Foreign evidence image             | 400                                                                                                |
| Review creation and revision       | 201 twice through live API, a third revision through preview UI                                    |
| Browser revision history           | Three revisions visible after successful save                                                      |
| Evaluation                         | 200; two initial revisions grouped into one insufficient case, zero scored cases                   |
| Generic model analysis             | 200; actual provider OpenAI, model gpt-4o, routing shadow_only, prompt building-surveyor-v3        |
| Saved analysis and repeat request  | Both 200, same assessment ID                                                                       |
| Saved status                       | Ready, needs_review, complete=true, validated=false                                                |
| Focused review tests               | 12 passed                                                                                          |
| Web TypeScript                     | Passed                                                                                             |
| Changed UI lint                    | Passed with zero warnings                                                                          |
| Cloud build                        | Passed                                                                                             |
| Required local database diff       | Blocked by existing CREATE INDEX CONCURRENTLY migration 20260830090100 executing within a pipeline |

## Release blocker found during the first staging pass: insufficient evidence

The blank-image response correctly described no visible building and had zero confidence and an
escalation decision. However, the saved response still carried safety/compliance scores of 100, RICS
condition 1, and wording suggesting no action was needed. These are misleading for an image that
cannot be assessed.

Add an explicit unassessable/recapture outcome across the response contract, persistence and both
clients. Suppress safety, compliance, condition and repair conclusions for that outcome. Verify
blank, unreadable, off-topic and genuinely healthy building photos separately. The current synthetic
test confirms transport and workflow reliability, not surveying accuracy.

Physical phone upload/interruption/retry testing and qualified expert accuracy evaluation remain
outstanding.

## Insufficient-evidence fix

- Shared evidence guard rejects an explicit insufficient-evidence outcome or zero-confidence result
  before scoring. The prompt now distinguishes absent visual evidence from a visibly healthy element
  or an uncertain cause requiring onsite inspection.
- APIs return HTTP 422 with `INSUFFICIENT_EVIDENCE`, `requiresRecapture: true`, and
  `assessment: null`. Saved attempts persist this outcome, and do not capture a completed training
  target.
- Status reads hide older zero-confidence results and their validation status. Memory/database
  caches cannot return them as completed surveys.
- Web and mobile assessment views ask for new photos and suppress ratings, repair advice and
  use-assessment actions. The admin list suppresses their stored scores and excludes them from score
  averages.
- A successful subsequent saved analysis clears old insufficient-evidence markers and nested legacy
  output.
- Local checks: 46 focused tests passed, web and mobile TypeScript passed, changed API/admin
  components passed ESLint. Regression cases include flat/nested zero-confidence output, explicit
  evidence rejection, visible healthy elements, defects needing onsite inspection, historical
  status, persistence, recovery, HTTP contract and rendered score suppression.

### Modal workspace inspection

The supplied `admin-19723/main` workspace shows zero live apps and no deployed inference endpoints.
Repository searches found no Modal SDK app or Modal endpoint wiring. The existing generator supports
an OpenAI-compatible `MINT_AI_VLM_ENDPOINT`, which could be connected to a future Modal deployment.
No Modal resources, credentials or paid deployments were created. The previously verified assessment
provider was OpenAI/gpt-4o in shadow-only routing.

### Deployed regression verification

- Inference replay on `https://mintenance-clean-j2prkb3d1-mintenance.vercel.app`
  (`dpl_6uehxyrdWmVvi2Rxnuf8vTWND1Hy`, Ready): normal login and MFA succeeded; both saved and
  generic blank-image analysis returned 422 / `INSUFFICIENT_EVIDENCE`, `assessment: null`, and a
  retake instruction.
- The saved-status endpoint returned `processingStatus: insufficient_evidence`, `canRetry: false`,
  no assessment and no validation. Its historical scores remain in the original stored JSON for
  audit, but are not returned as a completed result.
- Supabase MCP confirmed the new synthetic request `2b66da54-30f0-43ef-a4bb-1febbae090c2` persisted
  an explicit insufficient-evidence outcome with no safetyHazards payload. Existing synthetic saved
  fixture was reanalysed in place.
- Final admin score suppression was browser-verified at
  `https://mintenance-clean-re1btzq71-mintenance.vercel.app` (`dpl_Cc7eAB33uUgnvhvi4D3qfTRCBDE8`,
  Ready) through password and MFA login. The list displays the retake notice instead of the old
  scores. Local screenshot: `.vercel/mint-evidence-staging.png` (ignored).
- There are now four specifically identified synthetic assessment rows awaiting the previously
  requested cleanup approval. No customer data was modified or deleted.
- This fixes the observed blank-image failure. Real-photo accuracy across healthy, defective,
  blurred and off-topic scenes still needs a labelled expert-reviewed evaluation set; contract tests
  alone do not establish visual classification accuracy.
