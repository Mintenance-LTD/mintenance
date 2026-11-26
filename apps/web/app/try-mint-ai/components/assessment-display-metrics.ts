/** Treat absent or invalid model values as unavailable, never as estimates. */
export function demoConfidence(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

export function demoRepairCost(min: unknown, max: unknown) {
  if (
    typeof min !== 'number' ||
    typeof max !== 'number' ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 0 ||
    max < min ||
    max === 0
  ) {
    return null;
  }
  return { min, max };
}
