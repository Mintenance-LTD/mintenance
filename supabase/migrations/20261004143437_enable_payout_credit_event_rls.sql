-- Payout events are managed by privileged server functions only.
ALTER TABLE public.contractor_payout_credit_events ENABLE ROW LEVEL SECURITY;
