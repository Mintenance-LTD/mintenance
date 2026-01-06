-- Migration: Add Video Assessment Tables for SAM 2 Video Processing
-- Created: 2025-12-20
-- Description: Creates tables for video-based damage assessments with temporal tracking

-- ============================================================================
-- VIDEO ASSESSMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Processing identifiers
  processing_id UUID NOT NULL UNIQUE,
  video_url TEXT,

  -- Video metadata
  duration_seconds DECIMAL(10, 2) NOT NULL,
  total_frames INTEGER NOT NULL,
  processed_frames INTEGER NOT NULL,
  extraction_fps DECIMAL(5, 2) NOT NULL,
  resolution_width INTEGER NOT NULL,
  resolution_height INTEGER NOT NULL,

  -- Assessment results
  total_unique_damages INTEGER NOT NULL DEFAULT 0,
  overall_severity VARCHAR(20) NOT NULL CHECK (overall_severity IN ('none', 'early', 'midway', 'full')),
  confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- High priority damages (array of damage types)
  high_priority_damages TEXT[] DEFAULT '{}',

  -- Full assessment data (stores complete AggregatedDamageAssessment)
  assessment_data JSONB NOT NULL DEFAULT '{}',

  -- Processing metadata
  processing_status VARCHAR(20) NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('queued', 'downloading', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  processing_time_seconds DECIMAL(10, 2),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE video_assessments IS 'Stores video-based damage assessments from SAM 2 with temporal tracking';
COMMENT ON COLUMN video_assessments.processing_id IS 'Unique identifier for video processing job';
COMMENT ON COLUMN video_assessments.assessment_data IS 'Complete AggregatedDamageAssessment JSON structure';

-- ============================================================================
-- DAMAGE TRAJECTORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS damage_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_assessment_id UUID NOT NULL REFERENCES video_assessments(id) ON DELETE CASCADE,

  -- Tracking information
  track_id VARCHAR(50) NOT NULL,
  damage_type VARCHAR(100) NOT NULL,

  -- Temporal information
  first_frame INTEGER NOT NULL,
  last_frame INTEGER NOT NULL,
  duration_seconds DECIMAL(10, 2) NOT NULL,

  -- Confidence metrics
  average_confidence DECIMAL(5, 4) NOT NULL CHECK (average_confidence >= 0 AND average_confidence <= 1),
  max_confidence DECIMAL(5, 4) NOT NULL CHECK (max_confidence >= 0 AND max_confidence <= 1),

  -- Consistency metrics
  is_consistent BOOLEAN NOT NULL DEFAULT false,
  consistency_score DECIMAL(5, 4) NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 1),

  -- Number of tracking points
  num_tracking_points INTEGER NOT NULL,

  -- Full trajectory data (tracking points array)
  tracking_points JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE damage_trajectories IS 'Stores individual damage trajectories tracked across video frames';
COMMENT ON COLUMN damage_trajectories.track_id IS 'Unique identifier for this damage track';
COMMENT ON COLUMN damage_trajectories.consistency_score IS 'Temporal consistency score (0-1) indicating tracking quality';
COMMENT ON COLUMN damage_trajectories.tracking_points IS 'Array of tracking points with frame, timestamp, bbox, confidence';

-- ============================================================================
-- VIDEO DAMAGE SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_damage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_assessment_id UUID NOT NULL REFERENCES video_assessments(id) ON DELETE CASCADE,

  -- Damage type information
  damage_type VARCHAR(100) NOT NULL,
  instance_count INTEGER NOT NULL DEFAULT 0,
  total_detections INTEGER NOT NULL DEFAULT 0,

  -- Confidence metrics
  average_confidence DECIMAL(5, 4) NOT NULL CHECK (average_confidence >= 0 AND average_confidence <= 1),
  max_confidence DECIMAL(5, 4) NOT NULL CHECK (max_confidence >= 0 AND max_confidence <= 1),

  -- Temporal metrics
  temporal_coverage DECIMAL(5, 4) NOT NULL CHECK (temporal_coverage >= 0 AND temporal_coverage <= 1),

  -- Severity assessment
  severity_estimate VARCHAR(20) NOT NULL CHECK (severity_estimate IN ('none', 'early', 'midway', 'full')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint to prevent duplicate damage types per assessment
  UNIQUE(video_assessment_id, damage_type)
);

COMMENT ON TABLE video_damage_summary IS 'Summary of damage types detected in video assessment';
COMMENT ON COLUMN video_damage_summary.temporal_coverage IS 'Percentage of frames containing this damage type';

-- ============================================================================
-- TEMPORAL ANALYSIS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporal_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_assessment_id UUID NOT NULL REFERENCES video_assessments(id) ON DELETE CASCADE,

  -- Detection statistics
  peak_detection_frame INTEGER,
  peak_detection_count INTEGER,
  detection_density DECIMAL(5, 4) NOT NULL CHECK (detection_density >= 0 AND detection_density <= 1),

  -- Clustering analysis
  temporal_clustering VARCHAR(20) NOT NULL
    CHECK (temporal_clustering IN ('none', 'sparse', 'distributed', 'clustered')),
  temporal_spread DECIMAL(5, 4) NOT NULL CHECK (temporal_spread >= 0 AND temporal_spread <= 1),

  -- Frame statistics
  frames_with_detection INTEGER NOT NULL,
  total_frames_analyzed INTEGER NOT NULL,

  -- Detection timeline (array of {frame, count} objects)
  detection_timeline JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure one temporal analysis per video assessment
  UNIQUE(video_assessment_id)
);

COMMENT ON TABLE temporal_analysis IS 'Temporal pattern analysis for video assessments';
COMMENT ON COLUMN temporal_analysis.detection_density IS 'Ratio of frames with detections to total frames';
COMMENT ON COLUMN temporal_analysis.temporal_clustering IS 'Pattern of damage detection distribution across video';

-- ============================================================================
-- FRAME DETECTIONS TABLE (Optional - for detailed frame-by-frame storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS frame_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_assessment_id UUID NOT NULL REFERENCES video_assessments(id) ON DELETE CASCADE,

  -- Frame information
  frame_number INTEGER NOT NULL,
  timestamp_seconds DECIMAL(10, 3) NOT NULL,

  -- Detection data
  num_detections INTEGER NOT NULL DEFAULT 0,
  detections JSONB NOT NULL DEFAULT '[]',
  presence_scores JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint for frame number per assessment
  UNIQUE(video_assessment_id, frame_number)
);

COMMENT ON TABLE frame_detections IS 'Optional detailed storage of frame-by-frame detections';
COMMENT ON COLUMN frame_detections.detections IS 'Array of damage instances detected in this frame';
COMMENT ON COLUMN frame_detections.presence_scores IS 'Presence scores for each damage type in this frame';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for video_assessments
CREATE INDEX IF NOT EXISTS idx_video_assessments_user_id ON video_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_assessments_processing_id ON video_assessments(processing_id);
CREATE INDEX IF NOT EXISTS idx_video_assessments_processing_status ON video_assessments(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_assessments_overall_severity ON video_assessments(overall_severity);
CREATE INDEX IF NOT EXISTS idx_video_assessments_created_at ON video_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_assessments_high_priority ON video_assessments USING GIN(high_priority_damages);

-- Indexes for damage_trajectories
CREATE INDEX IF NOT EXISTS idx_damage_trajectories_video_assessment_id ON damage_trajectories(video_assessment_id);
CREATE INDEX IF NOT EXISTS idx_damage_trajectories_damage_type ON damage_trajectories(damage_type);
CREATE INDEX IF NOT EXISTS idx_damage_trajectories_consistency ON damage_trajectories(is_consistent, consistency_score);

-- Indexes for video_damage_summary
CREATE INDEX IF NOT EXISTS idx_video_damage_summary_video_assessment_id ON video_damage_summary(video_assessment_id);
CREATE INDEX IF NOT EXISTS idx_video_damage_summary_damage_type ON video_damage_summary(damage_type);
CREATE INDEX IF NOT EXISTS idx_video_damage_summary_severity ON video_damage_summary(severity_estimate);

-- Indexes for temporal_analysis
CREATE INDEX IF NOT EXISTS idx_temporal_analysis_video_assessment_id ON temporal_analysis(video_assessment_id);
CREATE INDEX IF NOT EXISTS idx_temporal_analysis_clustering ON temporal_analysis(temporal_clustering);

-- Indexes for frame_detections (if used)
CREATE INDEX IF NOT EXISTS idx_frame_detections_video_assessment_id ON frame_detections(video_assessment_id);
CREATE INDEX IF NOT EXISTS idx_frame_detections_frame_number ON frame_detections(frame_number);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_video_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_assessments_updated_at
  BEFORE UPDATE ON video_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_video_assessments_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE video_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_damage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_detections ENABLE ROW LEVEL SECURITY;

-- Video assessments policies
CREATE POLICY "Users can view their own video assessments"
  ON video_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video assessments"
  ON video_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video assessments"
  ON video_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video assessments"
  ON video_assessments FOR DELETE
  USING (auth.uid() = user_id);

-- Damage trajectories policies (read-only for users)
CREATE POLICY "Users can view trajectories for their video assessments"
  ON damage_trajectories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_assessments
      WHERE video_assessments.id = damage_trajectories.video_assessment_id
      AND video_assessments.user_id = auth.uid()
    )
  );

-- Video damage summary policies (read-only for users)
CREATE POLICY "Users can view damage summary for their video assessments"
  ON video_damage_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_assessments
      WHERE video_assessments.id = video_damage_summary.video_assessment_id
      AND video_assessments.user_id = auth.uid()
    )
  );

-- Temporal analysis policies (read-only for users)
CREATE POLICY "Users can view temporal analysis for their video assessments"
  ON temporal_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_assessments
      WHERE video_assessments.id = temporal_analysis.video_assessment_id
      AND video_assessments.user_id = auth.uid()
    )
  );

-- Frame detections policies (read-only for users)
CREATE POLICY "Users can view frame detections for their video assessments"
  ON frame_detections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_assessments
      WHERE video_assessments.id = frame_detections.video_assessment_id
      AND video_assessments.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get video assessment statistics for a user
CREATE OR REPLACE FUNCTION get_user_video_assessment_stats(p_user_id UUID)
RETURNS TABLE (
  total_assessments BIGINT,
  completed_assessments BIGINT,
  failed_assessments BIGINT,
  total_damages_detected BIGINT,
  avg_processing_time DECIMAL,
  most_common_damage_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total_assessments,
      COUNT(*) FILTER (WHERE processing_status = 'completed') AS completed_assessments,
      COUNT(*) FILTER (WHERE processing_status = 'failed') AS failed_assessments,
      SUM(total_unique_damages) AS total_damages_detected,
      AVG(processing_time_seconds) AS avg_processing_time
    FROM video_assessments
    WHERE user_id = p_user_id
  ),
  damage_counts AS (
    SELECT damage_type, COUNT(*) as count
    FROM video_damage_summary vds
    JOIN video_assessments va ON va.id = vds.video_assessment_id
    WHERE va.user_id = p_user_id
    GROUP BY damage_type
    ORDER BY count DESC
    LIMIT 1
  )
  SELECT
    s.total_assessments,
    s.completed_assessments,
    s.failed_assessments,
    COALESCE(s.total_damages_detected, 0) AS total_damages_detected,
    s.avg_processing_time,
    dc.damage_type AS most_common_damage_type
  FROM stats s
  LEFT JOIN damage_counts dc ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_video_assessment_stats IS 'Get video assessment statistics for a user';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment below to insert sample data for testing

/*
-- Sample video assessment
INSERT INTO video_assessments (
  user_id,
  processing_id,
  video_url,
  duration_seconds,
  total_frames,
  processed_frames,
  extraction_fps,
  resolution_width,
  resolution_height,
  total_unique_damages,
  overall_severity,
  confidence_level,
  high_priority_damages,
  processing_status,
  processing_completed_at,
  processing_time_seconds
) VALUES (
  (SELECT id FROM users LIMIT 1), -- Replace with actual user ID
  gen_random_uuid(),
  'https://example.com/sample-video.mp4',
  30.5,
  915,
  61,
  2.0,
  1920,
  1080,
  3,
  'midway',
  'high',
  ARRAY['water damage', 'structural damage'],
  'completed',
  NOW(),
  15.3
);
*/