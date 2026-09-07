-- Phase 3.7: a message sender must participate in the target job.
-- Marketplace visibility does not grant messaging rights.
drop policy if exists "messages_insert_policy" on public.messages;

create policy "messages_insert_policy"
on public.messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and (
        j.homeowner_id = (select auth.uid())
        or j.contractor_id = (select auth.uid())
        or public.is_admin((select auth.uid()))
      )
      and receiver_id in (j.homeowner_id, j.contractor_id)
      and receiver_id <> (select auth.uid())
  )
);
