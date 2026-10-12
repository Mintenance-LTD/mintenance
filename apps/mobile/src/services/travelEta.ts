/** Approximate travel time; being on site takes precedence over measured speed. */
export function estimateTravelMinutes(
  distanceKm: number,
  speedMps: number | null
): number {
  if (distanceKm <= 0.1) return 0;
  const speedKmh =
    speedMps !== null && Number.isFinite(speedMps) && speedMps > 1
      ? speedMps * 3.6
      : 30;
  return Math.max(1, Math.ceil((distanceKm / speedKmh) * 60 * 1.2));
}
