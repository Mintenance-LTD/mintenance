import { createHash } from 'node:crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getAssessmentResult } from '../assessment-result';
import {
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)])
    );
  return value;
}
export function fingerprintSource(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

export async function loadReviewSource(id: string) {
  const { data: row, error } = await serverSupabase
    .from('building_assessments')
    .select('id, assessment_data, property_id, domain, validation_status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new InternalServerError('Unable to read the assessment');
  if (!row) throw new NotFoundError('Assessment not found');
  const result = getAssessmentResult(row.assessment_data);
  if (!result || row.validation_status === 'processing')
    throw new BadRequestError('A completed AI result is required for review');
  const { data: images, error: imageError } = await serverSupabase
    .from('assessment_images')
    .select('id, image_url, image_index, storage_path')
    .eq('assessment_id', id)
    .order('image_index', { ascending: true })
    .order('id', { ascending: true });
  if (imageError) throw new InternalServerError('Unable to read source photos');
  // Only prediction fields belong in the immutable source, not user notes or signed URLs.
  const snapshot = Object.fromEntries(
    [
      'damageAssessment',
      'safetyHazards',
      'compliance',
      'insuranceRisk',
      'urgency',
      'findings',
      'modelMetadata',
      'analysis',
    ]
      .filter((k) => result[k] !== undefined)
      .map((k) => [k, result[k]])
  );
  const evidence = (images ?? []).map((image) => {
    let path = image.storage_path;
    if (!path && image.image_url) {
      try {
        const url = new URL(image.image_url);
        path = `${url.origin}${url.pathname}`;
      } catch {
        path = image.image_url;
      }
    }
    return { id: image.id, index: image.image_index, path };
  });
  return {
    row,
    snapshot,
    images: images ?? [],
    fingerprint: fingerprintSource({
      snapshot,
      evidence,
      propertyId: row.property_id,
      domain: row.domain,
    }),
  };
}
