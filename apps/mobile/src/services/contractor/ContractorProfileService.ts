import { ContractorProfile } from '@mintenance/types';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { mapDatabaseToContractorProfile } from './ContractorHelpers';
import type { DatabaseContractorProfileRow, DatabaseError } from './types';

/** Fetch a contractor's extended profile by user ID via direct Supabase query. */
export async function getContractorProfile(
  userId: string
): Promise<DatabaseContractorProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('contractor_profiles')
      .select(
        '*, user:profiles!contractor_profiles_user_id_fkey(id, first_name, last_name, email, phone, profile_image_url)'
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows found, treat as not found
      if (error.code === 'PGRST116') return null;
      logger.error('Error fetching contractor profile:', error.message);
      throw new Error(error.message);
    }

    if (!data || !(data as DatabaseContractorProfileRow).user_id) return null;
    return data as DatabaseContractorProfileRow;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === 'PGRST116') return null;
    throw error;
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
