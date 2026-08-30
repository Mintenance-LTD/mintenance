REVOKE UPDATE ON public.jobs FROM authenticated;

GRANT UPDATE (
  description,
  location,
  latitude,
  longitude,
  urgency,
  priority,
  category,
  requirements,
  budget,
  budget_min,
  budget_max,
  show_budget_to_contractors,
  require_itemized_bids,
  updated_at
) ON public.jobs TO authenticated;

REVOKE UPDATE, DELETE ON public.contracts FROM authenticated;
REVOKE UPDATE, DELETE ON public.escrow_transactions FROM authenticated;

COMMENT ON TABLE public.jobs IS
  'Job marketplace rows. Direct client UPDATE limited to cosmetic columns; status / contractor_id / completion flags require API route mediation (revoked 2026-05-23).';
COMMENT ON TABLE public.contracts IS
  'Direct client UPDATE is fully revoked; mutations must go through /api/contracts/* (revoked 2026-05-23).';
COMMENT ON TABLE public.escrow_transactions IS
  'Direct client UPDATE is fully revoked; mutations must go through escrow services (revoked 2026-05-23).';;
