# GCP Bucket Setup - Required Permissions

This document outlines the required Google Cloud Platform (GCP) permissions for creating and managing Cloud Storage buckets using the `create-gcp-buckets.ts` script.

## Overview

The bucket creation script requires specific IAM permissions to:
- Create Cloud Storage buckets
- Configure bucket settings (versioning, lifecycle policies)
- Set IAM policies (make buckets private)
- List and verify bucket existence

## Required IAM Roles

### Option 1: Storage Admin (Recommended for Development)

**Role:** `roles/storage.admin`

**Permissions Included:**
- `storage.buckets.create` - Create buckets
- `storage.buckets.get` - Get bucket metadata
- `storage.buckets.list` - List buckets
- `storage.buckets.update` - Update bucket configuration
- `storage.buckets.delete` - Delete buckets (not used by script, but included in role)
- `storage.buckets.setIamPolicy` - Set bucket IAM policies
- `storage.objects.*` - Full object access (not strictly needed for bucket creation)

**Grant Command:**
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/storage.admin"
```

### Option 2: Custom Role (Minimal Permissions - Recommended for Production)

Create a custom role with only the permissions needed:

**Required Permissions:**
- `storage.buckets.create`
- `storage.buckets.get`
- `storage.buckets.list`
- `storage.buckets.update`
- `storage.buckets.setIamPolicy`

**Create Custom Role:**
```bash
# Create custom role definition file (bucket-manager-role.yaml)
cat > bucket-manager-role.yaml << EOF
title: "Bucket Manager"
description: "Minimal permissions for bucket creation and management"
stage: "GA"
includedPermissions:
- storage.buckets.create
- storage.buckets.get
- storage.buckets.list
- storage.buckets.update
- storage.buckets.setIamPolicy
EOF

# Create the custom role
gcloud iam roles create bucketManager \
  --project=PROJECT_ID \
  --file=bucket-manager-role.yaml

# Grant the custom role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="projects/PROJECT_ID/roles/bucketManager"
```

### Option 3: Service Account (Recommended for CI/CD)

For automated deployments, use a service account:

**Create Service Account:**
```bash
# Create service account
gcloud iam service-accounts create bucket-setup-sa \
  --display-name="Bucket Setup Service Account" \
  --project=PROJECT_ID

# Grant Storage Admin role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:bucket-setup-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key (for local use)
gcloud iam service-accounts keys create key.json \
  --iam-account=bucket-setup-sa@PROJECT_ID.iam.gserviceaccount.com \
  --project=PROJECT_ID

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
```

## Permission Details

### Storage Bucket Permissions

| Permission | Purpose | Required For |
|------------|---------|--------------|
| `storage.buckets.create` | Create new buckets | Bucket creation |
| `storage.buckets.get` | Read bucket metadata | Verify bucket exists, read configuration |
| `storage.buckets.list` | List all buckets | Verification step |
| `storage.buckets.update` | Update bucket settings | Configure versioning, lifecycle policies |
| `storage.buckets.setIamPolicy` | Set bucket IAM policies | Make buckets private |

### Additional Required Permissions

**For Application Default Credentials:**
- `iam.serviceAccounts.getAccessToken` - Required for ADC to work
- `iam.serviceAccounts.actAs` - Required if using service account impersonation

## Testing Permissions

### Verify Current Permissions

```bash
# Test if you can list buckets
gsutil ls

# Test if you can create a bucket (will fail if no permission)
gsutil mb -p PROJECT_ID -l REGION gs://test-bucket-permissions

# Clean up test bucket
gsutil rb gs://test-bucket-permissions
```

### Use the Test Script

The project includes a test script to verify permissions:

```bash
npm run test:gcp-auth
```

This will test:
- Authentication setup
- Storage API access
- Vertex AI API access

## Common Permission Issues

### Error: "Permission denied on resource"

**Cause:** Missing `storage.buckets.create` permission

**Solution:**
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/storage.admin"
```

### Error: "403 Forbidden" when setting IAM policy

**Cause:** Missing `storage.buckets.setIamPolicy` permission

**Solution:** Ensure you have Storage Admin role or custom role with this permission

### Error: "API not enabled"

**Cause:** Cloud Storage API not enabled

**Solution:**
```bash
gcloud services enable storage-api.googleapis.com --project=PROJECT_ID
```

## Security Best Practices

1. **Principle of Least Privilege**: Use custom roles with minimal permissions in production
2. **Service Accounts**: Use service accounts for automated scripts, not user accounts
3. **Audit Logging**: Enable Cloud Audit Logs to track bucket creation activities
4. **Conditional Access**: Use IAM conditions to restrict bucket creation to specific regions
5. **Regular Review**: Periodically review IAM bindings and remove unused permissions

## IAM Conditions Example

Restrict bucket creation to specific regions:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/storage.admin" \
  --condition="expression=resource.location == 'europe-west2',title=Europe West 2 Only"
```

## Troubleshooting

### Check Current Permissions

```bash
# List your IAM bindings
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_EMAIL@example.com" \
  --format="table(bindings.role)"
```

### Test with Minimal Permissions

```bash
# Try creating a bucket manually
gsutil mb -p PROJECT_ID -l europe-west2 gs://test-permissions-$(date +%s)

# If successful, delete it
gsutil rb gs://test-permissions-*
```

## References

- [Cloud Storage IAM Roles](https://cloud.google.com/storage/docs/access-control/iam-roles)
- [IAM Permissions Reference](https://cloud.google.com/storage/docs/access-control/iam-permissions)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Service Accounts Best Practices](https://cloud.google.com/iam/docs/service-accounts)

## Support

If you encounter permission issues:

1. Verify your authentication: `gcloud auth application-default login`
2. Check your project: `gcloud config get-value project`
3. Verify API is enabled: `gcloud services list --enabled`
4. Review audit logs: `gcloud logging read "resource.type=gcs_bucket" --limit 50`

