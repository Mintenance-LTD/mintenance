# Mintenance data retention and account deletion policy

Version 0.1 — 15 September 2026. Owner: Mintenance management (appoint a named privacy owner before
launch).

Status: proposed operating policy authorised for drafting by the product owner. This document is not
evidence that the application enforces it. Legal and accounting review, implementation and
acceptance tests remain required before publication as a customer promise.

## Scope and principles

This schedule assumes a UK company providing ordinary home-maintenance marketplace services. The
contract schedule below is a proposed default for simple contracts governed by England and Wales
law. Scotland, Northern Ireland, deeds, structural/building-safety work, personal injury, latent
defects and insurance requirements require separate classification and review; do not automatically
purge those records under this default.

Retain only information needed for an identified purpose. Account closure removes public visibility
and access credentials; it does not automatically erase another party's signed agreement or
necessary accounting evidence. Conversely, keeping a transaction record is not justification for
keeping an entire profile, message history or photo library.

## Proposed schedule

The shorter operational periods below are product policy choices, not statutory periods. Each record
must have a category, purpose, retention trigger, due date and any applicable hold.

| Category                                                                           | Retention trigger and period                                                                                                                         | Minimum retained content                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Signed ordinary service contracts and acceptance evidence                          | Six years after completion or termination as a default review/deletion date; unresolved obligations or relevant claims require a documented hold     | Agreed version, party identities necessary to establish the agreement, property/work scope, signatures and timestamps, essential variations and completion/acceptance evidence |
| Accounting and payment records                                                     | Six years after the end of the last company financial year to which the record relates; extend where applicable tax rules require it                 | Gross/cash/credit amounts, currency, fees, refunds, payouts, invoices, provider references and reconciliation records; no card credentials                                     |
| Dispute evidence                                                                   | Hold while a specific dispute, investigation or claim requires it; on closure, reassess the underlying schedule and record a justified disposal date | Relevant correspondence, selected evidence and outcome; exclude unrelated conversations/photos                                                                                 |
| Unsigned abandoned drafts                                                          | Delete 90 days after abandonment or cancellation; remove on an eligible erasure request sooner                                                       | No long-term archive unless specifically needed for a dispute                                                                                                                  |
| Public profile, marketing preferences, devices and ordinary saved property content | Hide immediately on closure; erase unnecessary personal content within 30 days of an approved erasure request                                        | Retain only a minimal suppression record where needed to honour marketing opt-outs                                                                                             |
| Messages and photos unrelated to retained contracts or disputes                    | Delete within 90 days of job closure, or within 30 days of an approved account erasure request, whichever is sooner                                  | Extract only demonstrably necessary evidence into the restricted record before disposal                                                                                        |
| Raw AI assessment uploads and detailed AI responses                                | Delete within 30 days of assessment unless the user explicitly saves them to an active property/job; saved items follow that category                | Retained contractual evidence must identify that output was AI-generated and preserve any human correction                                                                     |
| Routine security/access logs                                                       | 90 days from creation, unless a specific incident hold applies                                                                                       | Minimise IP/device data; never credentials, full payment details or arbitrary request bodies                                                                                   |
| Deletion execution audit                                                           | Two years after completion, then review necessity and erase                                                                                          | Pseudonymous request reference, categories acted on, completion/failure timestamps and justified exceptions; no copy of erased content                                         |
| Backups                                                                            | Target maximum 35-day rolling lifetime, subject to verified provider configuration                                                                   | Restrict restore access; apply deletion tombstones before restored data becomes available                                                                                      |

The six-year contract default is an operational choice, not a statement that every claim expires six
years after completion. The Limitation Act's simple-contract period runs from accrual of the cause
of action and has exceptions. Do not restart every record's clock merely because somebody logs in,
edits a profile or opens an unrelated support ticket.

The accounting financial-year end must come from verified company/accounting configuration. Missing
dates or an unclassified record create an assigned review item with a 30-day resolution target, not
silent permanent retention. A record with several valid purposes uses the latest applicable due
date, but only retains fields necessary for those purposes.

## Access after closure

- Remove the closed account from discovery and revoke its sessions, refresh tokens and device
  access. Do not reactivate it merely to deliver retained records.
- An existing contract party may obtain its own retained agreement and necessary payment evidence
  through authenticated, freshly authorised access. Use a separately identity-verified export
  process for a person whose login has been deleted. Matching an email address alone is
  insufficient.
- An unrelated user, a later property owner or an administrator without a relevant
  support/compliance assignment has no automatic entitlement to the archive.
- Require MFA and a recorded purpose for staff archive access; log reads and exports. Separate
  routine support from financial/legal access. Limit service credentials to the server and audited
  jobs.
- Keep archive objects private. Authorise each download, issue short-lived signed URLs, and avoid
  putting personal information in object keys, logs or notification bodies.
- Preserve immutable signed versions. Amendments create new versions; account anonymisation must not
  silently rewrite the agreement. Remove nonessential linked profile fields separately.

## Erasure and holds

Process an erasure request record by record. Explain what was erased, what is retained, the reason
and the expected disposal/review date. Do not describe a soft-deactivated account as fully erased.
Apply legal-obligation or legal-claims exceptions only where justified, and document the lawful
basis separately from the exception to erasure. Assess and document legitimate interests where
relied upon.

A hold requires a case/reference, specific record scope, reason, owner, start date and next review
date. Review at least every 90 days. Release promptly when no longer necessary. A hold pauses
disposal, not the user's other rights, and must not turn unrelated personal data into permanent
evidence. Privileged hold changes require MFA and an audit trail.

Backups must be put beyond ordinary use pending scheduled expiry. Explain residual backup retention
honestly. A restore must replay deletion instructions before serving traffic. Propagate eligible
deletion to processors and derived stores; record confirmations and retry failures. Provider
retention obligations may differ from Mintenance's own and must be disclosed accurately.

## Required engineering acceptance criteria

1. Inventory tables, storage objects, processor copies and foreign-key cascades. Classify existing
   records without inventing missing signature or consent evidence.
2. Replace account-deletion cascades that destroy signed agreements, payment ledgers or another
   party's records. Preserve a minimal restricted identity reference; do not preserve a usable login
   as a workaround.
3. Serialize signing, withdrawal/deletion and invitation changes against the same contract lock.
   Once any signature is recorded, withdrawing the workflow must not destroy that signed version.
4. Separate users must demonstrate party-only reads after closure. Deleted sessions, unrelated users
   and routine support roles must fail archive access.
5. A durable disposal job must use bounded batches, conditional claims, hold rechecks, retryable
   object/provider deletion and an execution audit. A database success followed by a storage failure
   must not report completed erasure.
6. Test expiry boundaries, financial-year calculations, duplicate requests, hold/disposal races,
   signing/deletion races, provider failures and backup restoration with synthetic data on the
   isolated stack.
7. Publish customer wording only after these controls are verified. Confirm processor backup
   lifetimes, business financial year, operating jurisdictions and building-work exclusions before
   activating automatic expiry.

## Source basis and review

- [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/):
  UK GDPR does not set a universal retention period; periods need purpose-based justification and
  review.
- [GOV.UK company and accounting records](https://www.gov.uk/running-a-limited-company/company-and-accounting-records):
  company accounting records generally need six years from the relevant financial-year end, with
  circumstances requiring longer retention.
- [Limitation Act 1980, section 5](https://www.legislation.gov.uk/ukpga/1980/58/section/5): ordinary
  simple-contract claims and accrual-based limitation; this is not a universal data-retention
  mandate.
- [ICO right to erasure](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/):
  exceptions, request handling and backup considerations.

Sources checked 15 September 2026. Review annually and when legal scope, payment providers or data
processing changes. Obtain UK legal/accounting review before adoption; this draft supplies concrete
engineering requirements and does not certify compliance.
