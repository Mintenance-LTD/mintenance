# Edge browser verification — 22 September 2026

Read-only checks used the user's existing signed-in Microsoft Edge session at
https://www.mintenance.co.uk/dashboard. No forms were submitted, no files downloaded, no messages
sent, and no account, payment, or production records changed.

Observed navigation: dashboard to property list to a property detail. Overview, Maintenance,
Documents and Manage tabs were reachable. At a 390 x 844 viewport, Maintenance and Documents
selected correctly, and Manage loaded room photos, recurring maintenance and team access content.
The measured document width was 375px for a 390px viewport on Maintenance and Manage: no whole-page
horizontal overflow was observed there. This is not a full visual/accessibility audit. The viewport
override was reset afterwards. Private names, property identifiers and contact details are omitted.

The live property page still rendered the heuristic physical-health grade, Total spent wording, job
links presented as PDF/auto-filed receipts, and a promise of approval-gated same-contractor
rebooking two weeks ahead. Those are earlier source repairs, not proof that repaired source is
currently deployed. No application deployment was performed. The exact live commit was not
re-established in this browser check.

This verifies navigation and selected tab content only. It does not verify successful writes,
separate-user authorization, payment/provider outcomes, uploads, native mobile navigation, camera,
backgrounding, offline recovery, or device accessibility. A phone-sized browser viewport is not a
native app or physical-device test.
