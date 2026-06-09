-- 2026-06-06 audit: /api/contractor/quote-templates (GET+POST) and the
-- mobile TemplateCRUD have always queried quote_templates +
-- quote_line_item_templates, but the tables were never created, so the
-- saved-quote-template feature 500'd. Columns below mirror exactly what the
-- route reads/writes (template_name, terms_and_conditions, usage_count,
-- deleted_at soft-delete) and what the line-item insert sends.
-- Applied to live project ukrjudtlvapiajkjbcrd via MCP on 2026-06-06.

CREATE TABLE IF NOT EXISTS public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  description text,
  terms_and_conditions text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_templates_contractor
  ON public.quote_templates(contractor_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.quote_line_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.quote_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_line_item_templates_template
  ON public.quote_line_item_templates(template_id);

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_item_templates ENABLE ROW LEVEL SECURITY;

-- A contractor owns (full CRUD) only their own templates.
CREATE POLICY quote_templates_owner_all ON public.quote_templates
  FOR ALL TO authenticated
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- Line items inherit ownership through the parent template.
CREATE POLICY quote_line_item_templates_owner_all ON public.quote_line_item_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quote_templates t
                 WHERE t.id = template_id AND t.contractor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quote_templates t
                      WHERE t.id = template_id AND t.contractor_id = auth.uid()));
