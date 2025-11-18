# YOLO Model Storage Options

**Date:** March 1, 2025  
**Purpose:** Compare storage options for the YOLO ONNX model (10.20 MB)

---

## Storage Options Comparison

### Option 1: File System (Current - Recommended) ✅

**Current Implementation:**
- Model stored at: `apps/web/models/yolov11.onnx`
- Loaded directly from file system
- Fastest access time
- Simple to manage

**Pros:**
- ✅ Fastest loading time
- ✅ No database overhead
- ✅ Easy versioning (just replace file)
- ✅ Works with existing code

**Cons:**
- ❌ Not centralized (each server needs file)
- ❌ Requires file system access
- ❌ Harder to update across multiple instances

---

### Option 2: Supabase Storage (Recommended for Production) 🏆

**Implementation:**
- Store model in Supabase Storage bucket
- Download on server startup
- Cache locally for performance

**Pros:**
- ✅ Centralized storage
- ✅ Easy updates (upload new version)
- ✅ Works across multiple servers
- ✅ Version control via file naming
- ✅ CDN benefits (if public)
- ✅ Already using Supabase Storage in project

**Cons:**
- ⚠️ Requires download on startup
- ⚠️ Network dependency

**Best For:** Production deployments, multiple servers, easy updates

---

### Option 3: PostgreSQL BYTEA (Not Recommended) ⚠️

**Implementation:**
- Store model as BYTEA in database table
- Load from database on startup

**Pros:**
- ✅ Centralized in database
- ✅ Transactional (can version with migrations)

**Cons:**
- ❌ Database bloat (10MB+ in every backup)
- ❌ Slower than file system
- ❌ Slower database queries (larger DB size)
- ❌ Backup/restore issues
- ❌ Not designed for binary storage
- ❌ Memory overhead when querying

**Best For:** Small models (<1MB), single server, when DB is only option

---

## Recommendation

### For Development: File System ✅
Keep current implementation - simple and fast.

### For Production: Supabase Storage 🏆
Use Supabase Storage bucket for centralized model management.

---

## Implementation: Supabase Storage

### Step 1: Create Storage Bucket

```sql
-- Migration: Create YOLO models storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'yolo-models',
  'yolo-models',
  false, -- Private bucket
  52428800, -- 50MB limit (for future larger models)
  ARRAY['application/octet-stream', 'application/onnx']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Only service role can access
CREATE POLICY "Service role can manage YOLO models"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'yolo-models')
WITH CHECK (bucket_id = 'yolo-models');
```

### Step 2: Upload Model to Storage

```typescript
// scripts/upload-yolo-to-storage.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function uploadModel() {
  const modelBuffer = readFileSync('apps/web/models/yolov11.onnx');
  
  const { data, error } = await supabase.storage
    .from('yolo-models')
    .upload('yolov11.onnx', modelBuffer, {
      contentType: 'application/onnx',
      upsert: true, // Replace if exists
    });

  if (error) {
    console.error('Upload failed:', error);
    return;
  }

  console.log('✅ Model uploaded to Supabase Storage');
}
```

### Step 3: Modify LocalYOLOInferenceService

```typescript
// Load from Supabase Storage instead of file system
static async initialize(config: LocalYOLOConfig): Promise<void> {
  // Download from Supabase Storage
  const { data, error } = await supabase.storage
    .from('yolo-models')
    .download('yolov11.onnx');

  if (error) throw new Error(`Failed to download model: ${error.message}`);

  // Save to temp file or use buffer directly
  const modelBuffer = await data.arrayBuffer();
  const tempPath = path.join(os.tmpdir(), 'yolov11.onnx');
  await fs.writeFile(tempPath, Buffer.from(modelBuffer));

  // Load from temp file
  this.model = await ort.InferenceSession.create(tempPath, {
    executionProviders: ['cuda', 'cpu'],
  });
}
```

---

## Implementation: PostgreSQL BYTEA (If Required)

### Step 1: Create Migration

```sql
-- Migration: Store YOLO models in database
CREATE TABLE IF NOT EXISTS yolo_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL UNIQUE,
  model_version VARCHAR(20) NOT NULL,
  model_data BYTEA NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yolo_models_name_version 
ON yolo_models(model_name, model_version);

COMMENT ON TABLE yolo_models IS 
  'Stores YOLO ONNX model files as BYTEA. Not recommended for large models (>5MB).';
```

### Step 2: Upload Script

```typescript
// scripts/upload-yolo-to-db.ts
import { serverSupabase } from '@/lib/api/supabaseServer';
import { readFileSync } from 'fs';

async function uploadToDatabase() {
  const modelBuffer = readFileSync('apps/web/models/yolov11.onnx');
  
  const { data, error } = await serverSupabase
    .from('yolo_models')
    .upsert({
      model_name: 'yolov11',
      model_version: '1.0',
      model_data: modelBuffer,
      file_size: modelBuffer.length,
    }, {
      onConflict: 'model_name',
    })
    .select()
    .single();

  if (error) {
    console.error('Upload failed:', error);
    return;
  }

  console.log('✅ Model uploaded to database');
}
```

### Step 3: Modify Service to Load from DB

```typescript
static async initialize(config: LocalYOLOConfig): Promise<void> {
  // Load from database
  const { data, error } = await serverSupabase
    .from('yolo_models')
    .select('model_data')
    .eq('model_name', 'yolov11')
    .single();

  if (error) throw new Error(`Failed to load model: ${error.message}`);

  // Save to temp file (ONNX Runtime needs file path)
  const tempPath = path.join(os.tmpdir(), 'yolov11.onnx');
  await fs.writeFile(tempPath, Buffer.from(data.model_data));

  // Load model
  this.model = await ort.InferenceSession.create(tempPath, {
    executionProviders: ['cuda', 'cpu'],
  });
}
```

---

## Performance Comparison

| Storage Method | Load Time | DB Size Impact | Update Ease | Multi-Server |
|----------------|-----------|----------------|-------------|--------------|
| **File System** | ~50ms | None | Manual | ❌ |
| **Supabase Storage** | ~200-500ms | None | Easy | ✅ |
| **PostgreSQL BYTEA** | ~100-300ms | +10MB | Easy | ✅ |

---

## Final Recommendation

1. **Development:** Keep file system (current)
2. **Production:** Use Supabase Storage
3. **Avoid:** PostgreSQL BYTEA (unless absolutely necessary)

---

## Next Steps

If you want Supabase Storage implementation:
1. Create storage bucket migration
2. Upload model to storage
3. Modify `LocalYOLOInferenceService` to download from storage
4. Add caching to avoid re-downloading

If you want PostgreSQL BYTEA:
1. Create `yolo_models` table migration
2. Upload model to database
3. Modify service to load from database
4. **Warning:** This will increase database size significantly

