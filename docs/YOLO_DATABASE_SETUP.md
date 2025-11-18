# YOLO Model Database Storage Setup

**Date:** March 1, 2025  
**Purpose:** Guide for storing YOLO model in PostgreSQL database

---

## ⚠️ Important Warning

**Storing a 10.20 MB model in PostgreSQL is NOT recommended for production.**

**Why?**
- Database bloat (10MB+ in every backup)
- Slower database queries
- Backup/restore issues
- Better alternatives exist (Supabase Storage, file system)

**When to use:**
- Single server deployment
- Need transactional model updates
- Database is only storage option available

**Recommended:** Use Supabase Storage instead (see `YOLO_MODEL_STORAGE_OPTIONS.md`)

---

## Setup Steps

### Step 1: Run Database Migration

```bash
# Apply migration to create yolo_models table
npm run migrate apply
```

Or manually run:
```sql
-- File: supabase/migrations/20250301000004_add_yolo_models_table.sql
```

### Step 2: Upload Model to Database

```bash
# Using the upload script
ts-node scripts/upload-yolo-to-database.ts
```

This will:
- Read `apps/web/models/yolov11.onnx`
- Upload to `yolo_models` table
- Store as BYTEA

### Step 3: Configure Environment

Add to `.env.local`:

```bash
# Enable local YOLO
USE_LOCAL_YOLO=true

# Load from database instead of file
YOLO_LOAD_FROM_DATABASE=true
YOLO_DATABASE_MODEL_NAME=yolov11

# Optional: File path (ignored if loadFromDatabase=true)
# YOLO_MODEL_PATH=./models/yolov11.onnx

# Other settings
YOLO_DATA_YAML_PATH=./Building Defect Detection 7.v2i.yolov11/data.yaml
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45
```

### Step 4: Restart Server

```bash
cd apps/web
npm run dev
```

The service will:
1. Load model from database on startup
2. Save to temporary file (ONNX Runtime requires file path)
3. Initialize ONNX Runtime with temp file

---

## How It Works

### Database Schema

```sql
CREATE TABLE yolo_models (
  id UUID PRIMARY KEY,
  model_name VARCHAR(100) UNIQUE,
  model_version VARCHAR(20),
  model_data BYTEA,        -- Binary model file
  file_size BIGINT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Loading Process

1. **Server Startup:**
   - `RoboflowDetectionService.initialize()` called
   - Checks `YOLO_LOAD_FROM_DATABASE=true`
   - Calls `LocalYOLOInferenceService.initialize()`

2. **Database Query:**
   - Queries `yolo_models` table
   - Retrieves `model_data` BYTEA
   - Converts to Buffer

3. **Temporary File:**
   - Saves to OS temp directory
   - ONNX Runtime loads from file path
   - File cleaned up on server restart

4. **Model Ready:**
   - ONNX Runtime initialized
   - Ready for inference

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_LOCAL_YOLO` | Yes | `false` | Enable local inference |
| `YOLO_LOAD_FROM_DATABASE` | No | `false` | Load from DB vs file |
| `YOLO_DATABASE_MODEL_NAME` | No* | `yolov11` | Model name in DB |
| `YOLO_MODEL_PATH` | No* | - | File path (if not using DB) |

*Required if `YOLO_LOAD_FROM_DATABASE=false`

---

## Updating the Model

### Option 1: Replace in Database

```typescript
import { serverSupabase } from '@/lib/api/supabaseServer';
import { readFileSync } from 'fs';

const modelBuffer = readFileSync('apps/web/models/yolov11-v2.onnx');

await serverSupabase
  .from('yolo_models')
  .upsert({
    model_name: 'yolov11',
    model_version: '2.0',
    model_data: modelBuffer,
    file_size: modelBuffer.length,
  }, {
    onConflict: 'model_name',
  });
```

### Option 2: Use Upload Script

```bash
# Update model file first, then:
ts-node scripts/upload-yolo-to-database.ts
```

---

## Monitoring

### Check Model Size

```sql
SELECT 
  model_name,
  model_version,
  pg_size_pretty(file_size) as size,
  created_at,
  updated_at
FROM yolo_models;
```

### Check Database Size Impact

```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('yolo_models')) as table_size;
```

---

## Troubleshooting

### Error: "Model not found in database"

**Solution:**
1. Verify model uploaded: `SELECT * FROM yolo_models;`
2. Check model name matches `YOLO_DATABASE_MODEL_NAME`
3. Re-upload if needed: `ts-node scripts/upload-yolo-to-database.ts`

### Error: "Failed to load model from database"

**Solution:**
1. Check database connection
2. Verify `yolo_models` table exists
3. Check RLS policies (if enabled)
4. Review server logs for detailed error

### Performance Issues

**If database queries are slow:**
- Model is large (10MB+)
- Consider using Supabase Storage instead
- Or use file system storage

---

## Migration Back to File System

If you want to switch back to file system:

1. Update `.env.local`:
   ```bash
   USE_LOCAL_YOLO=true
   YOLO_LOAD_FROM_DATABASE=false
   YOLO_MODEL_PATH=./models/yolov11.onnx
   ```

2. Restart server

---

## Comparison

| Aspect | File System | Database | Supabase Storage |
|--------|-------------|----------|------------------|
| **Load Time** | ~50ms | ~100-300ms | ~200-500ms |
| **DB Impact** | None | +10MB | None |
| **Update Ease** | Manual | Easy | Easy |
| **Multi-Server** | ❌ | ✅ | ✅ |
| **Recommended** | Dev | ⚠️ | Production |

---

## Next Steps

1. ✅ Run migration: `npm run migrate apply`
2. ✅ Upload model: `ts-node scripts/upload-yolo-to-database.ts`
3. ✅ Configure `.env.local`
4. ✅ Restart server
5. 🧪 Test inference

---

## See Also

- [Storage Options Comparison](./YOLO_MODEL_STORAGE_OPTIONS.md)
- [Local YOLO Setup](./LOCAL_YOLO_SETUP.md)
- [Quick Start Guide](./LOCAL_YOLO_QUICK_START.md)

