-- Restrict marketplace visibility to unassigned jobs for contractors. The previous consolidated
-- policy allowed every authenticated user to read every non-draft job,
-- including private lifecycle data belonging to another homeowner.
drop policy if exists "rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1" on public.jobs;

create policy "rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1"
on public.jobs
for select
to authenticated
using (
  homeowner_id = (select auth.uid())
  or contractor_id = (select auth.uid())
  or public.is_admin((select auth.uid()))
  or (
    contractor_id is null
    and status in ('open', 'posted')
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'contractor'
    )
  )
);
