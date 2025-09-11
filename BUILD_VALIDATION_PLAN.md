Build and Release Validation Plan (December Readiness)

Environments
- Staging/Production env vars in EAS:
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY
  - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY (staging + production)
  - EXPO_PUBLIC_SENTRY_DSN (production, optional)

Database schema (Supabase)
1) Apply in order via SQL Editor (idempotent):
   - supabase-setup.sql
   - production-database-extensions.sql
   - critical-fixes-migration.sql
2) Validate tables/policies (users, jobs, bids, messages, notifications, escrow_transactions)
3) Enable Realtime on jobs, bids, messages, notifications

Local checks
```bash
npm ci
npm run type-check
npm run lint
npm test
```

Device smoke tests (internal build)
- Auth: register, login, logout, forgot password; biometric prompt
- Jobs: post job; contractor bids; accept; status transitions
- Messaging: 2 devices send/receive; badge counts; deep links
- Payments: card entry → intent created → escrow held; complete job → escrow release
- Notifications: push token saved and receives Expo push
- Offline/online: background → foreground refetch; offline queue sync

EAS builds
- Internal (Android):
  ```bash
  npm run build:android:stable
  ```
- Store (Android):
  ```bash
  npm run build:android:store
  npm run submit:android
  ```

Notes
- Stripe card entry only enabled when EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is set.
- Push token acquisition reads projectId from app.config (Constants.expoConfig.extra.eas.projectId).
- Sentry only sends in non-development when DSN provided and crash reporting enabled.

