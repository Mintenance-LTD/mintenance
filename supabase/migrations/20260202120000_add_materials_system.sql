-- ================================================
-- MATERIALS SYSTEM
-- ================================================
-- Purpose: Create materials pricing database for accurate cost tracking
-- Phase: 2 - Material Cost Tracking Foundation
-- Access: Public read, Admin-only write
-- ================================================

-- ================================================
-- 1. CREATE MATERIALS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Information
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'lumber',      -- Timber, plywood, MDF
    'concrete',    -- Cement, sand, aggregates
    'brick',       -- Bricks, blocks, mortar
    'tile',        -- Ceramic, porcelain, stone tiles
    'insulation',  -- Loft, cavity wall, pipe insulation
    'drywall',     -- Plasterboard, joint compound, beading
    'paint',       -- Emulsion, masonry, primer, woodwork
    'roofing',     -- Tiles, felt, ridge, flashing
    'plumbing',    -- Pipes, fittings, radiators, taps
    'electrical',  -- Cable, sockets, switches, consumer units
    'hardware',    -- Screws, nails, brackets, hinges
    'glass',       -- Windows, double glazing, mirrors
    'sealants',    -- Silicone, mastic, foam, tape
    'fasteners',   -- Bolts, wall plugs, anchors
    'other'        -- Miscellaneous materials
  )),
  description TEXT,

  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT NOT NULL CHECK (unit IN (
    'each',   -- Individual items
    'meter',  -- Linear meters
    'sqm',    -- Square meters
    'liter',  -- Litres (paint, sealants)
    'kg',     -- Kilograms (dry goods)
    'bundle', -- Bundled items
    'box',    -- Boxed quantities
    'sqft',   -- Square feet
    'sheet'   -- Sheet materials
  )),

  -- Bulk Pricing (optional discounts)
  bulk_quantity INTEGER CHECK (bulk_quantity IS NULL OR bulk_quantity > 0),
  bulk_unit_price DECIMAL(10,2) CHECK (bulk_unit_price IS NULL OR bulk_unit_price >= 0),

  -- Product Identification
  sku TEXT UNIQUE,
  barcode TEXT,
  brand TEXT,

  -- Availability
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  lead_time_days INTEGER DEFAULT 0 CHECK (lead_time_days >= 0),

  -- Additional Data (flexible JSONB for attributes like color, size, grade, finish)
  specifications JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  supplier_name TEXT,
  supplier_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

-- Category filtering (most common query pattern)
CREATE INDEX idx_materials_category ON public.materials(category);

-- Full-text search on material names
CREATE INDEX idx_materials_name ON public.materials USING gin(name gin_trgm_ops);

-- Supplier lookup
CREATE INDEX idx_materials_supplier ON public.materials(supplier_id) WHERE supplier_id IS NOT NULL;

-- SKU lookup (partial index for non-null SKUs only)
CREATE INDEX idx_materials_sku ON public.materials(sku) WHERE sku IS NOT NULL;

-- Filter available materials
CREATE INDEX idx_materials_in_stock ON public.materials(in_stock) WHERE in_stock = true;

-- Created/updated timestamps for sorting
CREATE INDEX idx_materials_created_at ON public.materials(created_at DESC);

-- ================================================
-- 3. CREATE TRIGGERS
-- ================================================

-- Auto-update updated_at timestamp on row modification
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. CREATE RLS POLICIES
-- ================================================

-- Public read access - All users can view materials catalog
CREATE POLICY "materials_read_all"
  ON public.materials
  FOR SELECT
  USING (true);

-- Admin-only INSERT access
CREATE POLICY "materials_admin_insert"
  ON public.materials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin-only UPDATE access
CREATE POLICY "materials_admin_update"
  ON public.materials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin-only DELETE access
CREATE POLICY "materials_admin_delete"
  ON public.materials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- 6. ADD TABLE COMMENTS
-- ================================================

COMMENT ON TABLE public.materials IS
  'Central materials catalog for construction supplies with pricing. '
  'Public read access, admin-only write. Used for accurate cost '
  'estimation and bid preparation.';

COMMENT ON COLUMN public.materials.category IS
  'Material category for filtering and organization. Matches UK construction industry standards.';

COMMENT ON COLUMN public.materials.unit_price IS
  'Price per unit in GBP. Must be non-negative.';

COMMENT ON COLUMN public.materials.bulk_unit_price IS
  'Discounted price when purchasing bulk_quantity or more units. Must be less than unit_price.';

COMMENT ON COLUMN public.materials.specifications IS
  'Flexible JSONB field for material attributes: {color, size, grade, finish, weight, dimensions, etc}';

COMMENT ON COLUMN public.materials.supplier_name IS
  'UK supplier name (e.g., Jewson, Wickes, Travis Perkins, Screwfix, B&Q)';

-- ================================================
-- END OF MIGRATION
-- ================================================
