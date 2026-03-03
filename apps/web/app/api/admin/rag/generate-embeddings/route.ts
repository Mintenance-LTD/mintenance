import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BuildingPathologyRAGService } from '@/lib/services/building-surveyor/BuildingPathologyRAGService';
import { InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';

/**
 * POST /api/admin/rag/generate-embeddings
 *
 * Seeds pgvector embeddings for all building_pathology_knowledge entries that
 * don't have one yet. Run once after deploying migration:
 *   20260303000000_building_pathology_embeddings.sql
 *
 * Uses OpenAI text-embedding-3-small (1536 dims). Each entry's name,
 * description, why_it_happens and visual_indicators are concatenated into
 * a single embedding document.
 *
 * Rate-limited to 2 requests/min — the operation is idempotent (skips entries
 * that already have an embedding) so it is safe to re-run.
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 2 } },
  async () => {
    try {
      const result = await BuildingPathologyRAGService.seedMissingEmbeddings();
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to generate RAG embeddings', {
        service: 'rag',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new InternalServerError('Failed to generate embeddings');
    }
  }
);
