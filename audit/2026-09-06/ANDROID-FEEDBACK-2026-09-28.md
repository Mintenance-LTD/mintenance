# Android physical-device feedback follow-up

Owner reported slow data, difficult return from job details, slow thumbnails, cluttered dashboards,
unexpected location-sharing notifications, settings concerns and a biometric authentication alert.

Implemented locally:

- Query and mutation retries recognize mobile API statusCode, avoiding retries of rejected 4xx
  requests.
- Failed images can mount again when their source URL changes; regression covers an expired URL
  replacement.
- Photo carousels initially render one image, and the jobs list initially renders four cards with
  bounded batches.
- Jobs show an initial loading message instead of a premature empty state.
- Existing-trip tracking resumes without repeating the sharing notification. Initial trip intent
  remains unchanged.
- Settings no longer swallow fetch failures into apparent saved defaults; display retry, disable
  switches while unavailable/saving, report save failures and wait for refreshed settings before
  accepting another toggle.
- Expired biometric-session errors direct the user to password sign-in instead of blaming the
  biometric sensor.
- Homeowner promotions are expandable after recent jobs. Contractor business tools are expandable
  below the schedule.

Validation: mobile TypeScript passed. Eight focused suites / 261 tests passed, covering query
retries, image replacement, location service and auto-start, biometric UI, both dashboards and jobs
screen. Dashboard tests exercise opening the collapsed controls and retaining navigation
destinations. Settings changes have type/static verification but still need interaction regression
coverage.

No Android devices were connected on the ADB check. No physical-device latency measurement,
standalone release installation, actual biometric hardware check or end-to-end GPS notification
check was performed. These changes are not yet delivered in a replacement APK. Slow API responses,
signed-image refresh and back-stack behavior still require release-device tracing; do not mark the
reported slowdown resolved. No production data, payment state or notification settings were changed
during this work.
