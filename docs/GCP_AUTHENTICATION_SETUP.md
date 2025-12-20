# GCP Authentication Setup Guide

This guide explains how to set up GCP authentication for the Mintenance ML training infrastructure.

## Overview

The GCP authentication system uses **Application Default Credentials (ADC)**, which means:
- ✅ No service account key files needed
- ✅ Works with organization policies that block key creation
- ✅ Secure and recommended by Google
- ✅ Works locally and in production

## Quick Start

### 1. Install gcloud CLI

**macOS:**
```bash
brew install google-cloud-sdk
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Authenticate

```bash
# Login with your Google account
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login

# Set your project
gcloud config set project mintenance-vlm-training

# Verify
gcloud config get-value project
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# GCP Configuration
GOOGLE_CLOUD_PROJECT_ID=mintenance-vlm-training
GOOGLE_CLOUD_REGION=europe-west2

# Storage Buckets
GCP_TRAINING_DATA_BUCKET=mintenance-training-data
GCP_MODEL_ARTIFACTS_BUCKET=mintenance-model-artifacts

# Compute Configuration (optional)
GCP_MACHINE_TYPE=n1-standard-8
GCP_ACCELERATOR_TYPE=nvidia-tesla-v100
GCP_ACCELERATOR_COUNT=1
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Test Authentication

```bash
npm run test:gcp-auth
```

You should see:
```
🔐 Testing GCP Authentication Setup
==================================================
Project ID: mintenance-vlm-training
Region: europe-west2
==================================================

📊 Test Results:

1️⃣  Authentication Test:
   ✅ PASSED
   Project: mintenance-vlm-training
   Method: Application Default Credentials

2️⃣  Storage Access Test:
   ✅ PASSED
   Found X buckets:
     - mintenance-training-data
     ...

3️⃣  Vertex AI Access Test:
   ✅ PASSED
   Vertex AI API access verified

==================================================
🎉 All tests passed! GCP authentication is configured correctly.
```

## How It Works

### Application Default Credentials (ADC)

ADC automatically searches for credentials in this order:

1. **Environment variable** (`GOOGLE_APPLICATION_CREDENTIALS`) - if set
2. **gcloud CLI** (`gcloud auth application-default login`) - local development
3. **GCE metadata service** - if running on Google Compute Engine
4. **Cloud Run/Cloud Functions** - service account attached to the service
5. **GKE Workload Identity** - if using Kubernetes

### Code Usage

```typescript
import { GCPAuthService } from '@/lib/services/gcp/GCPAuthService';
import { gcpConfig } from '@/lib/config/gcp.config';

// Get authenticated Storage client
const storage = await GCPAuthService.getStorageClient();

// Get authenticated Vertex AI client
const vertexAI = await GCPAuthService.getVertexAIClient();

// Test authentication
const result = await GCPAuthService.testAuth();
```

## Troubleshooting

### Error: "Could not load default credentials"

**Solution:**
```bash
gcloud auth application-default login
```

### Error: "Project not found"

**Solution:**
```bash
# Verify project ID
gcloud config get-value project

# Set correct project
gcloud config set project mintenance-vlm-training
```

### Error: "Permission denied"

**Solution:**
1. Verify you're logged in: `gcloud auth list`
2. Check project access: `gcloud projects list`
3. Ensure APIs are enabled (see below)

### Error: "API not enabled"

**Solution:**
Enable required APIs:
```bash
gcloud services enable \
  aiplatform.googleapis.com \
  storage-component.googleapis.com \
  storage-api.googleapis.com
```

## Required APIs

Make sure these APIs are enabled in your GCP project:

- ✅ Vertex AI API (`aiplatform.googleapis.com`)
- ✅ Cloud Storage API (`storage-component.googleapis.com`)
- ✅ Cloud Storage JSON API (`storage-api.googleapis.com`)
- ✅ Compute Engine API (`compute.googleapis.com`)

Enable via Console: https://console.cloud.google.com/apis/library

Or via CLI:
```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable compute.googleapis.com
```

## Production Deployment

### Cloud Run / Cloud Functions

When deploying to Cloud Run or Cloud Functions, attach a service account:

```bash
gcloud run deploy mintenance-web \
  --service-account=mintenance-ml-service@mintenance-vlm-training.iam.gserviceaccount.com \
  --region=europe-west2
```

The service will automatically use the attached service account - no code changes needed!

### GKE (Kubernetes)

Use Workload Identity to bind Kubernetes service accounts to GCP service accounts.

## Security Best Practices

1. ✅ **Never commit credentials** - Use ADC instead
2. ✅ **Use least privilege** - Only grant necessary roles
3. ✅ **Rotate credentials** - Re-authenticate periodically
4. ✅ **Monitor access** - Check Cloud Audit Logs

## Files Created

- `apps/web/lib/services/gcp/GCPAuthService.ts` - Authentication service
- `apps/web/lib/config/gcp.config.ts` - Configuration
- `scripts/test-gcp-auth.ts` - Test script

## Next Steps

1. ✅ Set up authentication (this guide)
2. Create Cloud Storage buckets
3. Enable Vertex AI API
4. Export training data
5. Begin Phase 2 fine-tuning

For more details, see: `docs/PHASE_2_PREPARATION.md`

