# Phase 3 Dependency Security Triage

Date: 2026-09-01  
Command: `npm audit --omit=dev --json` using the repository lockfile.

## Inventory

The production dependency tree reports 61 findings: 2 low, 31 moderate, 28 high, and 0 critical.
Phase 2 reported 76 findings for the complete tree; the difference is development/tooling-only
findings excluded by `--omit=dev`. No `npm audit fix --force` or mass upgrade was run.

## Prioritised triage

| Priority                  | Package/path                                                                               | Exposure assessment                                                                                                                                                                                                   | Action                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 before controlled beta | `postcss` through Next/Expo; `undici`; `@grpc/grpc-js`                                     | Includes path/source-map disclosure, HTTP/header/response handling, or network DoS advisories. Reachability depends on whether attacker-controlled CSS/source maps, HTTP responses, or gRPC inputs reach those paths. | Reproduce/confirm reachable production paths, then upgrade the smallest compatible direct chain. Do not jump Expo major versions during this audit.      |
| P1 before controlled beta | `react-native`/Metro/Jest chain, `ws`                                                      | High advisories are largely runtime/dev-server/test-tool transitive paths; mobile production bundle reachability is not established by npm audit alone.                                                               | Confirm bundled versus development-only inclusion in an Android release build; coordinate an Expo-compatible upgrade if production-reachable.            |
| P2 before public beta     | `dompurify`                                                                                | Moderate XSS-related advisories affect particular sanitizer modes and attacker-controlled markup contexts.                                                                                                            | Audit actual sanitizer configuration and upgrade within the current Next-compatible range; add a focused regression test if the vulnerable mode is used. |
| P2 before public beta     | `@google-cloud/storage` chain (`retry-request`, `teeny-request`, `uuid`)                   | Direct web dependency with transitive network/UUID advisories; production reachability depends on storage routes.                                                                                                     | Check route usage, update compatible direct dependency, and test upload/download paths.                                                                  |
| P2 before public beta     | `protobufjs`                                                                               | Moderate parser/DoS advisories; likely transitive tooling/runtime path.                                                                                                                                               | Identify callers and input exposure before upgrading.                                                                                                    |
| P3 maintenance            | `@babel/core`, navigation/query-string, `nanoid`, `xcode`, OpenTelemetry, `@sentry/nextjs` | Low/moderate findings or upgrade paths requiring unrelated major framework movement.                                                                                                                                  | Track compatible fixes; avoid unrelated dependency churn in Phase 3.                                                                                     |

## Direct dependencies identified

The audit marks `next`, `react-native`, `@react-navigation/native`, `@google-cloud/storage`,
`dompurify`, `@remotion/cli`, and Expo/mobile packages as direct or top-level application
dependencies. Several high findings are transitive through Expo, React Native, Jest, Metro,
Remotion, Sentry, or Google Cloud libraries. A direct package name in the advisory does not by
itself prove runtime exploitability.

## Beta decision impact

No dependency finding was silently dismissed. The current evidence supports P1 reachability review
before controlled beta for server-side HTTP/CSS/source map and any exposed upload/network paths.
Framework-wide upgrades are not safe to perform opportunistically because they can change Expo/React
Native compatibility and exceed Phase 3 scope.
