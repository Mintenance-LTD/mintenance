import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RATE_LIMIT_TIERS } from '@/lib/api/rate-limit-tiers';
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
 * Rate-limited via the shared STRICT tier (5/min) — the operation is
 * idempotent (skips entries that already have an embedding) so it is
 * safe to re-run within that envelope.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    // Audit P2 (2026-05-10): adopt the canonical STRICT tier
    // (5/min). Was 2/min ad-hoc — same risk class (OpenAI credit
    // spend) as other STRICT mutations.
    rateLimit: RATE_LIMIT_TIERS.STRICT,
    // 2026-05-01 audit follow-up: re-embedding the pathology corpus burns
    // OpenAI credits per document. Same threat model as the synthetic-data
    // generator — a stolen cookie could trigger a multi-thousand-row
    // embedding pass. Require fresh MFA proof.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'rag_generate_embeddings',
      category: 'settings',
      targetType: 'rag_corpus',
      description: 'Generated RAG pathology embeddings',
    },
  },
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
