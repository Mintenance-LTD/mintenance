/**
 * GET / PATCH /api/contractor/business-profile
 *
 * Single endpoint that wraps the contractor's editable business
 * identity — profile fields (company_name, business_address,
 * license_number, license_type, license_expiry, verification_status),
 * the latest active `contractor_insurance` row, and the latest active
 * `contractor_licenses` row. Used by:
 *   - apps/mobile/.../BusinessProfileScreen.tsx
 *   - apps/mobile/.../ContractorVerificationScreen.tsx
 *   - apps/mobile/.../ContractPreparationScreen.tsx (auto-fill)
 *
 * Replaces the cluster of direct supabase reads/writes the mobile
 * screens used to do (profiles + contractor_insurance +
 * contractor_licenses + credential_verifications). Keeps the
 * "if existing, update; else insert" pattern those screens needed.
 *
 * PATCH supports `submitVerification: true` which also writes a
 * `credential_verifications` row and flips `profiles.verification_status`
 * to 'pending' — the data path the verification screen used to do
 * client-side.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

// ── Shapes returned to the client ──────────────────────────────────

interface ProfileShape {
  company_name: string | null;
  business_address: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  verification_status: string | null;
}

interface InsuranceShape {
  id: string;
  provider: string | null;
  policy_number: string | null;
  type: string | null;
  status: string | null;
  start_date: string | null;
  expiry_date: string | null;
}

interface LicenseShape {
  id: string;
  name: string | null;
  number: string | null;
  status: string | null;
  issue_date: string | null;
  expiry_date: string | null;
}

// ── PATCH body schema ──────────────────────────────────────────────

const patchSchema = z
  .object({
    companyName: z.string().trim().max(200).optional(),
    businessAddress: z.string().trim().max(500).optional(),
    licenseNumber: z.string().trim().max(50).optional(),
    licenseType: z.string().trim().max(120).optional(),
    /**
     * ISO-8601 date string (YYYY-MM-DD). The verification flow accepts
     * legacy human-formatted dates too — clients should normalise
     * before sending.
     */
    licenseExpiry: z.string().trim().max(40).optional().nullable(),

    insuranceProvider: z.string().trim().max(200).optional(),
    insurancePolicyNumber: z.string().trim().max(120).optional(),

    /**
     * When true, also writes a `credential_verifications` row and
     * sets `profiles.verification_status = 'pending'`. Used by
     * ContractorVerificationScreen.
     */
    submitVerification: z.boolean().optional(),
  })
  .strict();

// ── Helpers ────────────────────────────────────────────────────────

async function loadBundle(userId: string): Promise<{
  profile: ProfileShape | null;
  insurance: InsuranceShape | null;
  license: LicenseShape | null;
}> {
  const [profileRes, insuranceRes, licenseRes] = await Promise.all([
    serverSupabase
      .from('profiles')
      .select(
        'company_name, business_address, license_number, license_type, license_expiry, verification_status'
      )
      .eq('id', userId)
      .maybeSingle(),
    serverSupabase
      .from('contractor_insurance')
      .select(
        'id, provider, policy_number, type, status, start_date, expiry_date'
      )
      .eq('contractor_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serverSupabase
      .from('contractor_licenses')
      .select('id, name, number, status, issue_date, expiry_date')
      .eq('contractor_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: (profileRes.data ?? null) as ProfileShape | null,
    insurance: (insuranceRes.data ?? null) as InsuranceShape | null,
    license: (licenseRes.data ?? null) as LicenseShape | null,
  };
}

// ── Route handlers ─────────────────────────────────────────────────

export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const bundle = await loadBundle(user.id);
    return NextResponse.json(bundle);
  }
);

export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const profileUpdate: Record<string, unknown> = {};
    if (d.companyName !== undefined)
      profileUpdate.company_name = d.companyName.length ? d.companyName : null;
    if (d.businessAddress !== undefined)
      profileUpdate.business_address = d.businessAddress.length
        ? d.businessAddress
        : null;
    if (d.licenseNumber !== undefined)
      profileUpdate.license_number = d.licenseNumber.length
        ? d.licenseNumber
        : null;
    if (d.licenseType !== undefined)
      profileUpdate.license_type = d.licenseType.length ? d.licenseType : null;
    if (d.licenseExpiry !== undefined)
      profileUpdate.license_expiry = d.licenseExpiry || null;
    if (d.submitVerification) {
      profileUpdate.verification_status = 'pending';
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await serverSupabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);
      if (profileError) {
        logger.error('business-profile profile update failed', profileError, {
          service: 'contractor.business-profile',
          userId: user.id,
        });
        throw new InternalServerError('Failed to update profile');
      }
    }

    // 2026-05-23 audit-18 P2: when the caller explicitly sends an empty
    // insurance provider AND there's an active row, mark that row
    // inactive. Hard-delete would lose the legal retention trail, but
    // leaving status='active' meant the next GET reloaded the stale
    // credentials and the user couldn't actually clear them from the UI.
    if (d.insuranceProvider !== undefined && d.insuranceProvider.length === 0) {
      const { data: existing } = await serverSupabase
        .from('contractor_insurance')
        .select('id, status')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        const { error: deactivateError } = await serverSupabase
          .from('contractor_insurance')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (deactivateError) {
          logger.error(
            'business-profile insurance deactivate failed',
            deactivateError,
            { service: 'contractor.business-profile', userId: user.id }
          );
          throw new InternalServerError('Failed to clear insurance');
        }
      }
    }

    // Insurance upsert — only when caller actually sent a non-empty value.
    if (d.insuranceProvider !== undefined && d.insuranceProvider.length > 0) {
      const { data: existing } = await serverSupabase
        .from('contractor_insurance')
        .select('id')
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const todayIso = new Date().toISOString().split('T')[0];
      const oneYearFromTodayIso = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0];

      // policy_number is NOT NULL on the DB — passing null would
      // violate the constraint and 500 the request. Fall back to '' so
      // the insurance row persists when the user hasn't supplied a
      // policy number yet (the form treats it as optional).
      const insBase = {
        contractor_id: user.id,
        provider: d.insuranceProvider,
        policy_number: d.insurancePolicyNumber || '',
        type: 'general_liability',
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { error: insError } = existing?.id
        ? await serverSupabase
            .from('contractor_insurance')
            .update(insBase)
            .eq('id', existing.id)
        : await serverSupabase.from('contractor_insurance').insert({
            ...insBase,
            start_date: todayIso,
            expiry_date: oneYearFromTodayIso,
          });

      if (insError) {
        logger.error('business-profile insurance upsert failed', insError, {
          service: 'contractor.business-profile',
          userId: user.id,
        });
        throw new InternalServerError('Failed to update insurance');
      }
    }

    // 2026-05-23 audit-18 P2: license clear path — mirrors insurance
    // above. profiles.license_number / license_type already null-clear
    // via the profileUpdate block above; we also deactivate the active
    // contractor_licenses row so GET's "latest active license" lookup
    // doesn't keep returning stale credentials.
    if (d.licenseType !== undefined && d.licenseType.length === 0) {
      const { data: existing } = await serverSupabase
        .from('contractor_licenses')
        .select('id, status')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        const { error: deactivateError } = await serverSupabase
          .from('contractor_licenses')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (deactivateError) {
          logger.error(
            'business-profile license deactivate failed',
            deactivateError,
            { service: 'contractor.business-profile', userId: user.id }
          );
          throw new InternalServerError('Failed to clear license');
        }
      }
    }

    // License upsert — same pattern.
    if (d.licenseType !== undefined && d.licenseType.length > 0) {
      const { data: existing } = await serverSupabase
        .from('contractor_licenses')
        .select('id')
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const licBase = {
        contractor_id: user.id,
        name: d.licenseType,
        number: d.licenseNumber || '',
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { error: licError } = existing?.id
        ? await serverSupabase
            .from('contractor_licenses')
            .update(licBase)
            .eq('id', existing.id)
        : // INSERT path must provide every NOT NULL column. The schema
          // requires `issuer`, `number`, and `issue_date` with no DB
          // defaults — without these the insert fails with "null value
          // in column ... violates not-null constraint" and the user
          // sees a generic save-failed alert. The legacy
          // BusinessProfileScreen save path had the same bug; both now
          // get sensible defaults so first-time license rows persist.
          await serverSupabase.from('contractor_licenses').insert({
            ...licBase,
            issue_date: new Date().toISOString().split('T')[0],
            issuer: 'Self-declared',
          });

      if (licError) {
        logger.error('business-profile license upsert failed', licError, {
          service: 'contractor.business-profile',
          userId: user.id,
        });
        throw new InternalServerError('Failed to update license');
      }
    }

    // Verification submission — fresh credential_verifications row.
    // 2026-05-24 audit-25 P1: mobile sends trade / electrical /
    // plumbing / hvac / roofing as licenseType, but the DB CHECK
    // (credential_verifications_register_check) only allows
    // gas_safe / niceic / trustmark / other. The raw value silently
    // failed insert for every non-gas submission and the dashboard
    // never received the row. Map to the allowed set; the human label
    // is already persisted on profiles.license_type above.
    if (d.submitVerification && d.licenseType) {
      const expiresAt = d.licenseExpiry
        ? new Date(d.licenseExpiry).toISOString()
        : null;
      const normalised = d.licenseType.toLowerCase();
      const register: 'gas_safe' | 'niceic' | 'trustmark' | 'other' =
        normalised === 'gas_safe'
          ? 'gas_safe'
          : normalised === 'electrical'
            ? 'niceic'
            : normalised === 'trustmark'
              ? 'trustmark'
              : 'other';
      const { error: credError } = await serverSupabase
        .from('credential_verifications')
        .insert({
          user_id: user.id,
          register,
          registration_number: d.licenseNumber || '',
          status: 'pending',
          expires_at: expiresAt,
        });
      if (credError) {
        logger.error(
          'business-profile credential_verifications insert failed',
          credError,
          {
            service: 'contractor.business-profile',
            userId: user.id,
            licenseType: d.licenseType,
            mappedRegister: register,
          }
        );
      }
    }

    const bundle = await loadBundle(user.id);
    return NextResponse.json(bundle);
  }
);
