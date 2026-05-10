/**
 * UK location-pricing multiplier tables.
 *
 * Extracted from LocationPricingService.ts on 2026-05-09 to keep the
 * service file under the 300-line cap. The data is referenced by both
 * the service (postcode/city/region resolution) and the region-matcher
 * helpers in `region-matcher.ts`.
 *
 * Methodology + data sources:
 * - ONS Regional Price Indices (2024)
 * - FMB Tradesperson Rate Survey (2024)
 * - Checkatrade + MyBuilder regional pricing data
 * - Combined weighted average: 70% labor, 20% materials, 10% overhead
 */

export interface RegionMultiplier {
  overall: number;
  labor: number;
  materials: number;
  confidence: number;
}

export const REGION_MULTIPLIERS: Record<string, RegionMultiplier> = {
  'Greater London': {
    overall: 1.3,
    labor: 1.35,
    materials: 1.15,
    confidence: 0.95,
  },
  London: {
    overall: 1.3,
    labor: 1.35,
    materials: 1.15,
    confidence: 0.95,
  },
  'South East': {
    overall: 1.15,
    labor: 1.18,
    materials: 1.08,
    confidence: 0.9,
  },
  'East of England': {
    overall: 1.1,
    labor: 1.12,
    materials: 1.05,
    confidence: 0.85,
  },
  'South West': {
    overall: 1.05,
    labor: 1.06,
    materials: 1.02,
    confidence: 0.85,
  },
  'West Midlands': {
    overall: 1.0,
    labor: 1.0,
    materials: 1.0,
    confidence: 0.9,
  },
  'East Midlands': {
    overall: 0.95,
    labor: 0.94,
    materials: 0.98,
    confidence: 0.85,
  },
  'Yorkshire and The Humber': {
    overall: 0.95,
    labor: 0.93,
    materials: 0.98,
    confidence: 0.85,
  },
  'North West': {
    overall: 1.0,
    labor: 0.98,
    materials: 1.0,
    confidence: 0.9,
  },
  'North East': {
    overall: 0.9,
    labor: 0.88,
    materials: 0.95,
    confidence: 0.85,
  },
  Wales: {
    overall: 0.95,
    labor: 0.93,
    materials: 0.97,
    confidence: 0.8,
  },
  Scotland: {
    overall: 1.0,
    labor: 0.98,
    materials: 1.0,
    confidence: 0.85,
  },
  'Northern Ireland': {
    overall: 0.9,
    labor: 0.88,
    materials: 0.95,
    confidence: 0.75,
  },
};

/**
 * City-level overrides for areas that deviate significantly from the
 * regional average (e.g. central London boroughs, Cambridge, Brighton).
 */
export const CITY_MULTIPLIERS: Record<string, RegionMultiplier> = {
  London: { overall: 1.3, labor: 1.35, materials: 1.15, confidence: 0.95 },
  Westminster: { overall: 1.35, labor: 1.4, materials: 1.2, confidence: 0.95 },
  Camden: { overall: 1.32, labor: 1.37, materials: 1.18, confidence: 0.95 },
  'Kensington and Chelsea': {
    overall: 1.35,
    labor: 1.4,
    materials: 1.2,
    confidence: 0.95,
  },
  Brighton: { overall: 1.2, labor: 1.22, materials: 1.1, confidence: 0.9 },
  Oxford: { overall: 1.18, labor: 1.2, materials: 1.08, confidence: 0.9 },
  Cambridge: { overall: 1.18, labor: 1.2, materials: 1.08, confidence: 0.9 },
  Bristol: { overall: 1.12, labor: 1.14, materials: 1.06, confidence: 0.9 },
  Bath: { overall: 1.15, labor: 1.17, materials: 1.08, confidence: 0.88 },
  Reading: { overall: 1.15, labor: 1.17, materials: 1.08, confidence: 0.88 },
  Manchester: { overall: 1.05, labor: 1.06, materials: 1.02, confidence: 0.92 },
  Birmingham: { overall: 1.02, labor: 1.03, materials: 1.01, confidence: 0.92 },
  Leeds: { overall: 0.98, labor: 0.97, materials: 0.99, confidence: 0.9 },
  Edinburgh: { overall: 1.08, labor: 1.1, materials: 1.04, confidence: 0.9 },
  Glasgow: { overall: 0.98, labor: 0.97, materials: 0.99, confidence: 0.88 },
  Liverpool: { overall: 0.95, labor: 0.94, materials: 0.97, confidence: 0.88 },
  Newcastle: { overall: 0.92, labor: 0.9, materials: 0.96, confidence: 0.85 },
  Cardiff: { overall: 1.0, labor: 0.99, materials: 1.0, confidence: 0.88 },
  Belfast: { overall: 0.92, labor: 0.9, materials: 0.96, confidence: 0.8 },
};

/**
 * Postcode-area multipliers (first 1-3 chars of a UK postcode).
 *
 * Used as a quick fallback when the postcodes.io API is unavailable.
 * Falls back to first 1-2 alpha chars when the full area code isn't
 * matched (so "SW19" matches "SW" if "SW19" itself isn't keyed).
 */
export const POSTCODE_AREA_MULTIPLIERS: Record<string, number> = {
  // London postcodes (very high)
  W1: 1.35,
  SW1: 1.35,
  WC1: 1.35,
  WC2: 1.35,
  EC1: 1.32,
  EC2: 1.32,
  SW3: 1.35,
  SW7: 1.35,
  W8: 1.35,
  W11: 1.32,
  N1: 1.28,
  E1: 1.25,

  // London (high)
  SE1: 1.3,
  E2: 1.28,
  E8: 1.28,
  N7: 1.28,
  NW1: 1.3,
  NW3: 1.32,
  NW6: 1.3,
  SW4: 1.28,
  SW11: 1.28,
  SW6: 1.3,
  SW10: 1.32,

  // London (moderate)
  E3: 1.22,
  E9: 1.22,
  SE5: 1.22,
  SE15: 1.2,
  SW2: 1.22,
  SW9: 1.2,
  N4: 1.22,
  N16: 1.22,
  E5: 1.2,
  E7: 1.18,
  SE8: 1.2,
  SE14: 1.18,

  // South East (high)
  GU: 1.18,
  RG: 1.16,
  SL: 1.18,
  OX: 1.18,
  BN: 1.18,
  TN: 1.12,

  // East (moderate)
  CB: 1.18,
  NR: 1.08,
  IP: 1.06,
  CO: 1.08,

  // South West
  BS: 1.12,
  BA: 1.14,
  EX: 1.04,
  PL: 1.0,
  TR: 0.98,

  // Midlands
  B: 1.02,
  CV: 1.0,
  LE: 0.96,
  NG: 0.96,
  DE: 0.95,

  // Yorkshire
  LS: 0.98,
  S: 0.94,
  BD: 0.94,
  HX: 0.92,
  HU: 0.9,

  // North West
  M: 1.05,
  L: 0.95,
  WA: 0.98,
  CH: 0.96,
  PR: 0.94,

  // North East
  NE: 0.9,
  SR: 0.88,
  DH: 0.88,
  TS: 0.88,

  // Wales
  CF: 1.0,
  SA: 0.92,
  LL: 0.9,
  NP: 0.94,

  // Scotland
  EH: 1.08,
  G: 0.98,
  AB: 1.0,
  DD: 0.96,
  PA: 0.94,

  // Northern Ireland
  BT: 0.9,
};
