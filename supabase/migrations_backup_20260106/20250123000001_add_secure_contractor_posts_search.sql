-- ==========================================================
-- Secure Contractor Posts Search Function
-- ==========================================================
-- This migration adds a secure search function for contractor_posts
-- that prevents SQL injection by using parameterized queries and
-- full-text search instead of vulnerable string interpolation.
--
-- Security: Replaces .or() with string interpolation which bypasses
-- Supabase's parameterization and is vulnerable to SQL injection.
--
-- Created: 2025-01-23

BEGIN;

-- Step 1: Ensure contractor_posts has content column (not just description)
-- This aligns with the API code expectations
DO $$
BEGIN
  -- Check if content column exists, if not check if description exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'contractor_posts'
                 AND column_name = 'content') THEN

    -- If description exists, rename it to content for consistency
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
               AND table_name = 'contractor_posts'
               AND column_name = 'description') THEN
      ALTER TABLE public.contractor_posts RENAME COLUMN description TO content;
    ELSE
      -- If neither exists, add content column
      ALTER TABLE public.contractor_posts ADD COLUMN content TEXT;
    END IF;
  END IF;
END $$;

-- Step 2: Add full-text search columns for efficient searching
-- Using tsvector for optimized full-text search performance
ALTER TABLE public.contractor_posts
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B')
) STORED;

-- Step 3: Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_contractor_posts_search_vector
ON public.contractor_posts USING GIN(search_vector);

-- Step 4: Add trigram indexes for fuzzy/partial matching (for typo tolerance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_contractor_posts_title_trgm
ON public.contractor_posts USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contractor_posts_content_trgm
ON public.contractor_posts USING GIN(content gin_trgm_ops);

-- Step 5: Create secure search function using full-text search
-- This function is safe from SQL injection because it uses parameterized queries
CREATE OR REPLACE FUNCTION public.search_contractor_posts(
  search_text TEXT,
  post_type_filter TEXT DEFAULT NULL,
  is_active_filter BOOLEAN DEFAULT TRUE,
  is_flagged_filter BOOLEAN DEFAULT FALSE,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0,
  sort_by TEXT DEFAULT 'newest'
)
RETURNS TABLE(
  id UUID,
  contractor_id UUID,
  title VARCHAR(255),
  content TEXT,
  post_type VARCHAR(50),
  images TEXT[],
  job_id UUID,
  skills_used TEXT[],
  materials_used TEXT[],
  project_duration INTEGER,
  project_cost DECIMAL(10, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_radius INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  views_count INTEGER,
  is_active BOOLEAN,
  is_flagged BOOLEAN,
  is_public BOOLEAN,
  is_featured BOOLEAN,
  is_verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  -- Validate and sanitize inputs
  search_text := TRIM(COALESCE(search_text, ''));
  limit_count := LEAST(GREATEST(limit_count, 1), 100); -- Max 100 results
  offset_count := GREATEST(offset_count, 0);

  -- If search text is empty, return all posts (filtered)
  IF search_text = '' THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.contractor_id,
      cp.title,
      cp.content,
      cp.post_type,
      cp.images,
      cp.job_id,
      cp.skills_used,
      cp.materials_used,
      cp.project_duration,
      cp.project_cost,
      cp.latitude,
      cp.longitude,
      cp.location_radius,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.views_count,
      cp.is_active,
      cp.is_flagged,
      cp.is_public,
      cp.is_featured,
      cp.is_verified,
      cp.verified_by,
      cp.verified_at,
      cp.tags,
      cp.created_at,
      cp.updated_at,
      0::REAL as rank
    FROM public.contractor_posts cp
    WHERE cp.is_active = is_active_filter
      AND cp.is_flagged = is_flagged_filter
      AND (post_type_filter IS NULL OR cp.post_type = post_type_filter)
    ORDER BY
      CASE
        WHEN sort_by = 'popular' THEN cp.likes_count
        WHEN sort_by = 'most_commented' THEN cp.comments_count
        ELSE 0
      END DESC,
      CASE
        WHEN sort_by = 'newest' THEN cp.created_at
        ELSE NULL
      END DESC NULLS LAST
    LIMIT limit_count
    OFFSET offset_count;
    RETURN;
  END IF;

  -- Convert search text to tsquery (handle multiple words and phrases)
  -- Using plainto_tsquery for simple, safe query parsing
  query_tsquery := plainto_tsquery('english', search_text);

  -- Return query with full-text search ranking
  RETURN QUERY
  SELECT
    cp.id,
    cp.contractor_id,
    cp.title,
    cp.content,
    cp.post_type,
    cp.images,
    cp.job_id,
    cp.skills_used,
    cp.materials_used,
    cp.project_duration,
    cp.project_cost,
    cp.latitude,
    cp.longitude,
    cp.location_radius,
    cp.likes_count,
    cp.comments_count,
    cp.shares_count,
    cp.views_count,
    cp.is_active,
    cp.is_flagged,
    cp.is_public,
    cp.is_featured,
    cp.is_verified,
    cp.verified_by,
    cp.verified_at,
    cp.tags,
    cp.created_at,
    cp.updated_at,
    ts_rank(cp.search_vector, query_tsquery) as rank
  FROM public.contractor_posts cp
  WHERE cp.search_vector @@ query_tsquery
    AND cp.is_active = is_active_filter
    AND cp.is_flagged = is_flagged_filter
    AND (post_type_filter IS NULL OR cp.post_type = post_type_filter)
  ORDER BY
    CASE
      WHEN sort_by = 'relevance' THEN ts_rank(cp.search_vector, query_tsquery)
      WHEN sort_by = 'popular' THEN cp.likes_count::REAL / 100.0
      WHEN sort_by = 'most_commented' THEN cp.comments_count::REAL / 100.0
      ELSE 0
    END DESC,
    CASE
      WHEN sort_by = 'newest' THEN cp.created_at
      ELSE NULL
    END DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;

  RETURN;
END;
$$;

-- Step 6: Create alternative ILIKE-based search function for partial/fuzzy matching
-- This uses ILIKE but with proper parameterization (no string interpolation)
CREATE OR REPLACE FUNCTION public.search_contractor_posts_ilike(
  search_text TEXT,
  post_type_filter TEXT DEFAULT NULL,
  is_active_filter BOOLEAN DEFAULT TRUE,
  is_flagged_filter BOOLEAN DEFAULT FALSE,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0,
  sort_by TEXT DEFAULT 'newest'
)
RETURNS TABLE(
  id UUID,
  contractor_id UUID,
  title VARCHAR(255),
  content TEXT,
  post_type VARCHAR(50),
  images TEXT[],
  job_id UUID,
  skills_used TEXT[],
  materials_used TEXT[],
  project_duration INTEGER,
  project_cost DECIMAL(10, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_radius INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  views_count INTEGER,
  is_active BOOLEAN,
  is_flagged BOOLEAN,
  is_public BOOLEAN,
  is_featured BOOLEAN,
  is_verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_pattern TEXT;
BEGIN
  -- Validate and sanitize inputs
  search_text := TRIM(COALESCE(search_text, ''));
  limit_count := LEAST(GREATEST(limit_count, 1), 100); -- Max 100 results
  offset_count := GREATEST(offset_count, 0);

  -- If search text is empty, return all posts (filtered)
  IF search_text = '' THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.contractor_id,
      cp.title,
      cp.content,
      cp.post_type,
      cp.images,
      cp.job_id,
      cp.skills_used,
      cp.materials_used,
      cp.project_duration,
      cp.project_cost,
      cp.latitude,
      cp.longitude,
      cp.location_radius,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.views_count,
      cp.is_active,
      cp.is_flagged,
      cp.is_public,
      cp.is_featured,
      cp.is_verified,
      cp.verified_by,
      cp.verified_at,
      cp.tags,
      cp.created_at,
      cp.updated_at
    FROM public.contractor_posts cp
    WHERE cp.is_active = is_active_filter
      AND cp.is_flagged = is_flagged_filter
      AND (post_type_filter IS NULL OR cp.post_type = post_type_filter)
    ORDER BY
      CASE
        WHEN sort_by = 'popular' THEN cp.likes_count
        WHEN sort_by = 'most_commented' THEN cp.comments_count
        ELSE 0
      END DESC,
      CASE
        WHEN sort_by = 'newest' THEN cp.created_at
        ELSE NULL
      END DESC NULLS LAST
    LIMIT limit_count
    OFFSET offset_count;
    RETURN;
  END IF;

  -- Create pattern for ILIKE (safe because it's parameterized in the query)
  search_pattern := '%' || search_text || '%';

  -- Return query with ILIKE search (safe from SQL injection via parameterization)
  RETURN QUERY
  SELECT
    cp.id,
    cp.contractor_id,
    cp.title,
    cp.content,
    cp.post_type,
    cp.images,
    cp.job_id,
    cp.skills_used,
    cp.materials_used,
    cp.project_duration,
    cp.project_cost,
    cp.latitude,
    cp.longitude,
    cp.location_radius,
    cp.likes_count,
    cp.comments_count,
    cp.shares_count,
    cp.views_count,
    cp.is_active,
    cp.is_flagged,
    cp.is_public,
    cp.is_featured,
    cp.is_verified,
    cp.verified_by,
    cp.verified_at,
    cp.tags,
    cp.created_at,
    cp.updated_at
  FROM public.contractor_posts cp
  WHERE (cp.title ILIKE search_pattern OR cp.content ILIKE search_pattern)
    AND cp.is_active = is_active_filter
    AND cp.is_flagged = is_flagged_filter
    AND (post_type_filter IS NULL OR cp.post_type = post_type_filter)
  ORDER BY
    CASE
      WHEN sort_by = 'popular' THEN cp.likes_count
      WHEN sort_by = 'most_commented' THEN cp.comments_count
      ELSE 0
    END DESC,
    CASE
      WHEN sort_by = 'newest' THEN cp.created_at
      ELSE NULL
    END DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;

  RETURN;
END;
$$;

-- Step 7: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.search_contractor_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_contractor_posts_ilike TO authenticated;

-- Step 8: Add comments for documentation
COMMENT ON FUNCTION public.search_contractor_posts IS
'Secure full-text search for contractor posts using tsvector.
Safe from SQL injection. Supports ranking by relevance, popularity, comments, or date.
Use this for semantic/keyword search with better performance.';

COMMENT ON FUNCTION public.search_contractor_posts_ilike IS
'Secure ILIKE-based search for contractor posts with parameterized queries.
Safe from SQL injection. Use this for partial/fuzzy matching when full-text search is too strict.
Note: ILIKE is slower than full-text search on large datasets.';

COMMENT ON COLUMN public.contractor_posts.search_vector IS
'Generated tsvector column for full-text search. Title has weight A (higher), content has weight B.';

COMMIT;

-- ==========================================================
-- USAGE EXAMPLES
-- ==========================================================
--
-- 1. Full-text search (recommended for performance):
-- SELECT * FROM search_contractor_posts('plumbing repair');
-- SELECT * FROM search_contractor_posts('kitchen remodel', 'work_showcase', TRUE, FALSE, 20, 0, 'relevance');
--
-- 2. ILIKE search (for partial matching):
-- SELECT * FROM search_contractor_posts_ilike('plumb');
-- SELECT * FROM search_contractor_posts_ilike('kitch', 'work_showcase', TRUE, FALSE, 20, 0, 'popular');
--
-- 3. From TypeScript/JavaScript (via Supabase):
-- const { data, error } = await supabase.rpc('search_contractor_posts', {
--   search_text: userInput,
--   post_type_filter: 'work_showcase',
--   limit_count: 50,
--   offset_count: 0,
--   sort_by: 'relevance'
-- });
--
-- ==========================================================
