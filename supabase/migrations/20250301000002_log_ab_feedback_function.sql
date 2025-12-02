-- RPC to log A/B test outcomes atomically

CREATE OR REPLACE FUNCTION public.log_ab_outcome(
  p_decision_id UUID,
  p_assessment_id UUID,
  p_experiment_id UUID,
  p_assignment_id UUID,
  p_arm_id UUID,
  p_reward NUMERIC,
  p_sfn BOOLEAN,
  p_true_class TEXT,
  p_predicted_class TEXT,
  p_validated_by UUID,
  p_validated_at TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  id UUID,
  decision_id UUID,
  assessment_id UUID,
  experiment_id UUID,
  assignment_id UUID,
  arm_id UUID,
  reward NUMERIC,
  sfn BOOLEAN,
  true_class TEXT,
  predicted_class TEXT,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  upserted ab_outcomes%ROWTYPE;
BEGIN
  INSERT INTO public.ab_outcomes (
    decision_id,
    assessment_id,
    experiment_id,
    assignment_id,
    arm_id,
    reward,
    sfn,
    true_class,
    predicted_class,
    validated_by,
    validated_at
  )
  VALUES (
    p_decision_id,
    p_assessment_id,
    p_experiment_id,
    p_assignment_id,
    p_arm_id,
    p_reward,
    p_sfn,
    p_true_class,
    p_predicted_class,
    p_validated_by,
    COALESCE(p_validated_at, now())
  )
  ON CONFLICT (decision_id) DO UPDATE SET
    assessment_id = EXCLUDED.assessment_id,
    experiment_id = EXCLUDED.experiment_id,
    assignment_id = EXCLUDED.assignment_id,
    arm_id = EXCLUDED.arm_id,
    reward = EXCLUDED.reward,
    sfn = EXCLUDED.sfn,
    true_class = EXCLUDED.true_class,
    predicted_class = EXCLUDED.predicted_class,
    validated_by = EXCLUDED.validated_by,
    validated_at = EXCLUDED.validated_at
  RETURNING * INTO upserted;

  RETURN QUERY SELECT
    upserted.id,
    upserted.decision_id,
    upserted.assessment_id,
    upserted.experiment_id,
    upserted.assignment_id,
    upserted.arm_id,
    upserted.reward,
    upserted.sfn,
    upserted.true_class,
    upserted.predicted_class,
    upserted.validated_by,
    upserted.validated_at,
    upserted.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

COMMENT ON FUNCTION public.log_ab_outcome IS 'Atomically logs or updates ab_outcomes rows for Safe-LUCB feedback ingestion.';

GRANT EXECUTE ON FUNCTION public.log_ab_outcome(UUID, UUID, UUID, UUID, UUID, NUMERIC, BOOLEAN, TEXT, TEXT, UUID, TIMESTAMPTZ) TO anon, authenticated, service_role;
