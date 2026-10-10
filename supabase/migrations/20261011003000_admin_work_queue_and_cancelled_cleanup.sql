-- Service-only work queue. Assignment and completion are serialized to avoid double assignment.
create table if not exists public.admin_verification_tasks (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null unique references public.profiles(id),
  admin_id uuid not null references public.profiles(id),
  status text not null default 'open' check (status in ('open','completed')),
  email_status text not null default 'pending' check (email_status in ('pending','sending','sent','needs_review')),
  created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.admin_verification_tasks enable row level security;
revoke all on public.admin_verification_tasks from anon, authenticated;
grant all on public.admin_verification_tasks to service_role;
create index if not exists admin_verification_tasks_workload on public.admin_verification_tasks(admin_id) where status = 'open';

create or replace function public.assign_admin_verifications() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare candidate record; assignee uuid; assigned integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('admin_verification_assignment'));
  update admin_verification_tasks t set status='completed', completed_at=now()
  from profiles p where p.id=t.contractor_id and t.status='open'
    and (p.admin_verified is true or p.deleted_at is not null or p.role <> 'contractor' or p.background_check_status='rejected' or exists (select 1 from verification_history h where h.user_id=p.id and h.action in ('approved','rejected','auto_approved') and h.created_at >= t.created_at));
  for candidate in select p.id from profiles p
    where p.role='contractor' and p.background_check_status is distinct from 'rejected' and p.admin_verified is not true and p.deleted_at is null
      and nullif(trim(p.company_name),'') is not null and nullif(trim(p.license_number),'') is not null
      and not exists (select 1 from admin_verification_tasks t where t.contractor_id=p.id)
    order by p.created_at, p.id limit 100
  loop
    select p.id into assignee from profiles p
      left join admin_verification_tasks t on t.admin_id=p.id and t.status='open'
      where p.role='admin' and p.deleted_at is null and p.is_available is true
      group by p.id order by count(t.id), max(t.created_at) nulls first, p.id limit 1;
    exit when assignee is null;
    insert into admin_verification_tasks(contractor_id,admin_id) values(candidate.id,assignee);
    assigned := assigned + 1;
  end loop;
  return assigned;
end $$;
revoke all on function public.assign_admin_verifications() from public, anon, authenticated;
grant execute on function public.assign_admin_verifications() to service_role;

-- Start the grace period at migration time for existing cancellations: never guess cancellation dates.
alter table public.jobs add column if not exists cancelled_at timestamptz;
update public.jobs set cancelled_at=now() where status='cancelled' and cancelled_at is null;
create or replace function public.track_job_cancellation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.status='cancelled' and (tg_op='INSERT' or old.status is distinct from new.status) then
    new.cancelled_at=now();
  elsif new.status <> 'cancelled' then new.cancelled_at=null;
  end if;
  return new;
end $$;
create trigger track_job_cancellation before insert or update of status on public.jobs
for each row execute function public.track_job_cancellation();

-- Only delete standalone jobs. ANY foreign-key reference or photos preserve the record.
create or replace function public.cleanup_cancelled_jobs() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare job record; dependency record; referenced boolean; blocked boolean; removed integer := 0;
begin
  for job in select j.id from jobs j where j.status='cancelled'
    and j.cancelled_at < now()-interval '7 days'
    and j.contractor_id is null and j.payment_status in ('pending','unpaid')
    and coalesce(j.photos,'[]'::jsonb)='[]'::jsonb
    order by j.cancelled_at limit 100 for update skip locked
  loop
    blocked := false;
    for dependency in
      select c.conrelid::regclass relation, a.attname column_name
      from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
      where c.contype='f' and c.confrelid='public.jobs'::regclass
    loop
      execute format('select exists(select 1 from %s where %I::text=$1)', dependency.relation, dependency.column_name)
        into referenced using job.id::text;
      if referenced then blocked := true; exit; end if;
    end loop;
    if not blocked then delete from jobs where id=job.id; removed := removed+1; end if;
  end loop;
  return removed;
end $$;
revoke all on function public.cleanup_cancelled_jobs() from public, anon, authenticated;
grant execute on function public.cleanup_cancelled_jobs() to service_role;
