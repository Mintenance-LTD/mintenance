// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { CERT_TYPES, upsertComplianceCertSchema } from '../schema';

/**
 * Regression: POST /api/properties/[id]/compliance used to destructure the
 * raw request body with no schema at all — only `cert_type` was truthiness-
 * checked. The route derives cert status from day-math on `expiry_date`, so
 * an unparseable value produced NaN, failed both the `<= 0` and `<= 90`
 * comparisons, and stored a legally-relevant certificate as `status: 'valid'`
 * with an expiry nobody could read.
 */
describe('upsertComplianceCertSchema — expiry date integrity', () => {
  it("rejects a garbage expiry_date that previously stored as 'valid'", () => {
    const result = upsertComplianceCertSchema.safeParse({
      cert_type: 'gas_safety',
      expiry_date: 'garbage',
    });
    expect(result.success).toBe(false);
  });

  it('rejects ambiguous dd/mm/yyyy input', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'gas_safety',
        expiry_date: '05/07/2026',
      }).success
    ).toBe(false);
  });

  it('rejects a date that looks ISO but is not a real calendar day', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'gas_safety',
        expiry_date: '2026-02-31',
      }).success
    ).toBe(false);
  });

  it('accepts a YYYY-MM-DD expiry', () => {
    const result = upsertComplianceCertSchema.safeParse({
      cert_type: 'gas_safety',
      expiry_date: '2027-03-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an expiry that precedes the issue date', () => {
    const result = upsertComplianceCertSchema.safeParse({
      cert_type: 'eicr',
      issued_date: '2026-05-01',
      expiry_date: '2026-04-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts issued == expiry (same-day, degenerate but not contradictory)', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'eicr',
        issued_date: '2026-05-01',
        expiry_date: '2026-05-01',
      }).success
    ).toBe(true);
  });
});

/**
 * cert_type must stay a strict subset of the live
 * compliance_certificates.cert_type CHECK (9 values, verified against
 * pg_constraint 2026-07-26). A value the DB rejects would turn a 400 into
 * an opaque 500 on insert.
 */
describe('upsertComplianceCertSchema — cert_type matches the live CHECK', () => {
  it('accepts all 9 live cert types', () => {
    CERT_TYPES.forEach((certType) => {
      expect(
        upsertComplianceCertSchema.safeParse({ cert_type: certType }).success
      ).toBe(true);
    });
  });

  it('rejects an unknown cert type', () => {
    expect(
      upsertComplianceCertSchema.safeParse({ cert_type: 'boiler_service' })
        .success
    ).toBe(false);
  });

  it('requires cert_type', () => {
    expect(upsertComplianceCertSchema.safeParse({}).success).toBe(false);
  });
});

/**
 * Certificates render as clickable links on the compliance dashboard and the
 * mobile cert list, so document_url must never carry a script-bearing scheme.
 */
describe('upsertComplianceCertSchema — document_url scheme', () => {
  it('rejects a javascript: URL', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'epc',
        // eslint-disable-next-line no-script-url
        document_url: 'javascript:alert(1)',
      }).success
    ).toBe(false);
  });

  it('accepts an https URL', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'epc',
        document_url: 'https://example.com/cert.pdf',
      }).success
    ).toBe(true);
  });
});

describe('upsertComplianceCertSchema — strict object', () => {
  it('rejects unknown keys rather than silently dropping them', () => {
    const result = upsertComplianceCertSchema.safeParse({
      cert_type: 'epc',
      owner_id: 'attacker-supplied',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID property_room_id', () => {
    expect(
      upsertComplianceCertSchema.safeParse({
        cert_type: 'epc',
        property_room_id: 'kitchen',
      }).success
    ).toBe(false);
  });

  it('accepts a full, well-formed certificate payload', () => {
    const result = upsertComplianceCertSchema.safeParse({
      cert_type: 'gas_safety',
      certificate_number: 'CP12-99213',
      issued_date: '2026-01-15',
      expiry_date: '2027-01-14',
      issuer_name: 'Acme Gas Ltd',
      issuer_registration: '123456',
      document_url: 'https://example.com/cp12.pdf',
      notes: 'Boiler and hob checked.',
      property_room_id: '3f7d9f4e-2c1b-4f5a-9c3e-8b7a6d5e4f30',
    });
    expect(result.success).toBe(true);
  });
});
