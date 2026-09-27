export function imageIdentity(value) {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/sign/')) {
      url.searchParams.delete('token');
      return url.href;
    }
  } catch { return null; }
  return value;
}

/** Only export the reviewed target for the same ordered source images. */
export function reviewedBootstrapTarget(review, imageUrls) {
  if (review?.human_verified !== true || !Array.isArray(review.image_urls) || !imageUrls.length) return null;
  const originals = review.image_urls.map(imageIdentity);
  const current = imageUrls.map(imageIdentity);
  if (originals.some(v => !v) || current.some(v => !v) || JSON.stringify(originals) !== JSON.stringify(current)) return null;
  const target = review.human_corrected_response ?? review.teacher_response;
  return target && typeof target === 'object' && !Array.isArray(target) && target.damageAssessment ? target : null;
}
