-- Payment rows and lifecycle changes must be created by the server-side
-- payment/webhook services. Client identities may only read rows in which
-- they are the payer, payee, or an administrator.
drop policy if exists "payments_insert_policy" on public.payments;
drop policy if exists "payments_update_policy" on public.payments;
revoke insert, update, delete on public.payments from anon, authenticated;
