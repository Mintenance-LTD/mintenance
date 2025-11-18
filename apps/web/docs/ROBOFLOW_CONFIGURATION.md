# Roboflow Configuration Guide

**Last Updated:** January 2025  
**Purpose:** Configuration and management of Roboflow object detection service

---

## Environment Variables

### Required Variables

All Roboflow-related environment variables use the `ROBOFLOW_` prefix for consistency:

```bash
# Roboflow API Key (required)
ROBOFLOW_API_KEY=your_roboflow_api_key_here

# Model ID (required)
# Example: building-defect-detection-7-ks0im
ROBOFLOW_MODEL_ID=building-defect-detection-7-ks0im

# Model Version (required)
# This is the version number in the Roboflow detect URL (e.g., /1, /2, /3)
# Update this value whenever a new model version is trained and deployed
ROBOFLOW_MODEL_VERSION=1

# Request Timeout (optional, default: 10000ms)
ROBOFLOW_TIMEOUT_MS=10000
```

### Where These Are Used

- **Configuration File:** `apps/web/lib/config/roboflow.config.ts`
  - `getRoboflowConfig()` - Reads all env variables
  - `validateRoboflowConfig()` - Validates configuration
  - `logRoboflowConfig()` - Logs config on startup

- **Service:** `apps/web/lib/services/building-surveyor/RoboflowDetectionService.ts`
  - Uses config to make detection API calls
  - Validates config before processing images

- **Startup:** `apps/web/instrumentation.ts`
  - Logs Roboflow model info when server starts

### Environment Files

These variables should be set in:
- `.env.local` (local development)
- `.env.staging` (staging environment)
- `.env.production` (production environment)
- `.env.server` (if used for server-specific config)

**Important:** All environments should use the **same variable names** for consistency.

---

## Updating Model Version

When a new Roboflow model version is trained and deployed:

### Step 1: Update Environment Variable

In your environment file (`.env.local`, `.env.production`, etc.), update:

```bash
ROBOFLOW_MODEL_VERSION=2  # Change from 1 to 2 (or whatever the new version is)
```

### Step 2: Restart Server

The configuration is read at runtime, so restart your Next.js server:

```bash
# Development
npm run dev

# Production
# Redeploy or restart your server process
```

### Step 3: Verify

Check server logs on startup. You should see:

```
[INFO] Roboflow model configured {
  service: 'RoboflowConfig',
  modelId: 'building-defect-detection-7-ks0im',
  modelVersion: '2',  // ← Should show new version
  baseUrl: 'https://detect.roboflow.com',
  timeoutMs: 10000
}
```

### That's It!

No code changes needed. The system automatically uses the new model version from the environment variable.

---

## Misconfiguration Handling

### What Happens If Roboflow Is Misconfigured?

The system is designed to **fail safely** - it will not crash if Roboflow is misconfigured.

#### Startup Behavior

On server startup, the system logs:

- **If configured correctly:**
  ```
  [INFO] Roboflow model configured { modelId: '...', modelVersion: '...' }
  ```

- **If misconfigured:**
  ```
  [WARN] Roboflow not configured - detections will be skipped {
    error: 'ROBOFLOW_API_KEY is missing'  // or other specific error
  }
  ```

#### Runtime Behavior

When `RoboflowDetectionService.detect()` is called:

1. **Configuration is validated** using `validateRoboflowConfig()`
2. **If invalid:**
   - Logs a warning with the specific error
   - Returns an empty array `[]` (no detections)
   - Does NOT throw an error
   - Does NOT crash the server
3. **Downstream services** (like GPT-4 Vision) continue to work
   - They receive zero detections
   - Safety policies can escalate if needed
   - The building surveyor service continues processing

### Validation Rules

The system validates:

1. **ROBOFLOW_API_KEY** - Must be a non-empty string
2. **ROBOFLOW_MODEL_ID** - Must be a non-empty string
3. **ROBOFLOW_MODEL_VERSION** - Must be a positive integer (e.g., "1", "2", "3")
   - Invalid examples: "abc", "0", "-1", "1.5"

### Error Messages

Clear, human-readable error messages are provided:

- `"ROBOFLOW_API_KEY is missing"`
- `"ROBOFLOW_MODEL_ID is missing"`
- `"ROBOFLOW_MODEL_VERSION is missing"`
- `"ROBOFLOW_MODEL_VERSION must be a positive integer, got 'abc'"`

---

## Configuration File Reference

### `apps/web/lib/config/roboflow.config.ts`

**Exports:**

- `getRoboflowConfig(): RoboflowConfig` - Gets config from env vars
- `validateRoboflowConfig(config?): RoboflowConfigValidation` - Validates config
- `logRoboflowConfig(): void` - Logs config on startup (safe, non-throwing)

**Types:**

```typescript
interface RoboflowConfig {
  readonly apiKey: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly baseUrl: string;      // Default: "https://detect.roboflow.com"
  readonly timeoutMs: number;     // Default: 10000
}

interface RoboflowConfigValidation {
  valid: boolean;
  error?: string;
}
```

---

## Troubleshooting

### Issue: "Roboflow not configured" warning

**Check:**
1. Environment variables are set in the correct `.env` file
2. Server was restarted after changing env vars
3. Variable names are correct (case-sensitive, `ROBOFLOW_` prefix)

### Issue: "ROBOFLOW_MODEL_VERSION must be a positive integer"

**Fix:**
- Ensure `ROBOFLOW_MODEL_VERSION` is a number like "1", "2", "3"
- Not "1.0", "v1", or any other format

### Issue: Detections not working

**Check:**
1. API key is valid and has access to the model
2. Model ID matches your Roboflow project
3. Model version exists in Roboflow
4. Check server logs for specific error messages

---

## Summary

- **Env Keys:** `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL_ID`, `ROBOFLOW_MODEL_VERSION`, `ROBOFLOW_TIMEOUT_MS`
- **Update Model Version:** Change `ROBOFLOW_MODEL_VERSION` env var and restart server
- **Misconfiguration:** System logs warning, returns empty detections, continues gracefully

