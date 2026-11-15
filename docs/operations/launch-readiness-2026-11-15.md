# Launch readiness — 15 November 2026

Released baseline: main `2bd1fdc36` (PR #1494). The public-access configuration
change below is live. Code changes in this follow-up require merge and deployment.

- [x] Public custom domain: homepage, login and aggregate health return HTTP 200
  without cookies or a Vercel account.
- [x] Access boundaries: anonymous property API returns 401; unsigned and forged
  Stripe events return 400; the deployment URL still requires Vercel authentication.
- [x] Stripe delivery history: active Supabase relay has five successful deliveries
  and zero failures this week. The 14 November payment-success delivery returned
  200 and its application webhook record is `processed`.
- [x] Relay inspection: signature and live-mode checks, bounded payload, fixed
  upstream, no redirect following, and acknowledgement only after application success.
- [x] Direct webhook payload hardening implemented: reject absent signatures before
  reading, bound declared and streamed bodies to 1 MiB, preserve valid raw UTF-8.
- [x] Contractor verification hydration clears on logout/account switch and ignores
  stale responses; regression tests cover cold authentication and out-of-order replies.
- [x] Dashboard/job/subscription navigation uses the Next.js client router.
- [x] Full lint: 210 web / 1,121 mobile warnings, zero errors. Warning ceilings reduced
  to these counts so CI rejects regressions. Both type checks passed.
- [x] Local regression verification: 5,950 web and 12,706 mobile cases passed across
  full runs and targeted reruns; 87 snapshots passed. Two web cases are skipped.
  Windows junction tests required a rerun outside the filesystem sandbox. The
  booking retry test now awaits its asynchronous update and checks both attempts.
- [x] Aikido scanned 13 changed source/test/manifest files with zero findings.
- [x] Repeated all ten anonymous public-domain and relay rejection checks successfully.
- [ ] PR #1495 CI completion (including browser journeys).
- [ ] Merge and deploy this follow-up, then repeat public endpoint checks.
- [ ] Verify a fresh signed provider delivery on that release. Historical delivery
  is evidence of the existing path, not a fresh-release test. No live payment or
  replay was triggered during this check.
- [ ] Complete remaining dispute/admin operational journeys and bank-settlement acceptance.
- [ ] Supabase coordinated collation maintenance (support request already sent).
- [ ] Recurring backup cadence, retention, alerts, recovery owner/key access,
  compatible isolated full restore and storage headroom.
- [ ] Enable leaked-password protection on a supported Supabase plan.
- [ ] Install and exercise the released internal APK on a physical Android device.
- [ ] Continue semantic lint cleanup and workload-based database index review.
- [ ] Keep AI features gated until their evaluation requirements pass.

The iPhone build remains deferred by the user. Passing CI does not establish
physical-device acceptance, disaster recovery, settlement or AI accuracy.
