export interface AssessmentPhoto {
  id: string;
  image_url: string | null;
  image_index?: number | null;
}

/** Model indexes refer to its ordered input, not the growing attachment gallery. */
export function assessmentPhotoCoverage(
  data: unknown,
  images: AssessmentPhoto[]
) {
  const analysis =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>).analysis
      : null;
  const ids =
    analysis && typeof analysis === 'object'
      ? (analysis as Record<string, unknown>).imageIds
      : null;
  const recordedIds =
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every((id) => typeof id === 'string') &&
    new Set(ids).size === ids.length
      ? (ids as string[])
      : null;
  const frames: string[] = [];
  if (recordedIds) {
    for (const id of recordedIds)
      frames.push(images.find((image) => image.id === id)?.image_url ?? '');
  } else {
    // Historical assessments use their original frame indexes. Never close gaps.
    for (const image of images)
      if (
        typeof image.image_index === 'number' &&
        image.image_index >= 0 &&
        Number.isInteger(image.image_index)
      )
        frames[image.image_index] = image.image_url ?? '';
  }
  return { recordedIds, frames };
}
