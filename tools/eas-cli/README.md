# EAS command-line tooling

This isolated lockfile keeps CI tooling separate from app dependencies. Install with
`npm ci --prefix tools/eas-cli --ignore-scripts --engine-strict` and add
`tools/eas-cli/node_modules/.bin` to PATH.

EAS 25.3.0 supports the repository's Node 20.19.4 runtime. Its autocomplete
dependency range otherwise selects 3.3.0, which requires Node 22. Pin 3.2.40
(Node >=18) until the repository deliberately upgrades Node. Keep engine checks
enabled and review/remove this override when upgrading the toolchain.

Supply `EXPO_TOKEN` only to authenticated EAS command steps, never dependency
installation. The workflows use the app-local Expo package for app exports.
