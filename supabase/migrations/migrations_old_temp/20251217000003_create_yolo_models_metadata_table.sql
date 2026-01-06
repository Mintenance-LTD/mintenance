-- Create YOLO Models Metadata Table
-- Tracks all uploaded YOLO models with their performance metrics and configuration

CREATE TABLE IF NOT EXISTS yolo_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL UNIQUE,
    filename text NOT NULL,
    storage_path text NOT NULL,
    file_size bigint,
    metrics jsonb DEFAULT '{}'::jsonb,
    training_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    description text,
    uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_yolo_models_version ON yolo_models(version);
CREATE INDEX idx_yolo_models_is_active ON yolo_models(is_active);
CREATE INDEX idx_yolo_models_created_at ON yolo_models(created_at DESC);

-- Enable RLS
ALTER TABLE yolo_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage YOLO models"
    ON yolo_models
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view YOLO models"
    ON yolo_models
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin users can manage YOLO models"
    ON yolo_models
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_yolo_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_yolo_models_updated_at
    BEFORE UPDATE ON yolo_models
    FOR EACH ROW
    EXECUTE FUNCTION update_yolo_models_updated_at();

-- Function to automatically deactivate old models when a new one is activated
CREATE OR REPLACE FUNCTION deactivate_old_yolo_models()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated model is being set to active
    IF NEW.is_active = true THEN
        -- Deactivate all other models
        UPDATE yolo_models
        SET is_active = false
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one model is active at a time
CREATE TRIGGER trigger_deactivate_old_yolo_models
    AFTER INSERT OR UPDATE OF is_active ON yolo_models
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION deactivate_old_yolo_models();

-- Insert the currently uploaded model
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
    'v1.0.0',
    'latest.onnx',
    'yolo-models/latest.onnx',
    10695680, -- 10.20 MB in bytes
    '{
        "mAP50": 0.45,
        "mAP50_95": 0.30,
        "precision": 0.60,
        "recall": 0.55,
        "note": "Initial YOLOv11n model for building damage detection"
    }'::jsonb,
    '{
        "architecture": "YOLOv11n",
        "input_size": 640,
        "technique": "pretrained",
        "framework": "Ultralytics"
    }'::jsonb,
    true,
    'Initial YOLOv11n model - baseline for building damage detection'
) ON CONFLICT (version) DO UPDATE
SET
    filename = EXCLUDED.filename,
    storage_path = EXCLUDED.storage_path,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Create a view for easy model comparison
CREATE OR REPLACE VIEW yolo_models_comparison AS
SELECT
    version,
    filename,
    file_size,
    (metrics->>'mAP50')::numeric as map50,
    (metrics->>'mAP50_95')::numeric as map50_95,
    (metrics->>'precision')::numeric as precision,
    (metrics->>'recall')::numeric as recall,
    is_active,
    created_at,
    description
FROM yolo_models
ORDER BY created_at DESC;

-- Grant permissions on view
GRANT SELECT ON yolo_models_comparison TO authenticated;
GRANT SELECT ON yolo_models_comparison TO service_role;

-- Add comments for documentation
COMMENT ON TABLE yolo_models IS 'Tracks all YOLO model versions uploaded to Supabase storage with their metrics and configuration';
COMMENT ON COLUMN yolo_models.version IS 'Semantic version of the model (e.g., v1.0.0, v2.1.0)';
COMMENT ON COLUMN yolo_models.filename IS 'Filename in Supabase storage';
COMMENT ON COLUMN yolo_models.storage_path IS 'Full storage path in format: bucket/filename';
COMMENT ON COLUMN yolo_models.file_size IS 'Model file size in bytes';
COMMENT ON COLUMN yolo_models.metrics IS 'JSON object with model performance metrics (mAP50, precision, recall, etc.)';
COMMENT ON COLUMN yolo_models.training_config IS 'JSON object with training configuration details';
COMMENT ON COLUMN yolo_models.is_active IS 'Whether this model is currently being used in production (only one can be active)';
COMMENT ON COLUMN yolo_models.description IS 'Human-readable description of what makes this model version different';

-- Example queries for reference
COMMENT ON VIEW yolo_models_comparison IS 'Simplified view for comparing model versions and their performance metrics';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ YOLO models metadata table created successfully';
    RAISE NOTICE '📊 View created: yolo_models_comparison';
    RAISE NOTICE '🔄 Automatic model activation/deactivation triggers added';
    RAISE NOTICE '📝 Initial v1.0.0 model recorded in database';
END $$;