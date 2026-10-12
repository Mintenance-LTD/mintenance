-- Disputes are durable work items; delivery must survive a failed HTTP response.
create table public.admin_dispute_tasks (
 id uuid primary key default gen_random_uuid(),
 dispute_id uuid not null unique references public.disputes(id),
 admin_id uuid references public.profiles(id),
 status text not null default 'open' check (status in ('open','completed')),
 email_status text not null default 'pending' check(email_status in ('pending','sending','sent','needs_review')),
 created_at timestamptz not null default now(), completed_at timestamptz, email_claimed_at timestamptz
);
alter table public.admin_dispute_tasks enable row level security;
revoke all on public.admin_dispute_tasks from public, anon, authenticated;
grant all on public.admin_dispute_tasks to service_role;
create index admin_dispute_tasks_workload on public.admin_dispute_tasks(admin_id) where status='open';

-- Existing payment RPCs insert inbox rows inside their settlement transaction.
-- Queue push-only delivery of those rows, rather than creating a second inbox entry.
create function public.queue_dispute_payment_push() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.title in ('Dispute opened','Dispute submitted','Dispute assigned to you','Dispute resolution confirmed','Refund confirmed','Payment release confirmed') then
  insert into public.notification_queue(id,user_id,notification_type,title,message,action_url,metadata,scheduled_for,priority,status,retry_count)
  values(new.id,new.user_id,new.type,new.title,new.message,new.action_url,
    coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('original_notification_id',new.id),now(),'high','failed_push',0)
  on conflict(id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.queue_dispute_payment_push() from public,anon,authenticated;
create trigger queue_dispute_payment_push after insert on public.notifications
 for each row execute function public.queue_dispute_payment_push();

create function public.assign_admin_disputes() returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare task record; assignee uuid; assigned integer:=0;
begin
 perform pg_advisory_xact_lock(hashtext('admin_verification_assignment'));
 update public.admin_dispute_tasks t set status='completed',completed_at=now()
 from public.disputes d where t.dispute_id=d.id and t.status='open' and d.status='resolved';
 for task in select t.id,t.dispute_id,d.job_id,j.title from public.admin_dispute_tasks t
 join public.disputes d on d.id=t.dispute_id join public.jobs j on j.id=d.job_id
 where t.status='open' and t.admin_id is null order by t.created_at,t.id limit 100
 loop
  select p.id into assignee from public.profiles p
  where p.role='admin' and p.deleted_at is null and p.is_available is true
  order by (select count(*) from public.admin_dispute_tasks t where t.admin_id=p.id and t.status='open')+
   (select count(*) from public.admin_verification_tasks v where v.admin_id=p.id and v.status='open'),p.id limit 1;
  exit when assignee is null;
  update public.admin_dispute_tasks set admin_id=assignee where id=task.id;
  insert into public.notifications(user_id,type,title,message,action_url,metadata)
  values(assignee,'payment','Dispute assigned to you','Review the dispute for '||task.title||' and its supporting evidence.',
   '/admin/disputes',jsonb_build_object('disputeId',task.dispute_id,'jobId',task.job_id,'adminTaskId',task.id));
  assigned:=assigned+1;
 end loop;
 return assigned;
end $$;
revoke all on function public.assign_admin_disputes() from public,anon,authenticated;
grant execute on function public.assign_admin_disputes() to service_role;

create function public.dispute_opened_delivery() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare job_title text;
begin
 if tg_op='UPDATE' then
  if new.status='resolved' then
   update public.admin_dispute_tasks set status='completed',completed_at=now() where dispute_id=new.id and status='open';
  end if;
  return new;
 end if;
 select title into job_title from public.jobs where id=new.job_id;
 -- The linked escrow row is inserted later by the creation RPC: use the job URL,
 -- which both participants can open without depending on trigger ordering.
 insert into public.notifications(user_id,type,title,message,action_url,metadata)
 select recipient,'payment',case when recipient=new.raised_by then 'Dispute submitted' else 'Dispute opened' end,
  case when recipient=new.raised_by then 'Your dispute for ' else 'A dispute was opened for ' end || coalesce(job_title,'your job') || '. Payment release is paused while it is reviewed.',
  '/jobs/'||new.job_id::text,jsonb_build_object('disputeId',new.id,'jobId',new.job_id)
 from (select distinct unnest(array[new.raised_by,new.against]) recipient) recipients where recipient is not null;
 insert into public.admin_dispute_tasks(dispute_id) values(new.id) on conflict(dispute_id) do nothing;
 perform public.assign_admin_disputes();
 return new;
end $$;
revoke all on function public.dispute_opened_delivery() from public,anon,authenticated;
create trigger dispute_opened_delivery after insert or update of status on public.disputes
 for each row execute function public.dispute_opened_delivery();
-- Do not replay historical notifications or resolved work as new events.
insert into public.admin_dispute_tasks(dispute_id)
 select id from public.disputes where status in ('open','under_review','escalated') on conflict(dispute_id) do nothing;
