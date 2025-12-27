# ImageCompressionService

> Production-ready image compression service for React Native mobile app

## Overview

The `ImageCompressionService` provides intelligent image compression for the Mintenance mobile app. It automatically optimizes images before upload to reduce bandwidth usage, improve performance, and decrease storage costs.

## Features

✅ **Smart Compression Presets**
- Profile photos: 800x800, 70% quality
- Job photos: 1200x1200, 80% quality
- Property assessments: 1600x1600, 85% quality (higher for AI damage detection)
- Custom settings available

✅ **Automatic Thumbnail Generation**
- 200x200 thumbnails for list views
- Multiple sizes support (100px, 200px, 400px)
- Optimized for scroll performance

✅ **Batch Processing**
- Compress multiple images efficiently
- Progress callbacks for UI updates
- Memory-optimized sequential processing

✅ **EXIF Data Preservation** (planned)
- Location data for job verification
- Timestamps for documentation
- Privacy-aware (disabled for profiles)

✅ **Error Handling**
- Graceful degradation on failures
- Detailed error reporting
- Fallback to original images

✅ **Performance Monitoring**
- Compression statistics
- Size reduction tracking
- Duration metrics

## Installation

The required packages are already installed:

```json
{
  "expo-image-manipulator": "~13.0.6",
  "expo-file-system": "~18.0.12"
}
```

## Quick Start

### Basic Usage

```typescript
import ImageCompressionService, { compressJobPhoto } from '@/services/ImageCompressionService';

// Compress a single image
const result = await compressJobPhoto(imageUri);

if (result.error) {
  console.error('Compression failed:', result.error);
} else {
  console.log('Compressed:', result.uri);
  console.log('Thumbnail:', result.thumbnailUri);
  console.log('Size reduction:',
    `${(result.compressionRatio * 100).toFixed(0)}%`
  );
}
```

### Batch Compression with Progress

```typescript
import { compressJobPhotos } from '@/services/ImageCompressionService';

const imageUris = ['file:///image1.jpg', 'file:///image2.jpg'];

const onProgress = (processed, total, currentFile) => {
  const percentage = Math.round((processed / total) * 100);
  console.log(`Processing: ${percentage}%`);
  // Update UI progress bar
};

const result = await compressJobPhotos(imageUris, onProgress);

console.log(`
  Success: ${result.successCount}/${result.results.length}
  Saved: ${((1 - result.totalCompressionRatio) * 100).toFixed(0)}%
  Time: ${(result.duration / 1000).toFixed(1)}s
`);
```

## API Reference

### Main Service Methods

#### `compress(imageUri, options)`

Compress a single image with smart quality selection.

**Parameters:**
- `imageUri` (string): File URI of the image to compress
- `options` (CompressionOptions): Configuration options

**Returns:** `Promise<CompressionResult>`

**Example:**
```typescript
const result = await ImageCompressionService.compress(imageUri, {
  purpose: 'job',
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  preserveAspectRatio: true,
  generateThumbnail: true,
});
```

#### `compressBatch(imageUris, options, onProgress)`

Compress multiple images with progress tracking.

**Parameters:**
- `imageUris` (string[]): Array of image URIs
- `options` (CompressionOptions): Configuration options
- `onProgress` (ProgressCallback): Progress update callback

**Returns:** `Promise<BatchCompressionResult>`

**Example:**
```typescript
const result = await ImageCompressionService.compressBatch(
  imageUris,
  { purpose: 'job' },
  (processed, total) => console.log(`${processed}/${total}`)
);
```

#### `generateThumbnail(imageUri, size)`

Generate a single thumbnail.

**Parameters:**
- `imageUri` (string): Image URI
- `size` (number): Thumbnail size in pixels (default: 200)

**Returns:** `Promise<string>` - Thumbnail URI

#### `generateMultipleThumbnails(imageUri, sizes)`

Generate multiple thumbnail sizes.

**Parameters:**
- `imageUri` (string): Image URI
- `sizes` (number[]): Array of sizes (default: [100, 200, 400])

**Returns:** `Promise<Array<{ size: number; uri: string }>>`

#### `needsCompression(imageUri, purpose, thresholdMB)`

Check if an image needs compression.

**Parameters:**
- `imageUri` (string): Image URI
- `purpose` (ImagePurpose): Compression purpose
- `thresholdMB` (number): Size threshold in MB (default: 2)

**Returns:** `Promise<boolean>`

#### `estimateCompressedSize(imageUri, purpose)`

Estimate compressed size before compression.

**Parameters:**
- `imageUri` (string): Image URI
- `purpose` (ImagePurpose): Compression purpose

**Returns:** `Promise<number>` - Estimated size in bytes

#### `getCompressionStats(result)`

Get detailed compression statistics.

**Parameters:**
- `result` (CompressionResult): Compression result

**Returns:** Object with `savedBytes`, `savedMB`, `savedPercentage`

### Convenience Functions

```typescript
// Pre-configured compression functions
compressProfilePhoto(imageUri)
compressJobPhoto(imageUri)
compressPropertyAssessmentPhoto(imageUri)
compressJobPhotos(imageUris, onProgress)
```

## Types

### CompressionOptions

```typescript
interface CompressionOptions {
  purpose?: 'profile' | 'job' | 'property-assessment' | 'thumbnail' | 'custom';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
  preserveAspectRatio?: boolean;
  preserveExif?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}
```

### CompressionResult

```typescript
interface CompressionResult {
  uri: string;                    // Compressed image URI
  width: number;                  // Compressed width
  height: number;                 // Compressed height
  originalSize: number;           // Original size in bytes
  compressedSize: number;         // Compressed size in bytes
  compressionRatio: number;       // Ratio (0.0 to 1.0)
  thumbnailUri?: string;          // Thumbnail URI if generated
  exifData?: ExifData;           // EXIF data if preserved
  error?: string;                // Error message if failed
}
```

### BatchCompressionResult

```typescript
interface BatchCompressionResult {
  results: CompressionResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalCompressionRatio: number;
  successCount: number;
  failureCount: number;
  duration: number;
}
```

## Compression Presets

| Purpose | Max Size | Quality | Thumbnail | Use Case |
|---------|----------|---------|-----------|----------|
| **profile** | 800x800 | 0.7 | 200x200 | User avatars, fast loading |
| **job** | 1200x1200 | 0.8 | 200x200 | Job photos, good balance |
| **property-assessment** | 1600x1600 | 0.85 | 200x200 | AI analysis, high detail |
| **thumbnail** | 200x200 | 0.6 | - | List views, minimal size |
| **custom** | 1024x1024 | 0.75 | 200x200 | Full control |

## Integration Examples

### With PhotoUploadService

```typescript
import { PhotoUploadService } from '@/services/PhotoUploadService';
import { compressJobPhotos } from '@/services/ImageCompressionService';

async function uploadJobPhotos(jobId: string) {
  // 1. Pick images
  const photos = await PhotoUploadService.pickImages(true);
  const imageUris = photos.map(p => p.uri);

  // 2. Compress with progress
  const { results } = await compressJobPhotos(imageUris, (p, t) => {
    console.log(`${p}/${t}`);
  });

  // 3. Convert to expected format
  const compressedAssets = results
    .filter(r => !r.error)
    .map(r => ({
      uri: r.uri,
      width: r.width,
      height: r.height,
      assetId: null,
      fileName: 'photo.jpg',
      fileSize: r.compressedSize,
      type: 'image' as const,
      duration: null,
    }));

  // 4. Upload
  return await PhotoUploadService.uploadBeforePhotos(jobId, compressedAssets);
}
```

### React Component

```typescript
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { compressJobPhotos } from '@/services/ImageCompressionService';

export function ImageUploader({ jobId }: { jobId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    setUploading(true);

    const photos = await PhotoUploadService.pickImages();
    const imageUris = photos.map(p => p.uri);

    const result = await compressJobPhotos(
      imageUris,
      (p, t) => setProgress(Math.round((p / t) * 100))
    );

    // Upload compressed images...
    setUploading(false);
  };

  return (
    <View>
      <Button title="Upload Photos" onPress={handleUpload} />
      {uploading && (
        <>
          <ActivityIndicator />
          <Text>Compressing: {progress}%</Text>
        </>
      )}
    </View>
  );
}
```

### Smart Compression Check

```typescript
async function smartUpload(imageUri: string) {
  // Only compress if needed
  const needsCompression = await ImageCompressionService.needsCompression(
    imageUri,
    'job',
    2 // 2MB threshold
  );

  const finalUri = needsCompression
    ? (await compressJobPhoto(imageUri)).uri
    : imageUri;

  // Upload finalUri...
}
```

## Performance Tips

### 1. Batch Processing

✅ **Good:** Process images sequentially in batches
```typescript
const result = await compressBatch(imageUris, options);
```

❌ **Bad:** Compress images in parallel (memory issues)
```typescript
// Don't do this:
await Promise.all(imageUris.map(uri => compress(uri)));
```

### 2. Progress Feedback

Always provide progress feedback for batch operations:
```typescript
const onProgress = (processed, total) => {
  updateUI(`${processed}/${total}`);
};
```

### 3. Thumbnail Generation

Use thumbnails for list views to improve scroll performance:
```typescript
const result = await compress(uri, {
  generateThumbnail: true
});

// Use result.thumbnailUri in lists
// Use result.uri for detail view
```

### 4. Memory Management

The service automatically cleans up temporary files during batch operations, but for long-running apps, consider manual cleanup of old compressed images.

### 5. Quality Settings

- Use lower quality (0.6-0.7) for thumbnails
- Use medium quality (0.7-0.8) for regular photos
- Use high quality (0.85+) for property assessments

## Error Handling

### Graceful Degradation

```typescript
const result = await compress(imageUri);

if (result.error) {
  // Fallback to original
  console.warn('Compression failed, using original:', result.error);
  uploadImage(imageUri); // Use original
} else {
  uploadImage(result.uri); // Use compressed
}
```

### Batch Error Handling

```typescript
const { results, successCount, failureCount } = await compressBatch(uris);

// Some may have failed
results.forEach((result, index) => {
  if (result.error) {
    console.error(`Image ${index} failed:`, result.error);
  }
});

// Continue with successful compressions
const successfulUris = results
  .filter(r => !r.error)
  .map(r => r.uri);
```

## Testing

Run the test suite:

```bash
npm test -- ImageCompressionService.test.ts
```

Tests cover:
- Compression presets
- Batch processing
- Thumbnail generation
- Error handling
- Progress callbacks
- Statistics calculation

## Best Practices

1. **Always compress images** before upload (except already optimized thumbnails)
2. **Show progress** for batch operations (3+ images)
3. **Generate thumbnails** for list views
4. **Check compression need** for small images
5. **Handle errors gracefully** with fallback to original
6. **Monitor stats** to optimize compression settings
7. **Test on real devices** with various image sizes
8. **Preserve EXIF** for job/property photos, not profiles
9. **Use correct preset** for each use case
10. **Clean up** old compressed files periodically

## Troubleshooting

### Issue: Compression is slow

**Solution:** Images are compressed sequentially to avoid memory issues. For better UX, show progress indicator.

### Issue: Quality is too low

**Solution:** Adjust quality in options or use a different preset:
```typescript
compress(uri, { quality: 0.9 }) // Higher quality
```

### Issue: Files are still large

**Solution:** Check if images are properly resized:
```typescript
compress(uri, { maxWidth: 1200, maxHeight: 1200 })
```

### Issue: Out of memory errors

**Solution:** Don't compress too many images in parallel. Use `compressBatch()` which processes sequentially.

## Metrics & Monitoring

The service automatically logs:
- Compression start/end
- Individual image stats
- Batch processing stats
- Errors and failures

Access logs through the enhanced logger:
```typescript
import { logger } from '@/utils/logger-enhanced';
```

## Future Enhancements

- [ ] Full EXIF data extraction and preservation
- [ ] WebP format support
- [ ] Video compression
- [ ] Progressive JPEG support
- [ ] Background compression queue
- [ ] Compression quality auto-tuning based on network conditions
- [ ] Cloud-based compression fallback

## Related Services

- **PhotoUploadService**: Uses ImageCompressionService for uploads
- **PropertyAssessmentService**: Uses high-quality compression for AI analysis
- **ProfileService**: Uses profile preset for avatar uploads

## Support

For issues or questions:
1. Check the examples in `ImageCompressionService.example.ts`
2. Review the test suite in `__tests__/ImageCompressionService.test.ts`
3. Contact the mobile development team

## License

Internal Mintenance Platform - Proprietary
