# Building Surveyor AI Training Pipeline

## Overview

This document describes the 3-phase training pipeline for the BuildingSurveyorService AI agent. The pipeline enables the agent to learn from ground truth labels using GPT-4 and SAM 3 predictions, training Bayesian Fusion weights, populating Conformal Prediction calibration data, and warming up the Safe-LUCB Critic.

## Table of Contents

1. [Phase 1: Ground Truth Labeling](#phase-1-ground-truth-labeling)
2. [Phase 2: Shadow Mode Execution](#phase-2-shadow-mode-execution)
3. [Phase 3: Training the Modules](#phase-3-training-the-modules)
4. [CSV Format Specification](#csv-format-specification)
5. [Example CSV](#example-csv)
6. [Requirements](#requirements)

## Phase 1: Ground Truth Labeling

### Purpose

You cannot learn without a teacher. Before training, you must manually label images to create a "Gold Standard" dataset.

### Action Steps

1. **Prepare Your Images**: Collect at least 500 images of building defects (recommended minimum for statistical significance)

2. **Create Ground Truth CSV**: Use the CSV template below to label each image

3. **Label Each Image**:
   - `true_class`: The actual damage type (e.g., "Structural Crack", "Mold", "Safe")
   - `critical_hazard`: `true` if the image contains a dangerous fault, `false` otherwise
   - `property_type`: Type of property (residential, commercial, rail, construction, etc.)
   - `property_age`: Age of property in years (for stratification)
   - `region`: Geographic region (for stratification)

4. **Store in Database**: Import CSV into `building_surveyor_feedback` table using the migration

### Labeling Guidelines

- **Be Consistent**: Use the same class names throughout (e.g., always "Structural Crack", not "Crack" or "Structural Damage")
- **Critical Hazards**: Mark as `true` only if the defect poses immediate safety risk (e.g., structural collapse risk, electrical hazards)
- **Property Context**: Include accurate property type, age, and region for proper stratification in Mondrian CP
- **Quality Over Quantity**: Better to have 200 well-labeled images than 500 poorly-labeled ones

## Phase 2: Shadow Mode Execution

### Purpose

Run the AI agent on your labeled images as if it were live, but store predictions for training without affecting production decisions.

### Action Steps

1. **Prepare CSV File**: Ensure your ground truth CSV follows the format specification

2. **Run Shadow Mode Batch Script**:
   ```bash
   npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth-labels.csv
   ```

3. **Monitor Progress**: The script will:
   - Process each image through the full AI pipeline (SAM 3, GPT-4, Bayesian Fusion, Safe-LUCB)
   - Store predictions in `building_assessments` with `shadow_mode=true`
   - Log progress and errors

4. **Verify Results**: Check that all images were processed successfully:
   ```sql
   SELECT COUNT(*) FROM building_assessments WHERE shadow_mode = true;
   ```

### What Gets Stored

For each image, the following is stored in `building_assessments`:
- `predicted_class`: AI's predicted damage class
- `raw_probability`: Fusion mean from Bayesian Fusion
- `fusion_variance`: Fusion variance (uncertainty measure)
- `context_features`: 12-dimensional context vector for critic
- `sam3_evidence`: SAM 3 segmentation data
- `gpt4_assessment`: GPT-4 assessment data
- `scene_graph_features`: Scene graph features
- `true_class`: Ground truth label (from CSV)
- `critical_hazard`: Ground truth critical hazard flag

## Phase 3: Training the Modules

### A. Train Bayesian Fusion Weights

**Goal**: Teach the system how to weight evidence from SAM 3, GPT-4, and scene graph.

**Steps**:

1. **Export Training Data**:
   ```bash
   npx tsx scripts/export-shadow-mode-data.ts
   ```
   This creates `training-data/shadow-mode-predictions.csv`

2. **Train Weights**:
   ```bash
   python scripts/train-bayesian-fusion.py
   ```
   This generates `apps/web/lib/services/building-surveyor/fusion_weights.json`

3. **Verify**: Check that weights sum to 1.0 and are reasonable (e.g., SAM 3: 0.40, GPT-4: 0.35, Scene Graph: 0.25)

### B. Populate Conformal Prediction Calibration Data

**Goal**: Establish "Safe Thresholds" for uncertainty calibration.

**Steps**:

1. **Populate Calibration Data**:
   ```bash
   npx tsx scripts/populate-calibration-data-from-ground-truth.ts
   ```

2. **Verify**: Check calibration data per stratum:
   ```sql
   SELECT stratum, COUNT(*) as n_cal, AVG(nonconformity_score) as avg_score
   FROM ab_calibration_data
   GROUP BY stratum;
   ```

### C. Warm Up the Critic

**Goal**: Prevent "Cold Start" problem by pre-training the Safe-LUCB Critic.

**Steps**:

1. **Warm Up Critic**:
   ```bash
   npx tsx scripts/warm-up-critic.ts
   ```

2. **Verify**: Check that critic matrices are populated:
   ```sql
   SELECT stratum, COUNT(*) as n_updates
   FROM ab_critic_models
   GROUP BY stratum;
   ```

## CSV Format Specification

### Required Columns

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `filename` | string | Yes | Image filename | `img_001.jpg` |
| `image_url` | string | Yes | Full URL to image | `https://storage.googleapis.com/...` |
| `true_class` | string | Yes | Ground truth damage class | `Structural Crack` |
| `critical_hazard` | boolean | Yes | Whether image contains dangerous fault | `true` or `false` |

### Optional Columns

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `property_type` | string | No | Property type for stratification | `residential`, `commercial`, `rail` |
| `property_age` | integer | No | Property age in years | `25` |
| `region` | string | No | Geographic region | `London`, `Manchester` |

### CSV Rules

- **Header Row**: First row must contain column names
- **Delimiter**: Comma (`,`)
- **Encoding**: UTF-8
- **Quotes**: Use quotes if values contain commas: `"Structural Crack, Severe"`
- **Boolean Values**: Use `true`/`false` or `1`/`0` for `critical_hazard`
- **Empty Values**: Leave optional columns empty if not available

## Example CSV

```csv
filename,image_url,true_class,critical_hazard,property_type,property_age,region
img_001.jpg,https://storage.googleapis.com/bucket/img_001.jpg,Structural Crack,true,residential,25,London
img_002.jpg,https://storage.googleapis.com/bucket/img_002.jpg,Mold,false,residential,10,Manchester
img_003.jpg,https://storage.googleapis.com/bucket/img_003.jpg,Safe,false,commercial,5,London
img_004.jpg,https://storage.googleapis.com/bucket/img_004.jpg,Water Damage,false,residential,30,Birmingham
img_005.jpg,https://storage.googleapis.com/bucket/img_005.jpg,Foundation Crack,true,residential,50,London
img_006.jpg,https://storage.googleapis.com/bucket/img_006.jpg,Spalling,false,commercial,15,Manchester
img_007.jpg,https://storage.googleapis.com/bucket/img_007.jpg,Electrical Hazard,true,residential,20,London
img_008.jpg,https://storage.googleapis.com/bucket/img_008.jpg,Safe,false,rail,100,London
img_009.jpg,https://storage.googleapis.com/bucket/img_009.jpg,Rail Corrosion,true,rail,75,Manchester
img_010.jpg,https://storage.googleapis.com/bucket/img_010.jpg,Minor Crack,false,residential,5,Birmingham
```

## Requirements

### Minimum Dataset Size

- **Recommended**: 500 images minimum
- **Minimum for Statistical Significance**: 200 images
- **Ideal**: 1000+ images with balanced classes

### Class Distribution

- **Balanced Dataset**: Aim for roughly equal distribution across damage types
- **Critical Hazards**: Include at least 50 images with `critical_hazard=true` for safety constraint learning
- **Property Types**: Include diverse property types (residential, commercial, rail, construction) for proper stratification

### Image Quality

- **Resolution**: Minimum 640x480 pixels
- **Format**: JPEG or PNG
- **Accessibility**: Images must be accessible via public URL or authenticated storage
- **Variety**: Include images with different lighting, angles, and damage severities

### Environment Setup

Before running the training pipeline, ensure:

1. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ENABLE_SAM3_SEGMENTATION=true`
   - `SHADOW_MODE_ENABLED=true` (for shadow mode execution)

2. **Database Migrations**: Run migrations to create required tables:
   - `building_surveyor_feedback`
   - `building_assessments` (with shadow mode fields)
   - `ab_calibration_data`
   - `ab_critic_models`

3. **Python Dependencies** (for Bayesian Fusion training):
   - `pymc3`
   - `pandas`
   - `numpy`

## Training Pipeline Workflow

```
1. Label Images (CSV)
   ↓
2. Run Shadow Mode Batch Script
   ↓
3. Export Training Data
   ↓
4. Train Bayesian Fusion Weights
   ↓
5. Populate Calibration Data
   ↓
6. Warm Up Critic
   ↓
7. Verify Training Results
   ↓
8. Deploy Trained Models
```

## Troubleshooting

### Shadow Mode Script Fails

- **Check Image URLs**: Ensure all URLs are accessible
- **Verify Environment Variables**: Check that all required env vars are set
- **Check Database Connection**: Verify Supabase credentials
- **Review Logs**: Check error messages in console output

### Bayesian Fusion Training Fails

- **Check CSV Format**: Ensure exported CSV has correct columns
- **Verify Data Quality**: Check for NaN or invalid values
- **Check Python Dependencies**: Ensure pymc3, pandas, numpy are installed
- **Review Training Data**: Ensure sufficient samples (minimum 50 per class)

### Calibration Data Empty

- **Check Shadow Mode Results**: Ensure shadow mode assessments have `true_class` populated
- **Verify Stratum Calculation**: Check that property type/age/region are correctly normalized
- **Review Ground Truth Labels**: Ensure CSV was imported correctly

## Next Steps

After completing the training pipeline:

1. **Monitor Performance**: Track accuracy metrics in production
2. **Collect Feedback**: Continue labeling new images for continuous learning
3. **Retrain Periodically**: Retrain weights every 3-6 months with new data
4. **Update Calibration**: Re-populate calibration data as new assessments are validated

## Related Documentation

- [Building Surveyor Quick Reference](./BUILDING_SURVEYOR_QUICK_REFERENCE.md)
- [AB Test Setup](./AB_TEST_COMPLETE_SETUP.md)
- [Conformal Prediction Improvements](./CONFORMAL_PREDICTION_IMPROVEMENTS.md)

