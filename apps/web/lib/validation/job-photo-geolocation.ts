export interface JobPhotoGeolocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Parse client-supplied photo geolocation without trusting TypeScript casts.
 * Browser metadata is untrusted input: JSON may contain strings, nulls,
 * infinities (after coercion), or coordinates outside the valid ranges.
 */
export function parseJobPhotoGeolocation(
  value: unknown
): JobPhotoGeolocation | undefined {
  if (typeof value !== 'object' || value === null) return undefined;

  const candidate = value as Record<string, unknown>;
  const { lat, lng, accuracy } = candidate;

  if (
    typeof lat !== 'number' ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== 'number' ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return undefined;
  }

  if (
    accuracy !== undefined &&
    (typeof accuracy !== 'number' ||
      !Number.isFinite(accuracy) ||
      accuracy < 0)
  ) {
    return undefined;
  }

  return {
    lat,
    lng,
    ...(accuracy === undefined ? {} : { accuracy }),
  };
}
