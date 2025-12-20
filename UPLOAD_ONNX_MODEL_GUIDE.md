# 📦 How to Upload ONNX Model to Supabase Storage

## Quick Start (3 Steps)

### Step 1: Prepare Your Model
First, ensure you have your trained ONNX model file ready. This should be the output from either:
- The Google Colab training notebook (`YOLO_Progressive_Training_Colab.ipynb`)
- Local training using the progressive unfreezing script
- A pre-trained model you've downloaded

The file should be named something like `best_model.onnx` or `yolo11n.onnx`.

### Step 2: Set Up Environment Variables
Make sure your `.env` file has the Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

To get these values:
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the `URL` and `service_role` key (not the `anon` key!)

### Step 3: Upload the Model
Run the upload command from your project root:

```bash
npm run upload-onnx path/to/your/model.onnx v1.0.0
```

Examples:
```bash
# Upload from Downloads folder
npm run upload-onnx ~/Downloads/best_model.onnx v1.0.0

# Upload from current directory
npm run upload-onnx ./best_model.onnx v1.0.0

# Upload without version (defaults to v1.0.0)
npm run upload-onnx ./best_model.onnx
```

---

## 🎯 What Happens During Upload

The upload script will:

1. **Create Storage Bucket** (if needed)
   - Creates a `yolo-models` bucket in Supabase Storage
   - Sets appropriate permissions and file size limits

2. **Upload Two Versions**
   - **Timestamped version**: `yolo-building-damage-v1.0.0-2024-12-17T10-30-45.onnx`
   - **Latest version**: `latest.onnx` (always points to newest model)

3. **Store Metadata**
   - Records model version, size, and metrics in database
   - Marks the model as active for production use

4. **Provide Access URLs**
   - Shows the storage path for accessing the model
   - Confirms successful upload

---

## 🔍 Verify Upload

After uploading, verify the model is available:

### Option 1: Check via Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Storage → Buckets
3. Click on `yolo-models` bucket
4. You should see your uploaded model files

### Option 2: Test in Application
The `InternalDamageClassifier` will automatically use the latest model:

```typescript
// The service automatically loads from:
// yolo-models/latest.onnx
```

### Option 3: Check via SQL Editor
Run this query in Supabase SQL Editor:

```sql
-- Check storage objects
SELECT name, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'yolo-models'
ORDER BY created_at DESC;

-- Check model metadata (if table exists)
SELECT version, filename, metrics, is_active
FROM yolo_models
ORDER BY created_at DESC;
```

---

## 🚨 Troubleshooting

### Error: "Missing Supabase credentials!"
**Solution**: Add credentials to `.env` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Error: "Model file not found"
**Solution**: Check the file path:
```bash
# Use absolute path
npm run upload-onnx /Users/username/Downloads/best_model.onnx

# Or relative path from project root
npm run upload-onnx ./models/best_model.onnx
```

### Error: "Bucket creation failed"
**Solution**: The bucket might already exist, which is fine. The script will continue.

### Error: "Upload failed: Payload too large"
**Solution**: Models larger than 100MB need bucket configuration update:
```sql
-- Run in Supabase SQL Editor
UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500MB
WHERE name = 'yolo-models';
```

---

## 📊 Model Versioning Best Practices

### Semantic Versioning
Use semantic versioning for your models:
- `v1.0.0` - Initial trained model
- `v1.1.0` - Minor improvements
- `v2.0.0` - Major architecture change

### Upload Different Versions
```bash
# Initial model
npm run upload-onnx model_initial.onnx v1.0.0

# Improved model
npm run upload-onnx model_improved.onnx v1.1.0

# New architecture
npm run upload-onnx model_v2.onnx v2.0.0
```

### Rollback if Needed
The system keeps all versions, so you can rollback by updating `latest.onnx`:
```sql
-- In Supabase Dashboard SQL Editor
-- Copy an older version to latest.onnx
```

---

## 🔄 Automatic Model Loading

Once uploaded, the `InternalDamageClassifier` service will:

1. **Check for Latest Model**
   - On first request, downloads `latest.onnx` from Supabase
   - Caches the model in memory for fast inference

2. **Use ONNX Runtime**
   - Loads model with ONNX Runtime
   - Runs inference on 640x640 images
   - Returns damage predictions

3. **Fall Back if Needed**
   - If model loading fails, falls back to GPT-4
   - Logs errors for debugging

---

## 🎯 Quick Test After Upload

Test that your model is working:

```bash
# 1. Start the development server
npm run dev

# 2. Test the API endpoint (in another terminal)
curl -X POST http://localhost:3000/api/building-surveyor/assess \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": ["https://example.com/damage.jpg"],
    "context": {
      "propertyType": "residential",
      "location": "exterior wall"
    }
  }'
```

Check the logs for:
```
✅ ONNX model loaded successfully
✅ Using internal model for inference
✅ Prediction confidence: 0.85
```

---

## 📈 Monitor Model Performance

After deployment, monitor your model:

1. **Check Drift Detection**
   - Visit `/api/admin/ai-monitoring`
   - Monitor confidence scores
   - Watch for drift alerts

2. **Review Routing Decisions**
   ```sql
   SELECT route_selected, COUNT(*), AVG(internal_confidence)
   FROM hybrid_routing_decisions
   WHERE created_at > NOW() - INTERVAL '1 day'
   GROUP BY route_selected;
   ```

3. **Track Cost Savings**
   ```sql
   -- Calculate savings from internal model usage
   SELECT
     COUNT(*) FILTER (WHERE route_selected = 'internal') * 0.01275 as saved_dollars
   FROM hybrid_routing_decisions
   WHERE created_at > NOW() - INTERVAL '1 month';
   ```

---

## 🎉 Success Checklist

After uploading, verify:

- [ ] Model uploaded to `yolo-models` bucket
- [ ] `latest.onnx` file exists
- [ ] File size is reasonable (10-50MB for YOLOv11n)
- [ ] InternalDamageClassifier loads without errors
- [ ] Hybrid routing uses internal model when confidence > 0.75
- [ ] Drift detection is tracking predictions
- [ ] Cost savings are being realized

---

## 📞 Need Help?

If you encounter issues:

1. Check the logs: `npm run dev` and look for ONNX-related messages
2. Verify Supabase connection: Test with other Supabase operations
3. Ensure model format: Must be ONNX format (`.onnx` extension)
4. Check model size: Should be under 100MB for default settings

**Your model is now ready for production inference! 🚀**