# 📊 Apply YOLO Models Metadata Table Migration

## Quick Steps to Apply the Migration

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run the Migration
Copy the entire contents of:
```
supabase/migrations/20251217000003_create_yolo_models_metadata_table.sql
```

And paste it into the SQL Editor, then click **Run**.

### Step 3: Verify the Migration
After running, you should see success messages:
- ✅ YOLO models metadata table created successfully
- 📊 View created: yolo_models_comparison
- 🔄 Automatic model activation/deactivation triggers added
- 📝 Initial v1.0.0 model recorded in database

---

## What This Migration Creates

### 1. **yolo_models Table**
Tracks all your YOLO model versions with:
- Version numbers (v1.0.0, v2.0.0, etc.)
- Performance metrics (mAP50, precision, recall)
- Training configuration
- Active/inactive status
- Upload timestamps

### 2. **Automatic Features**
- **Only one active model**: When you upload a new model and mark it active, the old one is automatically deactivated
- **Timestamp updates**: `updated_at` automatically updates on changes
- **Version uniqueness**: Can't upload two models with the same version

### 3. **Comparison View**
A simplified view for comparing models:
```sql
SELECT * FROM yolo_models_comparison;
```

Shows you all models side-by-side with their metrics.

---

## After Migration: Verify Your Model

### Check the Table
Run this query in SQL Editor:
```sql
SELECT
    version,
    filename,
    file_size / 1024 / 1024 as size_mb,
    metrics->>'mAP50' as map50,
    is_active,
    created_at
FROM yolo_models
ORDER BY created_at DESC;
```

You should see your v1.0.0 model:
```
version  | filename     | size_mb | map50 | is_active | created_at
---------|--------------|---------|-------|-----------|--------------------
v1.0.0   | latest.onnx  | 10.20   | 0.45  | true      | 2025-12-17 09:42:39
```

### Check the Comparison View
```sql
SELECT * FROM yolo_models_comparison;
```

---

## Future Model Uploads

When you upload new models, the metadata will be automatically tracked. You can also manually add model records:

```sql
INSERT INTO yolo_models (
    version,
    filename,
    storage_path,
    file_size,
    metrics,
    training_config,
    is_active,
    description
) VALUES (
    'v2.0.0',
    'yolo-v2-improved.onnx',
    'yolo-models/yolo-v2-improved.onnx',
    15728640, -- 15 MB in bytes
    '{
        "mAP50": 0.52,
        "mAP50_95": 0.35,
        "precision": 0.65,
        "recall": 0.60
    }'::jsonb,
    '{
        "architecture": "YOLOv11s",
        "input_size": 640,
        "technique": "progressive_unfreezing",
        "epochs": 60
    }'::jsonb,
    true, -- This will deactivate v1.0.0 automatically
    'Improved model with progressive unfreezing training'
);
```

---

## Useful Queries

### View All Models and Their Performance
```sql
SELECT
    version,
    (metrics->>'mAP50')::numeric as map50,
    (metrics->>'precision')::numeric as precision,
    (metrics->>'recall')::numeric as recall,
    is_active,
    description
FROM yolo_models
ORDER BY (metrics->>'mAP50')::numeric DESC;
```

### Get Currently Active Model
```sql
SELECT
    version,
    storage_path,
    metrics,
    created_at
FROM yolo_models
WHERE is_active = true;
```

### Compare Models Performance
```sql
SELECT
    version,
    (metrics->>'mAP50')::numeric as map50,
    ROUND(file_size / 1024.0 / 1024.0, 2) as size_mb,
    (training_config->>'architecture') as architecture,
    is_active
FROM yolo_models
ORDER BY created_at DESC;
```

### Model Upload History
```sql
SELECT
    version,
    description,
    to_char(created_at, 'YYYY-MM-DD HH24:MI') as uploaded_at,
    CASE
        WHEN is_active THEN '✅ Active'
        ELSE '⏸️ Inactive'
    END as status
FROM yolo_models
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Error: "relation already exists"
If the table already exists, you can drop and recreate:
```sql
DROP TABLE IF EXISTS yolo_models CASCADE;
-- Then run the migration again
```

### Error: "column does not exist"
Make sure you're running the complete migration script, not just parts of it.

### Check Table Structure
```sql
\d yolo_models;
-- Or in Supabase:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yolo_models'
ORDER BY ordinal_position;
```

---

## Benefits of This Table

1. **Version Control**: Track all model versions and their performance
2. **Easy Comparison**: Compare metrics across different training runs
3. **Rollback Support**: Deactivate bad models and reactivate older ones
4. **Documentation**: Store descriptions and training configs
5. **Monitoring**: Track which model is currently being used in production
6. **Analytics**: Analyze model performance trends over time

**Your YOLO models are now fully tracked and manageable! 🎉**