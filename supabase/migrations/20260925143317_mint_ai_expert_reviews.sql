-- Expert reference labels are separate from mutable customer assessments and training labels.
create table public.assessment_expert_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.building_assessments(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  property_id uuid,
  domain text not null,
  labels jsonb not null check (jsonb_typeof(labels) = 'object'),
  notes text not null check (char_length(notes) between 10 and 4000),
  expertise text not null check (char_length(expertise) between 3 and 200),
  evidence_image_ids uuid[] not null check (cardinality(evidence_image_ids) between 1 and 100),
  protocol_version text not null check (protocol_version = 'primary-defect-v1')
);
create index assessment_expert_reviews_assessment on public.assessment_expert_reviews (assessment_id, created_at desc);
create index assessment_expert_reviews_reviewer on public.assessment_expert_reviews (reviewer_id);
create index assessment_expert_reviews_report on public.assessment_expert_reviews (created_at, id);
alter table public.assessment_expert_reviews enable row level security;
-- All access goes through server routes with database-verified admin roles.
revoke all on public.assessment_expert_reviews from public, anon, authenticated, service_role;
grant select, insert on public.assessment_expert_reviews to service_role;
comment on table public.assessment_expert_reviews is 'Append-only expert review revisions. Historical audit only; not automatically admitted to training or held-out benchmarks.';
