-- Add JSONB size constraints to prevent unbounded storage of malformed/huge payloads.
-- 100 KB limit per response column, 500 KB for assessment columns.

ALTER TABLE vlm_shadow_comparisons
  ADD CONSTRAINT chk_shadow_student_response_size
    CHECK (student_response IS NULL OR octet_length(student_response::text) < 102400),
  ADD CONSTRAINT chk_shadow_teacher_response_size
    CHECK (teacher_response IS NULL OR octet_length(teacher_response::text) < 102400);

ALTER TABLE vlm_training_buffer
  ADD CONSTRAINT chk_buffer_teacher_response_size
    CHECK (octet_length(teacher_response::text) < 102400),
  ADD CONSTRAINT chk_buffer_student_response_size
    CHECK (student_response IS NULL OR octet_length(student_response::text) < 102400),
  ADD CONSTRAINT chk_buffer_system_prompt_size
    CHECK (octet_length(system_prompt) < 32768),
  ADD CONSTRAINT chk_buffer_user_prompt_size
    CHECK (octet_length(user_prompt) < 65536);

ALTER TABLE vlm_safety_violations
  ADD CONSTRAINT chk_violation_student_assessment_size
    CHECK (student_assessment IS NULL OR octet_length(student_assessment::text) < 102400),
  ADD CONSTRAINT chk_violation_teacher_assessment_size
    CHECK (teacher_assessment IS NULL OR octet_length(teacher_assessment::text) < 102400);
