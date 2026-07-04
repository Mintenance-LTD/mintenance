import { ContractorProfile } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { mapDatabaseToContractorProfile } from './ContractorHelpers';
import type { DatabaseContractorProfileRow, DatabaseError } from './types';

/**
 * Shape of the `contractor` block returned by the canonical
 * `/api/contractor/profile-data` route. Every field — including
 * `hourly_rate` — is sourced from `profiles` (the legacy Stripe-only
 * side table is retired, 2026-07-04).
 */
interface ProfileDataContractor {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  profile_image_url?: string | null;
  phone?: string | null;
  company_name?: string | null;
  license_number?: string | null;
  insurance_expiry_date?: string | null;
  is_available?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  postcode?: string | null;
  portfolio_images?: string[] | null;
  hourly_rate?: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch a contractor's extended profile.
 *
 * Audit re-review (2026-04-29): migrated off the direct-Supabase
 * read of the legacy Stripe-only side table (retired 2026-07-04).
 * Its actual column set was `id, stripe_*, subscription_*,
 * hourly_rate, created_at, updated_at` — every other field
 * `DatabaseContractorProfileRow` claimed lived on `profiles` (or
 * didn't exist anywhere), so the previous read returned
 * `business_address: undefined`, `portfolio_images: undefined`,
 * etc., for every user. `hourly_rate` is now on `profiles` too.
 *
 * Now: routes through `GET /api/contractor/profile-data` which
 * sources every field from the table that actually owns it.
 * Mapping below explicitly translates `profiles.address`
 * → `business_address` (closest match — the contractor's home and
 * trade address are the same column), and returns `[]` for
 * `specialties` / `certifications` (still unmodelled in the DB).
 * `DatabaseContractorProfileRow` was rewritten with field-by-field
 * provenance comments so callers know what's authoritative.
 *
 * The route is `roles: ['contractor']`-gated so calling this from
 * a homeowner session 403s. If we need a homeowner-readable
 * version (e.g. for a future contractor-public page), build a
 * separate public route — don't relax the role on this one.
 */
export async function getContractorProfile(
  // The route auto-scopes via `auth.uid()` so the supplied id is
  // informational. Kept in the signature for caller compat.
  _userId: string
): Promise<DatabaseContractorProfileRow | null> {
  try {
    const data = await mobileApiClient.get<{
      contractor?: ProfileDataContractor | null;
    }>('/api/contractor/profile-data');
    const contractor = data?.contractor;
    if (!contractor || !contractor.id) return null;

    const created_at = contractor.created_at ?? new Date().toISOString();
    const updated_at = contractor.updated_at ?? created_at;

    return {
      id: contractor.id,
      user_id: contractor.id,
      company_name: contractor.company_name ?? undefined,
      bio: contractor.bio ?? undefined,
      // Map `profiles.address` → `business_address`. The "business
      // address" naming was always a misnomer; there's only ever
      // been one address on the row.
      business_address: contractor.address ?? undefined,
      hourly_rate: contractor.hourly_rate ?? undefined,
      portfolio_images: contractor.portfolio_images ?? [],
      // These three columns don't exist in the live schema. Returning
      // empty / undefined keeps `ContractorCardEditorScreen`'s
      // `... || []` fallbacks happy without claiming the data is
      // available.
      specialties: [],
      certifications: [],
      license_number: contractor.license_number ?? undefined,
      insurance_expiry: contractor.insurance_expiry_date ?? undefined,
      latitude: contractor.latitude ?? undefined,
      longitude: contractor.longitude ?? undefined,
      created_at,
      updated_at,
      user: {
        email: contractor.email ?? undefined,
        first_name: contractor.first_name ?? undefined,
        last_name: contractor.last_name ?? undefined,
      },
    };
  } catch (error) {
    logger.error('Error fetching contractor profile:', error);
    return null;
  }
}

/** Update or create a contractor's profile via web API route.
 *
 * The route at /api/contractor/update-profile reads `request.formData()`
 * with required keys `firstName`, `lastName`, `isAvailable`, plus the
 * camelCase optionals `companyName`, `licenseNumber`, etc. The previous
 * implementation here posted JSON with snake_case keys — every save
 * silently 400'd ("First name is required") because the route never
 * saw the fields. Aligning the wire format here so mobile contractor
 * profile updates actually persist. */
export async function updateContractorProfile(
  userId: string,
  profileData: Partial<ContractorProfile> & {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    country?: string;
    postcode?: string;
    isAvailable?: boolean;
  }
): Promise<ContractorProfile> {
  try {
    const formData = new FormData();
    // Required scalars — the route's Zod schema rejects missing
    // firstName / lastName / isAvailable.
    formData.append('firstName', String(profileData.firstName ?? ''));
    formData.append('lastName', String(profileData.lastName ?? ''));
    formData.append(
      'isAvailable',
      profileData.isAvailable === false ? 'false' : 'true'
    );
    const setIfPresent = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const str = String(value);
      if (str.length === 0) return;
      formData.append(key, str);
    };
    setIfPresent('bio', profileData.bio);
    setIfPresent('city', profileData.city);
    setIfPresent('country', profileData.country);
    setIfPresent('phone', profileData.phone);
    setIfPresent('postcode', profileData.postcode);
    setIfPresent(
      'companyName',
      profileData.companyName ??
        (profileData as { company_name?: string }).company_name
    );
    setIfPresent(
      'licenseNumber',
      profileData.licenseNumber ?? profileData.license_number
    );

    const response = await mobileApiClient.postFormData<{
      success?: boolean;
      profile?: DatabaseContractorProfileRow;
      data?: DatabaseContractorProfileRow;
    }>('/api/contractor/update-profile', formData);

    const profileRow = response.profile ?? response.data;
    if (!profileRow) throw new Error('No profile returned from API');
    logger.info('Contractor profile updated successfully');
    return mapDatabaseToContractorProfile(profileRow);
  } catch (error) {
    logger.error('Error updating contractor profile:', error);
    throw error;
  }
}

/** Upload a contractor avatar to Supabase Storage via the web API.
 *
 * The route reads `formData.get('profileImage')` AND requires
 * `firstName`/`lastName`/`isAvailable` since it's the same endpoint
 * that handles profile updates. The previous implementation posted
 * keys named `file` and `type` and skipped the required scalars —
 * the route returned a 400 (or simply read an empty File) and the
 * picked image was never persisted.
 *
 * `type === 'logo'` writes `profile_image_url`. The endpoint does not
 * currently support a separate cover/portfolio image upload, so
 * `'portfolio'` is left as a no-op TODO with a clear error rather
 * than silently mapping to the avatar slot. */
export async function uploadContractorImage(
  userId: string,
  imageUri: string,
  type: 'logo' | 'portfolio',
  identity: { firstName: string; lastName: string; isAvailable?: boolean }
): Promise<string> {
  if (type !== 'logo') {
    throw new Error(
      'Portfolio image upload is not yet supported by /api/contractor/update-profile — wire a dedicated route before re-enabling.'
    );
  }
  try {
    logger.info(`Uploading ${type} image for contractor ${userId}`);
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    const fileName = `${type}_${Date.now()}.${ext}`;

    const formData = new FormData();
    // The route reads this exact key.
    formData.append('profileImage', {
      uri: imageUri,
      name: fileName,
      type: mime,
    } as unknown as Blob);
    // Required scalars — schema rejects missing firstName/lastName.
    formData.append('firstName', identity.firstName);
    formData.append('lastName', identity.lastName);
    formData.append(
      'isAvailable',
      identity.isAvailable === false ? 'false' : 'true'
    );

    const response = await mobileApiClient.postFormData<{
      success?: boolean;
      profile?: { profile_image_url?: string };
      data?: { profile_image_url?: string };
      url?: string;
      public_url?: string;
    }>('/api/contractor/update-profile', formData);

    return (
      response.profile?.profile_image_url ??
      response.data?.profile_image_url ??
      response.public_url ??
      response.url ??
      ''
    );
  } catch (error) {
    logger.error('Error uploading contractor image:', error);
    throw error;
  }
}
