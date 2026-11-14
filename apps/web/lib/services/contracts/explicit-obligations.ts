import { z } from 'zod';

/** Job-specific promises must be written and reviewed, never inferred from defaults. */
export const explicitObligationsSchema = z.object({
  materials_terms: z.string().trim().min(1).max(2000),
  warranty_terms: z.string().trim().min(1).max(2000),
});

export function hasExplicitObligations(terms: unknown): boolean {
  return explicitObligationsSchema.safeParse(terms).success;
}

export function prepareExplicitObligations(terms: Record<string, unknown>) {
  const result = explicitObligationsSchema.parse(terms);
  // Historical bid defaults are not a job-specific agreement. Remove them
  // only while preparing an unsigned contract, preserving other reviewed terms.
  const {
    materials_included: _materials,
    warranty_months: _warranty,
    ...rest
  } = terms;
  return { ...rest, ...result };
}
