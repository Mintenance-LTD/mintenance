import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as crypto from 'crypto';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { sanitizeText } from '@/lib/sanitizer';

// ── Constants ───────────────────────────────────────────────────────

const TAX_CLASSIFICATIONS = [
  'individual',
  'sole_proprietor',
  'single_member_llc',
  'c_corporation',
  's_corporation',
  'partnership',
  'trust_estate',
  'llc_c',
  'llc_s',
  'llc_p',
  'other',
] as const;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','PR','VI','GU','AS','MP',
] as const;

// ── TIN Encryption ──────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TIN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TIN_ENCRYPTION_KEY environment variable is required');
  }
  // Key must be 32 bytes for aes-256. Accept hex-encoded or base64.
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  const decoded = Buffer.from(key, 'base64');
  if (decoded.length === 32) {
    return decoded;
  }
  throw new Error('TIN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
}

function encryptTIN(tin: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(tin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex-encoded)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

// ── Validation Schemas ──────────────────────────────────────────────

const submitTaxInfoSchema = z.object({
  tax_name: z
    .string()
    .min(2, 'Tax name must be at least 2 characters')
    .max(255)
    .transform(val => sanitizeText(val, 255)),
  business_name: z
    .string()
    .max(255)
    .optional()
    .transform(val => (val ? sanitizeText(val, 255) : val)),
  tax_classification: z.enum(TAX_CLASSIFICATIONS, {
    errorMap: () => ({ message: 'Invalid tax classification' }),
  }),
  tin_type: z.enum(['ssn', 'ein'], {
    errorMap: () => ({ message: 'TIN type must be "ssn" or "ein"' }),
  }),
  tin: z
    .string()
    .regex(/^\d{9}$/, 'TIN must be exactly 9 digits'),
  address_line1: z
    .string()
    .min(1, 'Address is required')
    .max(255)
    .transform(val => sanitizeText(val, 255)),
  address_line2: z
    .string()
    .max(255)
    .optional()
    .transform(val => (val ? sanitizeText(val, 255) : val)),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100)
    .transform(val => sanitizeText(val, 100)),
  state: z
    .string()
    .length(2, 'State must be a 2-letter code')
    .toUpperCase()
    .refine(val => (US_STATES as readonly string[]).includes(val), {
      message: 'Invalid US state code',
    }),
  zip_code: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be 5 digits or 5+4 format (e.g. 12345 or 12345-6789)'),
  certification: z.literal(true, {
    errorMap: () => ({ message: 'You must certify the information is correct' }),
  }),
});

// ── GET Handler ─────────────────────────────────────────────────────

/**
 * GET /api/contractor/tax-info
 * Fetch the authenticated contractor's tax profile.
 * Returns the profile with tin_last_four (never the encrypted TIN).
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const { data: profile, error } = await userDb
      .from('contractor_tax_profiles')
      .select(
        `
        id,
        contractor_id,
        tax_name,
        business_name,
        tax_classification,
        tin_type,
        tin_last_four,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        w9_submitted_at,
        w9_document_url,
        created_at,
        updated_at
        `
      )
      .eq('contractor_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows found" — that's a 404, not an error
      logger.error('Failed to fetch tax profile', error, {
        service: 'tax-info',
        userId: user.id,
      });
      throw new InternalServerError('Failed to fetch tax profile');
    }

    if (!profile) {
      throw new NotFoundError('No tax profile found. Please submit your W-9 information.');
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  },
);

// ── POST Handler ────────────────────────────────────────────────────

/**
 * POST /api/contractor/tax-info
 * Submit or update W-9 tax information for the authenticated contractor.
 * Encrypts the TIN before storing and keeps only the last 4 digits in cleartext.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, submitTaxInfoSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { data } = validation;

    // Encrypt the TIN and extract last 4 digits
    const tinEncrypted = encryptTIN(data.tin);
    const tinLastFour = data.tin.slice(-4);

    // Build the upsert row
    const now = new Date().toISOString();
    const row = {
      contractor_id: user.id,
      tax_name: data.tax_name,
      business_name: data.business_name ?? null,
      tax_classification: data.tax_classification,
      tin_type: data.tin_type,
      tin_encrypted: tinEncrypted,
      tin_last_four: tinLastFour,
      address_line1: data.address_line1,
      address_line2: data.address_line2 ?? null,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      w9_submitted_at: now,
      updated_at: now,
    };

    // Upsert: insert if no row exists, update if one does (keyed on contractor_id)
    const { data: upserted, error: upsertError } = await serverSupabase
      .from('contractor_tax_profiles')
      .upsert(row, { onConflict: 'contractor_id' })
      .select(
        `
        id,
        contractor_id,
        tax_name,
        business_name,
        tax_classification,
        tin_type,
        tin_last_four,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        w9_submitted_at,
        created_at,
        updated_at
        `
      )
      .single();

    if (upsertError) {
      logger.error('Failed to save tax profile', upsertError, {
        service: 'tax-info',
        userId: user.id,
      });
      throw new InternalServerError('Failed to save tax information');
    }

    logger.info('W-9 tax info submitted', {
      service: 'tax-info',
      userId: user.id,
      tinType: data.tin_type,
      classification: data.tax_classification,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'W-9 tax information saved successfully',
        data: upserted,
      },
      { status: 201 },
    );
  },
);
