# Mobile TLS Certificate Pinning Runbook

Tracks MSV-P1-7 from the 2026-04-13 audit. Deferred from Sprint 4 to a dedicated PR because Expo
managed workflow requires a custom dev client to ship runtime pinning, and the cert rotation
playbook must be in place before rollout or a forgotten renewal will brick production clients in the
field.

## Why not in Sprint 4

The mobile app is on Expo SDK 54 (managed workflow). Expo's stock Hermes runtime does not expose
native `URLSession` / `OkHttp` configuration to JavaScript, so a runtime pinning library
(`react-native-ssl-pinning`, `@tradle/react-native-ssl-pinning`) requires native module integration.
That means:

1. **Custom dev client** built via EAS (`eas build --profile development`) — the community
   `expo-dev-client` with the pinning plugin attached.
2. **Store-signed production builds** rebuilt with the native module.
3. **Cert rotation playbook**: mobile clients that ship a hardcoded public key hash will refuse to
   connect when the backend cert rotates unless we stage a multi-hash rollout. Without the playbook,
   a renewal on the web side can silently brick every field contractor's phone.

## What Sprint 4 already did

- Environment validation (`apps/mobile/src/utils/EnvironmentSecurity.ts`) hard-fails builds if an
  API key leaks into the mobile bundle.
- Supabase client uses the anon key only. Service role never reaches mobile.
- Auth tokens stored in `expo-secure-store` (Keychain / EncryptedSharedPrefs), not `AsyncStorage`.
- Photo upload now retries on transient network failure (MSV-P1-8) and surfaces "No Internet
  Connection" early (MUI-P1-2), reducing the window where a MITM proxy could silently relay
  requests.

None of this replaces pinning, but the residual risk without pinning is **MITM on an actively
compromised WiFi network**, not "credentials exposed at rest" or "service role leaked."

## Proposed approach (dedicated PR)

1. **Pick a library**: `react-native-ssl-pinning` is the most battle-tested and has an Expo config
   plugin. Verify against Expo SDK 54 compatibility in the Expo community matrix.

2. **Add native config via `expo-build-properties` in `app.config.js`**:

   ```js
   plugins: [
     [
       'expo-build-properties',
       {
         ios: {
           // Network Security → ATS pinning dictionary
         },
         android: {
           // res/xml/network_security_config.xml with pin-set
         },
       },
     ],
     'react-native-ssl-pinning',
   ],
   ```

3. **Hash sources**:
   - Production API: `api.mintenance.com`
   - Supabase project: `ukrjudtlvapiajkjbcrd.supabase.co`
   - Include BOTH current and next-rotation public key hashes so a single renewal does not brick
     clients that have not updated.

4. **Env wiring**: read hashes from `EXPO_PUBLIC_API_CERT_HASH`, `EXPO_PUBLIC_API_CERT_HASH_BACKUP`,
   `EXPO_PUBLIC_SUPABASE_CERT_HASH`, `EXPO_PUBLIC_SUPABASE_CERT_HASH_BACKUP`. Do not hardcode.

5. **Rollout gating**: ship behind a feature flag (`EXPO_PUBLIC_CERT_PINNING_ENABLED`) so staging
   can validate without risking prod. Enable in staging first, soak for one release cycle, then
   enable in prod.

6. **Cert rotation playbook**:
   - 60 days before cert expiry: generate new cert with overlap window.
   - 45 days before: publish new mobile build containing the new hash in the backup slot.
   - 30 days before: force update minimum version so at least 95% of clients have the new hash
     (monitor via Expo update checks).
   - 0 days: swap the cert server-side; clients seamlessly accept the new hash from their backup
     slot.
   - 7 days after: another mobile build rotates backup slot to the next-next hash.

7. **Verify**:
   - Dev client connects normally.
   - Run `mitmproxy` against a staging build with pinning ON — connection must fail.
   - Run `mitmproxy` against a dev build with pinning OFF — connection must succeed (sanity check
     that the flag is respected).
   - Rotate staging cert with only one hash configured — clients fail; verify the
     graceful-degradation error message reaches users.
   - Rotate staging cert with both hashes configured — clients succeed.

## Tracking

- **Sprint**: post-Sprint 6 (after PostGIS schema move + storage policy hardening clears the
  remaining DB advisor warnings).
- **Owner**: mobile lead.
- **Blocking criterion for prod deploy**: none. Residual risk is acceptable for the "not on hostile
  WiFi" assumption. Not blocking Sprint 4 merge.
- **Dependency**: Cert rotation playbook (this document, plus ops runbook in `docs/OPS_RUNBOOK.md`
  when that exists).
