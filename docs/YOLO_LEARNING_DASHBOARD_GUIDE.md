# YOLO Learning Dashboard Guide

## Overview

The YOLO Learning Dashboard provides visibility into the continuous learning system, showing correction activity, retraining progress, and model improvement status.

## Dashboard Components

### 1. YOLO Learning Status Card (Main Dashboard)

**Location:** `/admin` dashboard

**Displays:**
- **Status**: Active/Inactive indicator
- **Corrections**: Approved and pending counts
- **Next Retrain Progress**: Progress bar showing X/100 corrections
- **Last Retrain Job**: Status, model version, and completion date
- **Quick Actions**: Link to correct detections

**Updates:** Every 30 seconds

### 2. YOLO Corrections Section (Building Assessments Page)

**Location:** `/admin/building-assessments`

**Displays:**
- **Approved Corrections**: Total approved corrections
- **Pending Review**: Corrections awaiting approval
- **Needed for Retrain**: How many more corrections needed (100 total)
- **Progress Bar**: Visual progress to next retrain
- **Call to Action**: Prominent message when assessments are available

**Features:**
- Real-time updates every 30 seconds
- Shows progress toward retraining threshold
- Clear instructions on how to start correcting

## How to Correct Detections

### Step 1: Access Correction UI

1. Go to **Building Assessments** page (`/admin/building-assessments`)
2. Find an assessment with images
3. Click **"Correct Detections"** button
4. Correction editor opens in new tab

### Step 2: Make Corrections

1. **View detections**: See all AI-detected bounding boxes
2. **Add new boxes**: Click and drag on image to add missing detections
3. **Remove false positives**: Click X button on incorrect detections
4. **Change classes**: Click "Change" to modify class labels
5. **Save**: Click "Save Corrections" when done

### Step 3: Review and Approve

- Corrections start as "pending"
- Admin can approve/reject corrections
- Only approved corrections are used in retraining

## Base Dataset Location

The base training dataset (3,729 labeled images) is located at:
- **Path**: `Building Defect Detection 7.v2i.yolov11/`
- **Format**: YOLO format (images + labels)
- **Usage**: Merged with user corrections during retraining

The retraining process:
1. Loads base dataset (3,729 images)
2. Merges with approved user corrections
3. Fine-tunes YOLO model
4. Exports new ONNX model
5. Deploys automatically

## Monitoring Learning Activity

### Dashboard Metrics

- **Corrections Count**: See how many corrections have been collected
- **Retraining Progress**: Track progress toward 100 corrections threshold
- **Last Retrain**: View status and results of last retraining job
- **Model Version**: See which model version is currently active

### API Endpoints

- **GET `/api/building-surveyor/retrain/status`**: Get learning status
- **GET `/api/building-surveyor/corrections`**: Get correction statistics
- **POST `/api/building-surveyor/retrain`**: Manually trigger retraining

## Continuous Learning Flow

1. **User submits assessment** → AI detects damage
2. **Admin corrects detections** → Corrections saved
3. **Corrections approved** → Added to training pool
4. **100+ corrections collected** → Automatic retraining triggered
5. **Model retrained** → New version deployed
6. **Cycle repeats** → Model improves over time

## Troubleshooting

### No corrections showing?
- Check if assessments have images
- Verify corrections were saved (check database)
- Ensure corrections are approved

### Retraining not happening?
- Check if ≥100 approved corrections exist
- Verify `YOLO_CONTINUOUS_LEARNING_ENABLED=true` in `.env.local`
- Check last retraining job status in dashboard

### Can't access correction UI?
- Ensure assessment has images
- Check assessment exists in database
- Verify user has admin permissions

