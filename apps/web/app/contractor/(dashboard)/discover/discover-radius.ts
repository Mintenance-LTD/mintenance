import { milesToKm } from '@mintenance/shared';

export const DISCOVER_RADII_MILES = [3, 5, 10, 20, 30] as const;
export const DISCOVER_MAX_RADIUS_KM = milesToKm(
  Math.max(...DISCOVER_RADII_MILES)
);
