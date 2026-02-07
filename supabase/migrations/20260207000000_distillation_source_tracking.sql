-- Add source tracking to sam3_pseudo_labels for SAM2 temporal data
-- This allows distinguishing between SAM3 segmentation pseudo-labels and
-- SAM2 temporal video analysis pseudo-labels in the training pipeline.
ALTER TABLE sam3_pseudo_labels ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sam3';
