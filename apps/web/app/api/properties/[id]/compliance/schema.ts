/**
 * Validation schema for the property compliance-certificate routes.
 *
 * NOTE: this lives here, NOT in `route.ts`. Next.js App Router route files
 * may only export route handlers (`GET`/`POST`/…) and recognised segment
 * config — any other named export fails the route-type validation that runs
 * during `next build` (even though `tsc --noEmit` stays green, because that
 * check only exists in Next's generated `.next/types`).
 */

import { z } from 'zod';

/**
 * Mirrors the live `compliance_certificates.cert_type` CHECK constraint
 * (9 values, verified against pg_constraint 2026-07-26). Adding a value here
 * without widening the CHECK first turns a 400 into a 500 on insert.
 */
export const CERT_TYPES = [
  'gas_safety',
  'eicr',
  'epc',
  'smoke_alarm',
  'co_detector',
  'legionella',
  'fire_safety',
  'asbestos',
  'pat_testing',
] as const;

/**
 * Date-only ISO (YYYY-MM-DD), deliberately narrow. The route derives the
 * cert's valid/expiring/expired status from day-math on `expiry_date`; an
 * unparseable value yields NaN, which fails every comparison and silently
 * stored an already-expired certificate as `valid`.
 */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  // Round-trip rather than a bare Date.parse: V8 silently rolls overflow days
  // over ('2026-02-31' becomes 3 March), so parseability alone would let an
  // impossible date through onto a legal record.
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v
    );
  }, 'Not a real calendar date');

/** Certificates render as clickable links, so non-http(s) schemes are out. */
const documentUrl = z
  .string()
  .trim()
  .max(2048, 'Document URL is too long')
  .url('Document URL must be a valid URL')
  .refine(
    (v) => /^https?:\/\//i.test(v),
    'Document URL must use http or https'
  );

export const upsertComplianceCertSchema = z
  .object({
    cert_type: z.enum(CERT_TYPES),
    certificate_number: z
      .string()
      .trim()
      .max(100, 'Certificate number must be 100 characters or fewer')
      .optional()
      .nullable(),
    issued_date: isoDate.optional().nullable(),
    expiry_date: isoDate.optional().nullable(),
    issuer_name: z
      .string()
      .trim()
      .max(200, 'Issuer name must be 200 characters or fewer')
      .optional()
      .nullable(),
    issuer_registration: z
      .string()
      .trim()
      .max(100, 'Issuer registration must be 100 characters or fewer')
      .optional()
      .nullable(),
    document_url: documentUrl.optional().nullable(),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes must be 1000 characters or fewer')
      .optional()
      .nullable(),
    property_room_id: z.string().uuid().optional().nullable(),
  })
  .strict()
  .refine(
    (v) =>
      !v.issued_date ||
      !v.expiry_date ||
      Date.parse(v.expiry_date) >= Date.parse(v.issued_date),
    {
      message: 'Expiry date cannot be before the issue date',
      path: ['expiry_date'],
    }
  );
