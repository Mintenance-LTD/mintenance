# Batch Processing with Progress Reports

## Feature Overview
The shadow mode batch script now processes images in configurable batches (default: 50) and generates detailed progress reports after each batch. This allows for better monitoring and management of large-scale training data processing.

## New Features

### 1. Batch Processing (Default: 50 images per batch)
- Processes images in chunks to better manage memory and API usage
- Configurable batch size via CLI argument
- Better error isolation - issues in one batch don't stop the entire process

### 2. Progress Reports
After each batch, you get:
- **Batch statistics**: Current batch number, range, success/failure counts
- **Overall progress**: Total processed, remaining, percentage complete
- **Performance metrics**: Elapsed time, average time per image, estimated time remaining
- **Success rate**: Real-time success rate calculation

### 3. Intermediate Progress Reports
- Saved after each batch to `training-data/shadow-mode-batch-progress-*.json`
- Allows monitoring progress even if script is interrupted
- Contains all batch reports and overall statistics

### 4. Enhanced Final Summary
- Complete statistics for entire run
- All batch reports included
- Detailed error listing (with truncation for readability)

## Usage

### Basic Usage (Default: 50 images per batch)
```bash
npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv
```

### Custom Batch Size
```bash
# Process 100 images per batch
npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 100

# Process 25 images per batch with 3 second delay
npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 25 3000
```

### Full Customization
```bash
# Batch size: 50, Delay: 3s, Max retries: 10
npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 3000 10
```

## Progress Report Format

### Console Output Example
```
================================================================================
📊 BATCH 1/20 COMPLETE
================================================================================
   Batch Range:      1 - 50 (50 images)
   Overall Progress: 50/1000 (5.0%)
   Successful:       48
   Failed:           2
   Success Rate:     96.00%
   Elapsed Time:     2m 15s
   Avg Time/Image:   2.70s
   Est. Remaining:   42m 30s
================================================================================
```

### JSON Progress Report
```json
{
  "timestamp": "2025-01-24T10:30:00.000Z",
  "csvPath": "training-data/labels.csv",
  "batchNumber": 1,
  "totalBatches": 20,
  "overallProgress": {
    "total": 1000,
    "successful": 48,
    "failed": 2,
    "errors": [...]
  },
  "currentBatchReport": {
    "batchNumber": 1,
    "totalBatches": 20,
    "batchStartIndex": 0,
    "batchEndIndex": 49,
    "batchSize": 50,
    "processed": 50,
    "successful": 48,
    "failed": 2,
    "elapsedMs": 135000,
    "averageTimePerImage": 2700,
    "estimatedTimeRemaining": 2550000,
    "successRate": "96.00%"
  },
  "allReports": [...]
}
```

## Benefits

### 1. Better Monitoring
- Real-time progress tracking
- Clear visibility into processing status
- Easy to identify problematic batches

### 2. Error Management
- Errors are isolated to batches
- Can see which batches had issues
- Failed images are clearly listed

### 3. Performance Insights
- Understand processing speed
- Estimate completion time
- Identify bottlenecks

### 4. Resume Capability
- Progress reports saved after each batch
- Can manually resume from a specific batch if needed
- Full history of all batches

## File Outputs

### Progress Reports (After Each Batch)
- Location: `training-data/shadow-mode-batch-progress-{timestamp}.json`
- Contains: Current batch info + all previous batch reports

### Final Summary
- Location: `training-data/shadow-mode-batch-{timestamp}.json`
- Contains: Complete statistics, all batch reports, full error list

## Example Workflow

```bash
# Start processing 1000 images in batches of 50
npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 2000 5

# After each batch (50 images), you'll see:
# - Progress report in console
# - Progress report saved to file

# After all batches complete:
# - Final summary displayed
# - Final summary saved to file
# - Exit code indicates success/failure
```

## Monitoring Tips

1. **Watch the console** for real-time batch progress
2. **Check progress files** if script is interrupted
3. **Review error counts** after each batch
4. **Monitor estimated time** to plan around processing

## Related Files
- `scripts/run-shadow-mode-batch.ts` - Main batch processing script
- `apps/web/lib/utils/openai-rate-limit.ts` - Rate limit handling utility
- Progress reports saved to `training-data/` directory

