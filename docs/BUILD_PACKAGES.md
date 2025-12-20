# Building Packages

## Overview

The packages must be built in a specific order to ensure dependencies are available:

1. `@mintenance/types` - Defines shared types (including `Message`)
2. `@mintenance/shared` - Depends on types
3. `@mintenance/auth` - Depends on types
4. `@mintenance/design-tokens` - Standalone
5. `@mintenance/api-client` - Depends on types and shared

## Build Commands

### Individual Commands (Recommended)

Run these commands in order:

**Bash/Unix/Linux:**
```bash
npm run build -w @mintenance/types && \
npm run build -w @mintenance/shared && \
npm run build -w @mintenance/auth && \
npm run build -w @mintenance/design-tokens && \
npm run build -w @mintenance/api-client
```

**PowerShell (Windows):**
```powershell
npm run build -w @mintenance/types; if ($?) { npm run build -w @mintenance/shared; if ($?) { npm run build -w @mintenance/auth; if ($?) { npm run build -w @mintenance/design-tokens; if ($?) { npm run build -w @mintenance/api-client } } } }
```

Or run them individually:
```powershell
npm run build -w @mintenance/types
npm run build -w @mintenance/shared
npm run build -w @mintenance/auth
npm run build -w @mintenance/design-tokens
npm run build -w @mintenance/api-client
```

### Using the Build Script

Alternatively, you can use the build script directly:

```bash
node scripts/build-packages.js
```

### CI/CD Usage

For CI/CD pipelines, use the individual commands or the build script:

```bash
# Option 1: Individual commands
npm run build -w @mintenance/types && \
npm run build -w @mintenance/shared && \
npm run build -w @mintenance/auth && \
npm run build -w @mintenance/design-tokens && \
npm run build -w @mintenance/api-client

# Option 2: Build script
node scripts/build-packages.js
```

## Note on npm Workspaces

Due to npm workspaces behavior, the `npm run build:packages` command may not work as expected. Use the individual commands or the build script directly instead.

