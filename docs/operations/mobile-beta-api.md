# Mobile login behind restricted beta protection

The mobile client authenticates with Supabase. A Vercel Deployment Protection 401 is a separate
hosting gate, not proof that the Supabase session has expired. The client now preserves its session
on hosting JSON errors, redirects and HTML login pages (including upload requests), and on transient
refresh failures. Actual repeated application 401s and terminal refresh-token failures still exit
the rejected session. A late request cannot sign out a replacement account.

## Optional authenticated mobile relay

`supabase/functions/mobile-api-relay` keeps the website behind Vercel protection. It requires
platform JWT verification, online Supabase user verification, confirmed email, and explicit
membership in a server-side UUID allowlist. User-editable metadata never grants beta membership. No
database grants or tables change. A missing or malformed configuration denies every request.

The relay forwards the user's own bearer token to a fixed `https://www.mintenance.co.uk` upstream.
Existing Next.js token-revocation, session-age, role, ownership and rate-limit checks still run. It
does not use a service-role token. Only listed mobile API groups are accepted; admin, cron, webhook,
auth, agent and training routes are excluded. It is not a website or arbitrary-URL proxy.
Unauthenticated password-breach checks continue to need a separately reviewed access path; this
relay does not expose login/signup routes.

Caller cookies, bypass credentials, forwarded IPs and internal identity headers are discarded.
Redirects are never followed. Response cookies and debug headers are stripped; responses are not
cached. The relay makes one upstream attempt, has a 25-second deadline, an 8 MiB request limit and a
16 MiB response limit. Large uploads, streaming APIs and calls outside `mobileApiClient` need
separate validation. Upstream rate limits may see the relay's shared egress IP; no forged client-IP
headers are trusted to work around that limitation.

## Rollout requires reviewed account admission and server configuration

This commit prepares the relay but does not deploy it, grant beta membership, change Vercel
protection, submit a native build or publish an OTA update.

1. Review the exact PR and its tests. Identify the specific Mintenance accounts approved for this
   mobile beta; resolve them to Supabase user UUIDs using an authorized read-only lookup. Do not
   infer membership from signup, role, subscription/early-access entitlements, user metadata or a
   Vercel team account.
2. In Supabase server secrets configure `MOBILE_BETA_USER_IDS` as a comma-separated list of only
   those UUIDs, and `MOBILE_RELAY_VERCEL_BYPASS` as a dedicated Vercel automation bypass scoped to
   this project. Keep both server-only. Never put a bypass token in `EXPO_PUBLIC_*`, Expo extras,
   source, query strings or an APK. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied by the
   function environment. Do not repurpose the Stripe relay's credentials.
3. Deploy only `mobile-api-relay` with `verify_jwt = true`. Do not bulk deploy functions or apply
   unrelated migrations. Verify missing JWT, invalid JWT, nonmember and unconfirmed accounts cannot
   reach the upstream. Verify an approved dedicated test account can read its profile and cannot
   read another account's protected data. Verify revoked sessions are rejected upstream.
4. Only after that verification, set the app's public `EXPO_PUBLIC_MOBILE_API_GATEWAY_URL` to
   `https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/mobile-api-relay`. It must match the app's
   configured Supabase project; the resolver rejects a different URL. Existing `EXPO_PUBLIC_API_URL`
   can remain the protected website for other clients. No bypass credential is needed on the device.
5. Deliver tested JavaScript through a compatible Expo update or a later native build. Merely
   editing an EAS environment variable does not change an installed binary. Verify the embedded
   runtime and native fingerprint before publishing. Do not force a runtime string to claim
   compatibility.
6. On the physical APK, test cold start, sign-in, profile/dashboard reads, app restart, temporary
   network loss and genuine sign-out/revocation. Check that public website requests still reach
   Vercel authentication. Until these pass, report this as a prepared fix, not a repaired installed
   APK.

On 29 October 2026 the supplied preview channel/runtime page showed no mapped update branch for
`1.2.4-sqlcipher1`. Its newest listed Android build was `1555a78c-38af-4dcf-b4b4-bd9c2b416035`,
created 12 October from `c1a784f*`. Expo reported that its artifact and logs expired on 26 October.
The asterisk denotes uncommitted build-source changes. The supplied fingerprint was
`3a9d6378a7dc7b97c98ee85893c2cea008c478a0`; current-source compatibility is not established by the
matching app version or runtime alone. Do not publish a current-main OTA blindly. No Android cloud
retries until the known quota resets on 1 November; no paid upgrade.

Rollback: disable the relay by removing its beta allowlist or dedicated server bypass setting, and
roll back the app update through the reviewed Expo release process. Keep the session-preservation
fix. Vercel website protection stays on.

## Local verification

```sh
node --import tsx --test supabase/functions/mobile-api-relay/handler.test.ts
node node_modules/jest/bin/jest.js --config apps/mobile/jest.config.js --runInBand --runTestsByPath apps/mobile/src/utils/__tests__/mobileApiClient.test.ts
```

These use synthetic identities and mocked network calls; they do not prove production admission,
device behavior, payments or native compatibility.
