# Retained evidence visibility — 24 September 2026

The authorized dispute reader previously filtered unrecognized attachment references out of its
response. A retained record without a claimant also lost all evidence entries. That hid missing
evidence from the reader.

The shared reader now preserves a numbered unavailable entry for nonempty unrecognized references or
a missing claimant. It never returns the supplied raw reference or signs an unauthorized path. Exact
storage origin, job and claimant checks remain unchanged. Equivalent authorized stable references
and expired URLs remain deduplicated; repeated unavailable references are deduplicated without
exposing them.

Validation: 17 focused tests passed across dispute evidence and retained-dispute authorization.
Coverage includes malicious origins, other users/jobs, traversal, missing claimants, mixed
valid/unavailable references, expired URLs, storage failure and archive authorization failures.
These are mocked regression tests, not proof of hosted storage restoration.

No migration, hosted data change, or evidence deletion is part of this change. This makes missing
evidence visible; it does not recover missing files or establish retention compliance. The native
Dispute screen remains a submission workflow; native retained-dispute viewing parity is still open.
External-object retention, closed-account identity recovery, provider/backups disposal and
restore/replay verification remain unfinished.
