# Backend Embeddings API Implementation Guide

## Overview

The `AISearchService` requires a backend API endpoint to generate OpenAI embeddings for semantic search. This keeps your API key secure server-side.

---

## Required Endpoint

### `POST /api/ai/generate-embedding`

**Purpose:** Generate text embeddings using OpenAI for semantic search

**Request:**
```json
{
  "text": "search query text",
  "model": "text-embedding-3-small"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, 0.789, ...], // 1536-dimension array
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

---

## Implementation Options

### Option 1: Next.js API Route (Recommended)

Location: `apps/web/pages/api/ai/generate-embedding.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { aiConfig } from '@/config/ai.config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, model } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    if (text.length > 8000) {
      return res.status(400).json({ error: 'Text too long (max 8000 characters)' });
    }

    // Check API key
    if (!aiConfig.openai.apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Call OpenAI Embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.trim(),
        model: model || aiConfig.openai.models.embedding,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return res.status(response.status).json({
        error: 'Failed to generate embedding',
        details: error
      });
    }

    const data = await response.json();

    // Return embedding
    return res.status(200).json({
      embedding: data.data[0].embedding,
      model: data.model,
      usage: data.usage,
    });

  } catch (error) {
    console.error('Embedding generation failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

---

### Option 2: Express.js Backend

Location: `server/routes/ai.js`

```javascript
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post('/generate-embedding', async (req, res) => {
  try {
    const { text, model } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    if (text.length > 8000) {
      return res.status(400).json({ error: 'Text too long' });
    }

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.trim(),
        model: model || 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return res.status(response.status).json({ error: 'Embedding failed' });
    }

    const data = await response.json();

    res.json({
      embedding: data.data[0].embedding,
      model: data.model,
      usage: data.usage,
    });

  } catch (error) {
    console.error('Embedding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

### Option 3: Supabase Edge Function

Location: `supabase/functions/generate-embedding/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { text, model } = await req.json();

    // Validation
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid text parameter' }),
        { status: 400 }
      );
    }

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.trim(),
        model: model || 'text-embedding-3-small',
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({
        embedding: data.data[0].embedding,
        model: data.model,
        usage: data.usage,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

Deploy:
```bash
supabase functions deploy generate-embedding
```

---

## Database Setup for Semantic Search

### 1. Enable pgvector Extension

```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Add Embedding Columns

```sql
-- Add embedding column to jobs table
ALTER TABLE jobs
ADD COLUMN embedding vector(1536);

-- Add embedding column for contractors
ALTER TABLE users
ADD COLUMN profile_embedding vector(1536);

-- Create indexes for fast similarity search
CREATE INDEX jobs_embedding_idx ON jobs
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX users_embedding_idx ON users
USING ivfflat (profile_embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. Create Search Functions

```sql
-- Semantic job search function
CREATE OR REPLACE FUNCTION search_jobs_semantic(
  query_embedding vector(1536),
  category_filter text DEFAULT NULL,
  location_filter text DEFAULT NULL,
  price_min numeric DEFAULT NULL,
  price_max numeric DEFAULT NULL,
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  location text,
  budget numeric,
  status text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.category,
    j.location,
    j.budget,
    j.status,
    1 - (j.embedding <=> query_embedding) as similarity_score
  FROM jobs j
  WHERE
    j.embedding IS NOT NULL
    AND (category_filter IS NULL OR j.category = category_filter)
    AND (location_filter IS NULL OR j.location ILIKE '%' || location_filter || '%')
    AND (price_min IS NULL OR j.budget >= price_min)
    AND (price_max IS NULL OR j.budget <= price_max)
    AND j.status = 'open'
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Semantic contractor search function
CREATE OR REPLACE FUNCTION search_contractors_semantic(
  query_embedding vector(1536),
  category_filter text DEFAULT NULL,
  location_filter text DEFAULT NULL,
  rating_filter numeric DEFAULT NULL,
  match_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  bio text,
  location text,
  rating numeric,
  availability text,
  specialties text[],
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    cp.bio,
    u.location,
    COALESCE(AVG(r.rating), 0) as rating,
    cp.availability,
    ARRAY_AGG(DISTINCT cs.skill_name) as specialties,
    1 - (u.profile_embedding <=> query_embedding) as similarity_score
  FROM users u
  LEFT JOIN contractor_profiles cp ON u.id = cp.user_id
  LEFT JOIN contractor_skills cs ON u.id = cs.contractor_id
  LEFT JOIN reviews r ON u.id = r.reviewed_id
  WHERE
    u.role = 'contractor'
    AND u.profile_embedding IS NOT NULL
    AND (category_filter IS NULL OR cs.skill_name ILIKE '%' || category_filter || '%')
    AND (location_filter IS NULL OR u.location ILIKE '%' || location_filter || '%')
    AND (rating_filter IS NULL OR COALESCE(AVG(r.rating), 0) >= rating_filter)
  GROUP BY u.id, u.first_name, u.last_name, cp.bio, u.location, cp.availability, u.profile_embedding
  ORDER BY u.profile_embedding <=> query_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Find similar jobs function
CREATE OR REPLACE FUNCTION search_similar_jobs(
  job_embedding vector(1536),
  job_id uuid,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  location text,
  budget numeric,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.category,
    j.location,
    j.budget,
    1 - (j.embedding <=> job_embedding) as similarity_score
  FROM jobs j
  WHERE
    j.embedding IS NOT NULL
    AND j.id != job_id
    AND j.status IN ('open', 'completed')
  ORDER BY j.embedding <=> job_embedding
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Generate Embeddings for Existing Data

### Background Job Script

```typescript
// scripts/generate-embeddings.ts
import { supabase } from './lib/supabase';
import { aiConfig } from './config/ai.config';

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiConfig.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text.trim(),
      model: 'text-embedding-3-small',
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateJobEmbeddings() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, description, category')
    .is('embedding', null)
    .limit(100);

  for (const job of jobs || []) {
    try {
      const text = `${job.title} ${job.description} ${job.category}`;
      const embedding = await generateEmbedding(text);

      await supabase
        .from('jobs')
        .update({ embedding })
        .eq('id', job.id);

      console.log(`✓ Generated embedding for job ${job.id}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ Failed for job ${job.id}:`, error);
    }
  }
}

generateJobEmbeddings();
```

Run:
```bash
npx ts-node scripts/generate-embeddings.ts
```

---

## Testing

### Test Endpoint

```bash
curl -X POST http://localhost:3000/api/ai/generate-embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "fix leaking toilet",
    "model": "text-embedding-3-small"
  }'
```

Expected response:
```json
{
  "embedding": [0.0023, -0.0145, 0.0092, ...], // 1536 numbers
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 3,
    "total_tokens": 3
  }
}
```

### Test Semantic Search

```typescript
import { AISearchService } from '@/services/AISearchService';

const results = await AISearchService.search('plumber near me', {
  location: 'London',
  priceRange: { min: 50, max: 200 },
}, 10);

console.log('Search results:', results);
```

---

## Cost Estimates

**OpenAI Embeddings Pricing:**
- Model: `text-embedding-3-small`
- Cost: **$0.00002 per 1,000 tokens** (~750 words)
- Average query: 5-10 tokens = **$0.0000001** (basically free)

**Monthly Estimates:**
- 10,000 searches = **$0.001** (less than 1 cent!)
- 100,000 searches = **$0.01** (1 cent!)
- 1,000,000 searches = **$0.10** (10 cents!)

Embeddings are incredibly cheap compared to GPT-4 Vision.

---

## Security Checklist

- [ ] API key only in backend environment
- [ ] Rate limiting on endpoint (20 req/min)
- [ ] Input validation (max 8000 characters)
- [ ] CORS configured properly
- [ ] Error messages don't expose API key
- [ ] Logging without sensitive data
- [ ] Authentication required (optional)

---

## Next Steps

1. **Choose implementation:** Next.js API route recommended
2. **Deploy endpoint:** Add to your backend
3. **Set up database:** Run pgvector SQL scripts
4. **Generate embeddings:** Run background job for existing data
5. **Test search:** Use AISearchService in your app
6. **Monitor costs:** Check OpenAI dashboard (should be <$1/month)

---

## Support

- OpenAI Embeddings Docs: https://platform.openai.com/docs/guides/embeddings
- pgvector Docs: https://github.com/pgvector/pgvector
- Supabase Vector Docs: https://supabase.com/docs/guides/ai/vector-columns

Embeddings are VERY cheap and enable powerful semantic search! 🚀
