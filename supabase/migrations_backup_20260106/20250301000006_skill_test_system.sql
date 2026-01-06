-- Skill test system
-- Adds structured tables for assessments, attempts, answers, and audit history

-- Templates define a canonical exam per skill
CREATE TABLE IF NOT EXISTS public.skill_test_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  passing_score INTEGER NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_test_templates_skill_version
  ON public.skill_test_templates(skill_name, version);

CREATE INDEX IF NOT EXISTS idx_skill_test_templates_active_skill
  ON public.skill_test_templates(skill_name)
  WHERE is_active = true;

COMMENT ON TABLE public.skill_test_templates IS 'Reusable assessment templates per contractor skill.';

-- Individual questions tied to templates
CREATE TABLE IF NOT EXISTS public.skill_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.skill_test_templates(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options TEXT[] NOT NULL CHECK (array_length(options, 1) >= 2),
  correct_option_index SMALLINT NOT NULL CHECK (correct_option_index >= 0),
  explanation TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_test_questions_template
  ON public.skill_test_questions(template_id);

COMMENT ON TABLE public.skill_test_questions IS 'Question bank for skills exams.';

-- Attempt log per contractor + skill
CREATE TABLE IF NOT EXISTS public.skill_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.contractor_skills(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.skill_test_templates(id) ON DELETE RESTRICT,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  total_correct INTEGER NOT NULL DEFAULT 0 CHECK (total_correct >= 0),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_test_attempts_skill
  ON public.skill_test_attempts(skill_id);

CREATE INDEX IF NOT EXISTS idx_skill_test_attempts_contractor
  ON public.skill_test_attempts(contractor_id);

COMMENT ON TABLE public.skill_test_attempts IS 'Stores every exam attempt for contractor skills.';

-- Individual answers captured for auditability
CREATE TABLE IF NOT EXISTS public.skill_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.skill_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.skill_test_questions(id) ON DELETE CASCADE,
  selected_option SMALLINT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_test_answers_attempt
  ON public.skill_test_answers(attempt_id);

COMMENT ON TABLE public.skill_test_answers IS 'Per-question responses for skills exams.';

-- Audit log for both automated and manual verification outcomes
CREATE TABLE IF NOT EXISTS public.skill_verification_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.contractor_skills(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('test_attempt', 'manual_verification')),
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_verification_audits_skill
  ON public.skill_verification_audits(skill_id);

COMMENT ON TABLE public.skill_verification_audits IS 'Traceability for automated tests and manual overrides.';
