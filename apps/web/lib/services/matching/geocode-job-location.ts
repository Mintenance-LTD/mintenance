/** Resolve legacy job coordinates without trusting the incoming request origin. */
export async function geocodeJobLocation(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim() || address.length > 500) return null;
  const query = new URLSearchParams({
    address: address.trim(),
    region: 'uk',
    components: 'country:GB',
    key: apiKey,
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${query}`,
    {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const location =
    data.status === 'OK' ? data.results?.[0]?.geometry?.location : null;
  if (
    !location ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number' ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    Math.abs(location.lat) > 90 ||
    Math.abs(location.lng) > 180
  )
    return null;
  return { latitude: location.lat, longitude: location.lng };
}
