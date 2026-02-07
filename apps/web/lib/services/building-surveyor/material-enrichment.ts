/**
 * Material Database Enrichment for Building Surveyor
 *
 * Enriches AI-detected materials with database pricing for accurate cost estimates.
 * Pattern: Mirrors JobAnalysisService.extractMaterials() proven implementation.
 *
 * Integration: Called from assessment-structurer.ts after material normalization.
 */

import type { Material } from './types';
import { logger } from '@mintenance/shared';

/**
 * Enrich AI-detected materials with database pricing
 *
 * @param aiMaterials - Materials detected by AI with estimated costs
 * @returns Enriched materials with database pricing where available
 *
 * Features:
 * - Fuzzy matching with 0.6 similarity threshold
 * - Parallel lookups for performance
 * - Graceful fallback to AI detection on errors
 * - Source tracking for transparency
 */
export async function enrichMaterialsWithDatabase(
  aiMaterials: Material[]
): Promise<Material[]> {
  // Guard clause: Check for null/undefined BEFORE any logging
  if (!aiMaterials) {
    logger.error('enrichMaterialsWithDatabase called with null/undefined', {
      receivedType: typeof aiMaterials,
      receivedValue: aiMaterials
    });
    logger.warn('enrichMaterialsWithDatabase called with null/undefined', {
      service: 'building-surveyor'
    });
    return [];
  }

  // Guard clause: Verify it's an array
  if (!Array.isArray(aiMaterials)) {
    logger.error('enrichMaterialsWithDatabase called with non-array', {
      receivedType: typeof aiMaterials,
      receivedValue: aiMaterials
    });
    logger.error('enrichMaterialsWithDatabase called with non-array', {
      service: 'building-surveyor',
      receivedType: typeof aiMaterials
    });
    return [];
  }

  // Log entry point
  logger.debug('FUNCTION ENTRY - enrichMaterialsWithDatabase', {
    materialsCount: aiMaterials.length,
    firstMaterial: aiMaterials[0]
  });

  logger.info('Starting material enrichment', {
    service: 'building-surveyor',
    materialCount: aiMaterials.length,
  });

  if (aiMaterials.length === 0) {
    logger.warn('No materials to enrich (empty array)', { service: 'building-surveyor' });
    return [];
  }

  try {
    // Dynamic import to avoid circular dependencies
    logger.debug('About to import MaterialsService');
    const { MaterialsService } = await import('../MaterialsService');
    logger.debug('MaterialsService imported successfully', { MaterialsService: typeof MaterialsService });
    const materialsService = new MaterialsService();
    logger.debug('MaterialsService instantiated');

    // Parallel lookups for performance (proven pattern from JobAnalysisService)
    const enrichedMaterials = await Promise.all(
      aiMaterials.map(async (aiMaterial) => {
        try {
          // Fuzzy match with 0.6 threshold (proven effective in JobAnalysisService)
          const matches = await materialsService.findSimilarMaterials(
            aiMaterial.name,
            { limit: 1 }
          );

          if (matches.length > 0 && matches[0].similarity > 0.6) {
            const dbMaterial = matches[0];

            // Parse quantity from GPT response (e.g., "5 meters", "2 boxes", "1")
            const quantityMatch = aiMaterial.quantity.match(/^(\d+(?:\.\d+)?)/);
            const numericQuantity = quantityMatch ? parseFloat(quantityMatch[1]) : undefined;

            // Calculate cost if quantity is numeric
            const cost = numericQuantity
              ? materialsService.calculateCost(dbMaterial, numericQuantity)
              : undefined;

            logger.info('Material enriched from database', {
              service: 'building-surveyor',
              aiName: aiMaterial.name,
              dbName: dbMaterial.name,
              similarity: matches[0].similarity,
              quantity: numericQuantity,
              totalCost: cost?.total_cost,
            });

            return {
              ...aiMaterial,
              material_id: dbMaterial.id,
              name: dbMaterial.name, // Use database name for consistency
              unit: dbMaterial.unit,
              unit_price: dbMaterial.unit_price,
              total_cost: cost?.total_cost,
              source: 'database' as const,
              sku: dbMaterial.sku || undefined,
              supplier_name: dbMaterial.supplier_name || undefined,
            };
          }

          // No database match, return AI detection with source tag
          logger.debug('No database match for material', {
            service: 'building-surveyor',
            materialName: aiMaterial.name,
            bestSimilarity: matches[0]?.similarity || 0,
          });

          return { ...aiMaterial, source: 'ai' as const };
        } catch (err) {
          logger.error('Error enriching material', err, {
            service: 'building-surveyor',
            materialName: aiMaterial.name,
          });

          // Graceful fallback: Return AI detection
          return { ...aiMaterial, source: 'ai' as const };
        }
      })
    );

    const dbMatchCount = enrichedMaterials.filter(m => m.source === 'database').length;
    const aiOnlyCount = enrichedMaterials.filter(m => m.source === 'ai').length;

    logger.info('Material enrichment complete', {
      service: 'building-surveyor',
      totalMaterials: enrichedMaterials.length,
      databaseMatches: dbMatchCount,
      aiOnly: aiOnlyCount,
      matchRate: ((dbMatchCount / enrichedMaterials.length) * 100).toFixed(1) + '%',
    });

    return enrichedMaterials;
  } catch (err) {
    logger.error('Material enrichment failed, using AI-only detection', err, {
      service: 'building-surveyor',
      materialCount: aiMaterials.length,
    });

    // Graceful degradation: Return AI materials with source tags
    return aiMaterials.map(m => ({ ...m, source: 'ai' as const }));
  }
}
