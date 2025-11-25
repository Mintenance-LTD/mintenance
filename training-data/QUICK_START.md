# Training Pipeline Quick Start Guide

## ✅ Setup Complete!

The database migrations have been successfully applied. You're ready to start training!

## Next Steps

### Step 1: Prepare Your Ground Truth CSV

1. Open `ground-truth-labels-template.csv` in this directory
2. Replace the example rows with your actual labeled images
3. Ensure all image URLs are accessible
4. Save as `ground-truth-labels.csv` (or any name you prefer)

**Minimum Requirements:**
- At least 50 images (200+ recommended)
- Include both damage and safe images
- Include at least 10-20 critical hazard images

### Step 2: Run Shadow Mode Batch

Process your labeled images through the AI agent:

```bash
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth-labels.csv
```

This will:
- Run each image through SAM 3, GPT-4, and the full pipeline
- Store predictions in the database (shadow mode)
- Generate a summary report

**Expected Time:** ~1-2 minutes per image (depends on API response times)

### Step 3: Run Complete Training Pipeline

Train all modules at once:

```bash
npx tsx scripts/run-training-pipeline.ts
```

Or run steps individually:

```bash
# 1. Export shadow mode data to CSV
npx tsx scripts/export-shadow-mode-data.ts

# 2. Train Bayesian Fusion weights (requires Python)
python scripts/train-bayesian-fusion.py

# 3. Populate calibration data
npx tsx scripts/populate-calibration-data-from-ground-truth.ts

# 4. Warm up the critic
npx tsx scripts/warm-up-critic.ts
```

## Prerequisites Checklist

Before running, ensure you have:

- ✅ Database migrations applied (DONE!)
- ✅ Environment variables in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `ENABLE_SAM3_SEGMENTATION=true`
- ✅ Python dependencies (for Bayesian Fusion training):
  ```bash
  pip install pymc3 pandas numpy
  ```

## Verification

After running shadow mode, verify results:

```sql
-- Check shadow mode assessments
SELECT COUNT(*) FROM building_assessments WHERE shadow_mode = true;

-- Check ground truth feedback
SELECT COUNT(*) FROM building_surveyor_feedback;
```

## Troubleshooting

See `docs/TRAINING_PIPELINE.md` for detailed troubleshooting guide.

## Need Help?

- Full documentation: `docs/TRAINING_PIPELINE.md`
- CSV format: See template in this directory
- Example workflow: See documentation

