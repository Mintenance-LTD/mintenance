-- Add skill_icon column to contractor_skills table
-- Allows contractors to choose icons that represent their skills on maps

ALTER TABLE public.contractor_skills
ADD COLUMN IF NOT EXISTS skill_icon VARCHAR(50);

-- Add comment
COMMENT ON COLUMN public.contractor_skills.skill_icon IS 'Icon name from Icon component to display on maps for this skill';

-- Create index for queries filtering by icon
CREATE INDEX IF NOT EXISTS idx_contractor_skills_icon ON public.contractor_skills(skill_icon);

