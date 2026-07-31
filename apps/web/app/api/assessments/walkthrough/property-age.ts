/**
 * Supply the surveyor with the property's age, from the server.
 *
 * A walkthrough arrives with `context = { room }` and nothing else, so every
 * survey was produced by a model that did not know how old the building was.
 * The consequence was not subtle: a kitchen with `year_built = 2026` was
 * reported as having established mould growth and structural movement, because
 * nothing in the prompt made a new build implausible for those.
 *
 * Read from `properties.year_built` rather than trusting the request for the
 * same reason the room id is verified against the property — an input that
 * changes the diagnosis is not something a client should be able to assert.
 * Whatever age or type the caller sent is discarded.
 *
 * Lives outside route.ts because App Router route files may only export
 * handlers; any other named export fails `next build` while tsc stays green.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { AssessmentContext } from '@/lib/services/building-surveyor/types';

const SERVICE = 'assessment-walkthrough';

/** The two columns this module reads. Named so the cast cannot narrow to never. */
interface PropertyAgeRow {
  year_built: number | null;
  property_type: string | null;
}

/**
 * Property types the surveyor context understands, keyed by what the column
 * actually stores. `properties.property_type` is free text, so an unrecognised
 * value yields undefined rather than being coerced into a wrong category.
 */
const PROPERTY_TYPES: Record<string, AssessmentContext['propertyType']> = {
  residential: 'residential',
  commercial: 'commercial',
  industrial: 'industrial',
};

/**
 * Age in whole years from a build year.
 *
 * Returns undefined when the year cannot be believed, so the caller omits the
 * field entirely instead of asserting an age it made up. Note 0 is a valid
 * answer — a property built this year — and callers must treat it as a number,
 * not a falsy blank.
 *
 * @param yearBuilt the stored build year, which may be null or nonsense
 * @param now injected so the arithmetic is testable without freezing the clock
 */
export function ageFromYearBuilt(
  yearBuilt: number | null | undefined,
  now: Date
): number | undefined {
  if (typeof yearBuilt !== 'number' || !Number.isFinite(yearBuilt)) {
    return undefined;
  }

  // Guards against the two ways this column goes wrong: a sentinel 0 and a
  // 2-digit or otherwise truncated year. Nothing standing was built in year 800.
  if (yearBuilt < 1000) return undefined;

  const currentYear = now.getFullYear();

  // A build year in the future means under construction or off-plan. That is a
  // new build, not a negative age — and definitely not "unknown", since being
  // unfinished is the strongest possible prior against decades-old pathology.
  if (yearBuilt >= currentYear) return 0;

  return currentYear - Math.floor(yearBuilt);
}

/** Map the free-text column onto the surveyor's enum, or nothing. */
export function normalisePropertyType(
  raw: string | null | undefined
): AssessmentContext['propertyType'] | undefined {
  if (!raw) return undefined;
  return PROPERTY_TYPES[raw.trim().toLowerCase()];
}

/**
 * Merge the property's real age and type into the assessment context.
 *
 * Never throws: age is an enrichment, and a survey without it is worse but
 * still worth having. A lookup failure is logged and the walk proceeds.
 */
export async function withPropertyAge(
  context: AssessmentContext | undefined,
  propertyId: string | undefined,
  now: Date = new Date()
): Promise<AssessmentContext | undefined> {
  // Strip anything the client asserted about age or type before doing anything
  // else, so a failed lookup cannot leave a spoofed value in place.
  const base: AssessmentContext | undefined = context
    ? {
        ...context,
        ageOfProperty: undefined,
        propertyAge: undefined,
        propertyType: undefined,
      }
    : undefined;

  if (!propertyId) return base;

  // supabase-js reports query failures as `{ error }` rather than throwing, but
  // the call itself can still throw — a network fault, or an aborted request.
  // The try/catch is what makes the "never throws" contract above true: a
  // survey without the age is worse, not worthless, and losing a whole
  // walkthrough of somebody's filming to a failed enrichment lookup would be
  // the wrong trade.
  let data: PropertyAgeRow | null = null;
  try {
    const result = await serverSupabase
      .from('properties')
      .select('year_built, property_type')
      .eq('id', propertyId)
      .maybeSingle();

    if (result.error) {
      logger.warn('Could not read property age for walkthrough', {
        service: SERVICE,
        propertyId,
        error: result.error.message,
      });
      return base;
    }
    data = result.data as PropertyAgeRow | null;
  } catch (err) {
    logger.warn('Property age lookup threw for walkthrough', {
      service: SERVICE,
      propertyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return base;
  }

  if (!data) {
    logger.warn('No property row found for walkthrough age lookup', {
      service: SERVICE,
      propertyId,
    });
    return base;
  }

  const ageOfProperty = ageFromYearBuilt(data.year_built as number | null, now);
  const propertyType = normalisePropertyType(
    data.property_type as string | null
  );

  const enriched: AssessmentContext = { ...(base ?? {}) };
  if (ageOfProperty !== undefined) {
    enriched.ageOfProperty = ageOfProperty;
    enriched.propertyAge = ageOfProperty;
  }
  if (propertyType !== undefined) {
    enriched.propertyType = propertyType;
  }

  logger.info('Walkthrough context enriched with property age', {
    service: SERVICE,
    propertyId,
    ageOfProperty: ageOfProperty ?? null,
    propertyType: propertyType ?? null,
  });

  return enriched;
}
