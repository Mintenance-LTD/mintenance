# YOLO Model Upload Instructions

## Current Status

✅ **Database record created**: Model `v2.0` (`best_model_final_v2.onnx`) has been inserted into the `yolo_models` table and activated.

⚠️ **File upload pending**: The 99MB model file needs to be uploaded to Supabase Storage.

## Option 1: Increase Upload Limit (Recommended)

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd
   - Go to **Settings** > **Storage**

2. **Increase Global File Size Limit**
   - Find "Global file size limit" setting
   - Change from default (50MB) to **100MB** or higher
   - Click **Save**

3. **Retry Upload Script**
   ```bash
   npm run upload:yolo -- --file best_model_final_v2.onnx --name best_model_final_v2 --version v2.0 --activate --description "Final trained YOLO model v2 - 99MB"
   ```

## Option 2: Upload via Supabase Dashboard

1. **Go to Storage in Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/storage/buckets/yolo-models
   - Click **Upload file**

2. **Upload the File**
   - Navigate to folder: `models/best_model_final_v2/v2.0/`
   - Upload file: `best_model_final_v2.onnx` (rename to `model.onnx` if needed)
   - Or upload to path: `models/best_model_final_v2/v2.0/model.onnx`

3. **Verify Upload**
   - Check that file appears in storage
   - File size should be ~99MB

4. **Update Database Record** (if path differs)
   ```sql
   UPDATE yolo_models
   SET storage_path = 'actual/path/to/file.onnx',
       storage_migration_status = 'completed',
       storage_migrated_at = now()
   WHERE version = 'v2.0';
   ```

## Option 3: Use Supabase CLI

1. **Install Supabase CLI** (if not installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Project**
   ```bash
   supabase link --project-ref ukrjudtlvapiajkjbcrd
   ```

4. **Upload File**
   ```bash
   supabase storage upload yolo-models models/best_model_final_v2/v2.0/model.onnx best_model_final_v2.onnx
   ```

## Option 4: Use S3 Protocol (Advanced)

For very large files or production use, consider using S3 protocol with multipart uploads. See Supabase documentation for S3 setup.

## Verification

After upload, verify the model is accessible:

```sql
SELECT 
  id,
  version,
  filename,
  storage_path,
  file_size,
  is_active,
  storage_migration_status
FROM yolo_models
WHERE version = 'v2.0';
```

The record should show:
- `storage_migration_status = 'completed'`
- `storage_path` pointing to the uploaded file
- `is_active = true`

## Current Database Record

- **ID**: `a6119733-7dac-4476-9aa2-c574f8842c18`
- **Version**: `v2.0`
- **Filename**: `best_model_final_v2.onnx`
- **Storage Path**: `models/best_model_final_v2/v2.0/model.onnx`
- **Status**: `deployed`
- **Active**: `true` ✅

## Next Steps

1. Upload the file using one of the methods above
2. Update `storage_migration_status` to `'completed'` if using manual upload
3. Test model loading in your application
4. Update environment variables if needed:
   - `YOLO_DATABASE_MODEL_NAME=best_model_final_v2`
   - `YOLO_DATABASE_MODEL_VERSION=v2.0`

