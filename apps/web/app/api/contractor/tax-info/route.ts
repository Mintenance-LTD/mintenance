import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { sanitizeText } from '@/lib/sanitizer';
import {
  UTR_REGEX,
  NINO_REGEX,
  VAT_NUMBER_REGEX,
  COMPANY_NUMBER_REGEX,
  UK_POSTCODE_REGEX,
  encryptUTR,
  encryptNINO,
  encryptDateOfBirth,
  normaliseNINO,
  normaliseVatNumber,
} from '@/lib/services/tax/uk-tax';

// ── Validation ──────────────────────────────────────────────────────────
//
// UK contractor tax identity. Replaces the former US tax form capture.
// Collects the seller identity HMRC's "Reporting rules for digital
// platforms" requires (name, address, DOB, NINO or UTR, VAT number where held)
// plus the VAT-registration flag that Task 3 defaults the VAT toggle from.

const submitTaxInfoSchema = z
  .object({
    legalName: z
      .string()
      .min(2, 'Legal name must be at least 2 characters')
      .max(255)
      .transform((val) => sanitizeText(val, 255)),
    tradingName: z
      .string()
      .max(255)
      .optional()
      .transform((val) => (val ? sanitizeText(val, 255) : val)),
    // Date of birth (ISO yyyy-mm-dd). Required — unblocks DBS checks and is a
    // mandatory HMRC seller identifier. Stored encrypted on `profiles`.
    dateOfBirth: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Date of birth must be in YYYY-MM-DD format'
      )
      .refine((val) => {
        const d = new Date(`${val}T00:00:00Z`);
        if (Number.isNaN(d.getTime())) return false;
        const now = new Date();
        const age =
          (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 16 && age <= 120;
      }, 'Enter a valid date of birth (must be 16 or older)'),
    // UTR (10 digits) and/or NINO — at least one is required for HMRC seller
    // reporting. Sole traders typically have a NINO; those in Self Assessment
    // have a UTR.
    utr: z
      .string()
      .transform((v) => v.replace(/\s+/g, ''))
      .refine((v) => v === '' || UTR_REGEX.test(v), 'UTR must be 10 digits')
      .optional(),
    nino: z
      .string()
      .transform((v) => normaliseNINO(v))
      .refine(
        (v) => v === '' || NINO_REGEX.test(v),
        'Enter a valid National Insurance number'
      )
      .optional(),
    vatRegistered: z.boolean().default(false),
    vatNumber: z
      .string()
      .transform((v) => normaliseVatNumber(v))
      .refine(
        (v) => v === '' || VAT_NUMBER_REGEX.test(`GB${v}`),
        'Enter a valid UK VAT number'
      )
      .optional(),
    companyNumber: z
      .string()
      .transform((v) => v.replace(/\s+/g, '').toUpperCase())
      .refine(
        (v) => v === '' || COMPANY_NUMBER_REGEX.test(v),
        'Enter a valid Companies House number'
      )
      .optional(),
    addressLine1: z
      .string()
      .min(1, 'Address is required')
      .max(255)
      .transform((val) => sanitizeText(val, 255)),
    addressLine2: z
      .string()
      .max(255)
      .optional()
      .transform((val) => (val ? sanitizeText(val, 255) : val)),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100)
      .transform((val) => sanitizeText(val, 100)),
    county: z
      .string()
      .max(100)
      .optional()
      .transform((val) => (val ? sanitizeText(val, 100) : val)),
    postcode: z.string().regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'),
    certification: z.literal(true, {
      errorMap: () => ({
        message: 'You must certify the information is correct',
      }),
    }),
  })
  .strict()
  .refine((d) => Boolean(d.utr) || Boolean(d.nino), {
    message: 'Provide a UTR or a National Insurance number',
    path: ['utr'],
  })
  .refine((d) => !d.vatRegistered || Boolean(d.vatNumber), {
    message: 'A VAT number is required when VAT-registered',
    path: ['vatNumber'],
  });

// ── GET ─────────────────────────────────────────────────────────────────
//
// Returns the NON-sensitive tax profile. Encrypted identifiers (UTR, NINO,
// DOB) are never returned to the client — only booleans indicating whether
// each is on file, so the form can show "on file" without exposing values.

export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user }) => {
    const { data: profile, error } = await serverSupabase
      .from('contractor_tax_profiles')
      .select(
        `id, contractor_id, tax_name, business_name, vat_registered,
         vat_number, company_number, address_line1, address_line2, city,
         county, postcode, utr_encrypted, nino_encrypted, updated_at`
      )
      .eq('contractor_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch tax profile', error, {
        service: 'tax-info',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch tax profile');
    }

    const { data: dobRow } = await serverSupabase
      .from('profiles')
      .select('date_of_birth_encrypted')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new NotFoundError('No tax information found yet.');
    }

    return NextResponse.json({
      success: true,
      data: {
        legalName: profile.tax_name,
        tradingName: profile.business_name,
        vatRegistered: profile.vat_registered ?? false,
        vatNumber: profile.vat_number,
        companyNumber: profile.company_number,
        addressLine1: profile.address_line1,
        addressLine2: profile.address_line2,
        city: profile.city,
        county: profile.county,
        postcode: profile.postcode,
        hasUtr: Boolean(profile.utr_encrypted),
        hasNino: Boolean(profile.nino_encrypted),
        hasDateOfBirth: Boolean(dobRow?.date_of_birth_encrypted),
        updatedAt: profile.updated_at,
      },
    });
  }
);

// ── POST ────────────────────────────────────────────────────────────────
//
// Submit/update UK tax identity. Encrypts UTR + NINO before storing; writes
// the encrypted DOB to `profiles` (unblocking DBS checks + HMRC reporting).

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, submitTaxInfoSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { data } = validation;
    const now = new Date().toISOString();

    // Encrypted DOB → profiles (used by DBSCheckService + HMRC seller report).
    const { error: dobError } = await serverSupabase
      .from('profiles')
      .update({
        date_of_birth_encrypted: encryptDateOfBirth(data.dateOfBirth),
        updated_at: now,
      })
      .eq('id', user.id);

    if (dobError) {
      logger.error('Failed to store date of birth', dobError, {
        service: 'tax-info',
        userId: user.id,
      });
      throw new InternalServerError('Failed to save tax information');
    }

    const row = {
      contractor_id: user.id,
      tax_name: data.legalName,
      business_name: data.tradingName ?? null,
      utr_encrypted: data.utr ? encryptUTR(data.utr) : null,
      nino_encrypted: data.nino ? encryptNINO(data.nino) : null,
      vat_registered: data.vatRegistered,
      vat_number: data.vatRegistered ? data.vatNumber || null : null,
      company_number: data.companyNumber || null,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2 ?? null,
      city: data.city,
      county: data.county ?? null,
      postcode: data.postcode.toUpperCase(),
      w9_submitted_at: now,
      updated_at: now,
    };

    const { data: upserted, error: upsertError } = await serverSupabase
      .from('contractor_tax_profiles')
      .upsert(row, { onConflict: 'contractor_id' })
      .select(
        `id, contractor_id, tax_name, business_name, vat_registered,
         vat_number, company_number, address_line1, address_line2, city,
         county, postcode, updated_at`
      )
      .single();

    if (upsertError) {
      logger.error('Failed to save tax profile', upsertError, {
        service: 'tax-info',
        userId: user.id,
      });
      throw new InternalServerError('Failed to save tax information');
    }

    // NEVER log the identifiers themselves — only which were provided.
    logger.info('UK tax info submitted', {
      service: 'tax-info',
      userId: user.id,
      vatRegistered: data.vatRegistered,
      providedUtr: Boolean(data.utr),
      providedNino: Boolean(data.nino),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tax information saved successfully',
        data: upserted,
      },
      { status: 201 }
    );
  }
);
