-- Reserve examples while a remote training job is running. A reservation is
-- released on failure and converted to used_in_training only after a signed,
-- successful worker callback.
alter table public.vlm_training_buffer
  add column if not exists reserved_by_job_id text,
  add column if not exists reserved_at timestamptz;

create index if not exists idx_vlm_training_buffer_reservation
  on public.vlm_training_buffer (reserved_by_job_id)
  where reserved_by_job_id is not null;

comment on column public.vlm_training_buffer.reserved_by_job_id is
  'Distillation job currently holding this example; not proof that training completed.';

comment on column public.vlm_training_buffer.reserved_at is
  'Time this example was reserved for dispatch to the training worker.';

-- Keep historical rows for audit, but prevent unattributed measurements from
-- driving a current model. Calibration is now scoped to a concrete model ID.
alter table public.vlm_student_calibration
  add column if not exists model_version text not null default 'unattributed',
  add column if not exists invalidated_at timestamptz;

alter table public.vlm_routing_decisions
  add column if not exists model_version text,
  add column if not exists invalidated_at timestamptz;

update public.vlm_student_calibration
set invalidated_at = coalesce(invalidated_at, now())
where model_version = 'unattributed';

update public.vlm_routing_decisions
set invalidated_at = coalesce(invalidated_at, now())
where model_version is null;

alter table public.vlm_student_calibration
  drop constraint if exists vlm_student_calibration_category_key;

alter table public.vlm_student_calibration
  add constraint vlm_student_calibration_category_model_key
  unique (category, model_version);

create index if not exists idx_vlm_student_calibration_active_model
  on public.vlm_student_calibration (model_version, category)
  where invalidated_at is null;

create index if not exists idx_vlm_routing_decisions_active_model
  on public.vlm_routing_decisions (model_version, created_at desc)
  where invalidated_at is null;
