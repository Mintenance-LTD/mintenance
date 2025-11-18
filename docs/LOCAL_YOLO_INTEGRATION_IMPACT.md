# Local YOLO Model Integration Impact Analysis

**Last Updated:** March 1, 2025  
**Purpose:** Analyze the impact of integrating local YOLO model weights into `RoboflowDetectionService`

---

## Current Architecture

### Current Implementation (Roboflow Hosted API)

```83:114:apps/web/lib/services/building-surveyor/RoboflowDetectionService.ts
  private static async fetchDetections(
    imageUrl: string,
    config: ReturnType<typeof getRoboflowConfig>,
  ): Promise<DetectionResponse> {
    const searchParams = new URLSearchParams({
      api_key: config.apiKey,
      image: imageUrl,
    });

    const endpoint = `${config.baseUrl}/${config.modelId}/${config.modelVersion}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Roboflow request failed (${response.status}): ${errorText}`);
      }

      return (await response.json()) as DetectionResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
```

**Current Flow:**
1. **HTTP Request** → Roboflow API (`https://detect.roboflow.com`)
2. **Remote Inference** → Model runs on Roboflow servers
3. **JSON Response** → Detections returned via API
4. **No Local Resources** → No GPU/CPU/memory usage on your server

---

## What Would Change with Local YOLO Weights

### 1. **Architecture Transformation**

#### Current: API-Based (Stateless)
```
Image URLs → HTTP Request → Roboflow API → JSON Response → Detections
```

#### New: Local Inference (Stateful)
```
Image URLs → Download Images → Preprocess → Local YOLO Model → Postprocess → Detections
```

### 2. **Required Infrastructure Changes**

#### A. **Model Loading & Management**
- **Model File Storage**: Need to store `.pt` (PyTorch) or `.onnx` (ONNX) weights
- **Model Initialization**: Load model into memory on service startup
- **Model Versioning**: Track which weights version is active
- **Memory Management**: Model stays in memory (GPU or CPU RAM)

#### B. **Inference Runtime Options**

**Option 1: Node.js with ONNX Runtime (Recommended)**
```typescript
// Would need to add:
import * as ort from 'onnxruntime-node';

class LocalYOLODetectionService {
  private static model: ort.InferenceSession | null = null;
  
  static async initializeModel(modelPath: string) {
    this.model = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cuda', 'cpu'], // GPU if available
    });
  }
  
  static async detect(imageUrls: string[]) {
    // Download images, preprocess, run inference, postprocess
  }
}
```

**Option 2: Python Microservice (Alternative)**
- Create separate Python service with FastAPI/Flask
- Run YOLO inference in Python (better ecosystem support)
- Communicate via HTTP/gRPC from Node.js
- Requires separate deployment and process management

**Option 3: TensorFlow.js (Limited)**
- Convert YOLO to TensorFlow.js format
- Run in Node.js with limited GPU support
- May have performance limitations

#### C. **Image Processing Pipeline**

**Current (API):**
- Just sends URL to Roboflow
- No image processing needed

**New (Local):**
```typescript
// Required steps:
1. Download image from URL (or read from file system)
2. Decode image (JPEG/PNG → RGB array)
3. Resize to model input size (e.g., 640x640)
4. Normalize pixel values (0-255 → 0-1 or -1 to 1)
5. Convert to tensor format (NCHW: [batch, channels, height, width])
6. Run inference
7. Post-process outputs:
   - Apply NMS (Non-Maximum Suppression)
   - Scale bounding boxes back to original image size
   - Filter by confidence threshold
   - Map class indices to class names (71 classes from data.yaml)
```

### 3. **Performance Implications**

#### A. **Latency Changes**

| Metric | Current (API) | Local Inference |
|--------|---------------|-----------------|
| **Network Latency** | 100-500ms (API round-trip) | 0ms (local) |
| **Inference Time** | ~200-800ms (Roboflow servers) | ~50-200ms (GPU) / ~500-2000ms (CPU) |
| **Image Download** | 0ms (Roboflow handles) | 50-200ms (per image) |
| **Preprocessing** | 0ms | 10-50ms |
| **Postprocessing** | 0ms | 5-20ms |
| **Total (8 images)** | ~800-4000ms | ~880-2400ms (GPU) / ~4400-17600ms (CPU) |

**Key Insight:** Local inference is **faster on GPU** but **slower on CPU** compared to API.

#### B. **Resource Usage**

**Current (API):**
- **CPU**: Minimal (just HTTP requests)
- **Memory**: ~10-50 MB (response caching)
- **GPU**: None
- **Network**: Outbound API calls

**New (Local):**
- **CPU**: High (if no GPU) - 50-100% per inference
- **Memory**: 
  - Model weights: ~50-200 MB (YOLOv11)
  - Runtime buffers: ~100-500 MB
  - Image cache: ~50-200 MB
- **GPU**: 
  - VRAM: ~500 MB - 2 GB (model + buffers)
  - Utilization: 30-80% during inference
- **Network**: Only for downloading input images

#### C. **Scalability**

**Current (API):**
- ✅ Scales automatically (Roboflow handles load)
- ✅ No resource constraints on your server
- ❌ API rate limits (if any)
- ❌ Network dependency

**New (Local):**
- ❌ Limited by server resources (CPU/GPU)
- ❌ Need to handle concurrent requests (queue/batching)
- ❌ Memory/GPU constraints
- ✅ No API rate limits
- ✅ Works offline

### 4. **Integration Points in Current System**

#### A. **Feature Extraction**

```721:727:apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts
      // Extract features with detection evidence
      const features = await this.extractDetectionFeatures(
        validatedImageUrls,
        context,
        undefined,
        roboflowDetections,
        visionAnalysis,
      );
```

**Impact:** The `extractDetectionFeatures` method uses `roboflowDetections` to build the 40-dimensional feature vector. Local inference would produce the **same data structure** (`RoboflowDetection[]`), so **no changes needed** here.

#### B. **Detector Fusion**

```216:219:apps/web/lib/services/building-surveyor/ab_test_harness.ts
    const fusionResult = DetectorFusionService.fuseDetectors(
      roboflowDetections,
      assessment.damageAssessment.confidence
    );
```

**Impact:** `DetectorFusionService` expects `RoboflowDetection[]` format. As long as local inference produces the same structure, **no changes needed**.

#### C. **Memory System Integration**

The detections feed into:
1. **Feature extraction** → 40D feature vector
2. **Memory system** → Continuum memory adjustments
3. **Titans processing** → Self-modifying projections

**Impact:** All downstream systems work with the detection **results**, not the inference method. **No changes needed** if output format matches.

### 5. **Code Changes Required**

#### Minimal Changes (If Output Format Matches)

```typescript
// apps/web/lib/services/building-surveyor/RoboflowDetectionService.ts

export class RoboflowDetectionService {
  private static model: ort.InferenceSession | null = null;
  private static useLocalModel: boolean = false;

  static async initialize() {
    const useLocal = process.env.USE_LOCAL_YOLO === 'true';
    if (useLocal) {
      const modelPath = process.env.YOLO_MODEL_PATH || './models/yolov11.onnx';
      await this.loadLocalModel(modelPath);
      this.useLocalModel = true;
    }
  }

  static async detect(imageUrls: string[]): Promise<RoboflowDetection[]> {
    if (this.useLocalModel && this.model) {
      return this.detectLocal(imageUrls);
    }
    // Fallback to API (current implementation)
    return this.detectAPI(imageUrls);
  }

  private static async detectLocal(imageUrls: string[]): Promise<RoboflowDetection[]> {
    // 1. Download/prepare images
    // 2. Preprocess
    // 3. Run inference
    // 4. Postprocess (NMS, scaling, class mapping)
    // 5. Return RoboflowDetection[] (same format as API)
  }

  private static async detectAPI(imageUrls: string[]): Promise<RoboflowDetection[]> {
    // Current implementation (unchanged)
  }
}
```

#### Required New Dependencies

```json
{
  "dependencies": {
    "onnxruntime-node": "^1.16.0",  // For ONNX inference
    "sharp": "^0.33.0",             // For image processing
    "node-fetch": "^3.3.2"          // For downloading images (if needed)
  }
}
```

### 6. **Benefits of Local Inference**

#### ✅ **Advantages**

1. **Cost Reduction**
   - No API costs (Roboflow may charge per inference)
   - Predictable infrastructure costs

2. **Performance (GPU)**
   - Lower latency for GPU-enabled servers
   - No network round-trip delays

3. **Privacy & Security**
   - Images never leave your infrastructure
   - No external API dependencies
   - Better for sensitive/regulated data

4. **Offline Capability**
   - Works without internet connection
   - No API downtime concerns

5. **Customization**
   - Can fine-tune model weights
   - Can modify preprocessing/postprocessing
   - Full control over inference pipeline

6. **Integration with Learned Features**
   - Can feed raw model outputs (before NMS) to `LearnedFeatureExtractor`
   - More granular features for memory system
   - Better integration with Titans self-modification

#### ❌ **Disadvantages**

1. **Infrastructure Complexity**
   - Need GPU servers (for performance)
   - Model versioning and deployment
   - Resource monitoring and scaling

2. **Development Overhead**
   - Image preprocessing pipeline
   - NMS and postprocessing logic
   - Model loading and memory management
   - Error handling for edge cases

3. **Performance (CPU)**
   - Slower than API on CPU-only servers
   - May need request queuing/batching

4. **Maintenance**
   - Model updates require redeployment
   - Need to track model versions
   - Debugging inference issues

5. **Resource Costs**
   - GPU server costs (if using GPU)
   - Higher memory usage
   - May need load balancing for scale

### 7. **Recommended Implementation Strategy**

#### Phase 1: Hybrid Approach (Recommended)

```typescript
// Support both local and API inference
const useLocal = process.env.USE_LOCAL_YOLO === 'true';
const detections = useLocal 
  ? await LocalYOLODetectionService.detect(imageUrls)
  : await RoboflowDetectionService.detect(imageUrls);
```

**Benefits:**
- ✅ Gradual migration
- ✅ Fallback to API if local fails
- ✅ A/B testing capability
- ✅ No breaking changes

#### Phase 2: Feature Flag

```typescript
// Environment-based switching
USE_LOCAL_YOLO=true
YOLO_MODEL_PATH=./models/yolov11-v2.onnx
YOLO_CONFIDENCE_THRESHOLD=0.25
YOLO_IOU_THRESHOLD=0.45
```

#### Phase 3: Performance Monitoring

```typescript
// Track both methods
const metrics = {
  method: useLocal ? 'local' : 'api',
  latency: endTime - startTime,
  detectionsCount: detections.length,
  avgConfidence: detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length,
};
```

### 8. **Integration with Learned Features & Titans**

#### Enhanced Feature Extraction

**Current:** Handcrafted features from detection counts/confidence

**With Local Inference:**
```typescript
// Can extract richer features:
- Raw model outputs (before NMS) → More granular spatial information
- Feature maps from intermediate layers → For LearnedFeatureExtractor
- Attention maps → For Titans context memory
- Uncertainty estimates → For conformal prediction
```

#### Titans Self-Modification

Local inference enables:
- **Adaptive preprocessing** based on image characteristics
- **Dynamic confidence thresholds** based on Titans context
- **Selective inference** (skip images with low information content)

### 9. **Testing Considerations**

#### Unit Tests
- Mock model inference (use sample outputs)
- Test preprocessing/postprocessing
- Test error handling (model load failures, inference errors)

#### Integration Tests
- Compare local vs API outputs (should match for same model)
- Performance benchmarks
- Resource usage monitoring

#### A/B Testing
- Run both methods in parallel
- Compare accuracy, latency, cost
- Use `FeatureExtractorABTest` framework

### 10. **Deployment Checklist**

- [ ] Convert YOLO weights to ONNX format (if using ONNX Runtime)
- [ ] Set up model storage (S3, local filesystem, or database)
- [ ] Configure GPU access (if using GPU)
- [ ] Implement image preprocessing pipeline
- [ ] Implement NMS and postprocessing
- [ ] Add model loading/initialization
- [ ] Add error handling and fallbacks
- [ ] Add performance monitoring
- [ ] Update environment variables
- [ ] Test with production-like images
- [ ] Set up model versioning
- [ ] Document model update process

---

## Summary

### What Happens: **Minimal Breaking Changes**

If you integrate local YOLO weights **correctly** (maintaining the same output format), the impact is:

1. **✅ No Changes Needed:**
   - `BuildingSurveyorService` (uses detections, not inference method)
   - `DetectorFusionService` (works with detection results)
   - `ContinuumMemorySystem` (uses feature vectors)
   - `LearnedFeatureExtractor` (uses detection features)
   - `SelfModifyingTitans` (uses processed features)

2. **⚠️ Changes Required:**
   - `RoboflowDetectionService` (add local inference path)
   - Infrastructure (GPU servers, model storage)
   - Deployment process (model versioning)

3. **🎯 Potential Enhancements:**
   - Richer features for memory system
   - Better integration with Titans
   - Offline capability
   - Cost reduction (if API costs are high)

### Recommendation

**Start with a hybrid approach:**
- Keep API as default/fallback
- Add local inference as opt-in feature flag
- A/B test both methods
- Gradually migrate based on performance/cost data

This minimizes risk while enabling the benefits of local inference.

