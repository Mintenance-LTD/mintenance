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

/** Update or create a contractor's profile via web API route. */
export async function updateContractorProfile(
  userId: string,
  profileData: Partial<ContractorProfile>
): Promise<ContractorProfile> {
  try {
    const response = await mobileApiClient.post<{
      profile: DatabaseContractorProfileRow;
    }>('/api/contractor/update-profile', {
      bio: profileData.bio,
      profile_image_url: profileData.profile_image_url,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
      company_name: profileData.companyName,
      company_logo: profileData.companyLogo,
      business_address: profileData.businessAddress,
      hourly_rate: profileData.hourly_rate || profileData.hourlyRate,
      years_experience:
        profileData.years_experience || profileData.yearsExperience,
      service_radius: profileData.serviceRadius,
      availability: profileData.availability,
      portfolio_images: profileData.portfolioImages,
      specialties: profileData.specialties,
      certifications: profileData.certifications,
      license_number: profileData.license_number || profileData.licenseNumber,
    });

    logger.info('Contractor profile updated successfully');
    return mapDatabaseToContractorProfile(response.profile);
  } catch (error) {
    logger.error('Error updating contractor profile:', error);
    throw error;
  }
}

/** Upload a contractor logo or portfolio image to Supabase Storage. */
export async function uploadContractorImage(
  userId: string,
  imageUri: string,
  type: 'logo' | 'portfolio'
): Promise<string> {
  try {
    logger.info(`Uploading ${type} image for contractor ${userId}`);
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${type}_${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
    } as unknown as Blob);
    formData.append('type', type);

    const response = await mobileApiClient.postFormData<{
      success?: boolean;
      data?: { profile_image_url?: string; cover_image_url?: string };
      url?: string;
      public_url?: string;
    }>('/api/contractor/update-profile', formData);

    // API returns { success, data: profileObject } — extract image URL from profile
    const imageUrl = response.data?.profile_image_url;
    return imageUrl ?? response.public_url ?? response.url ?? '';
  } catch (error) {
    logger.error('Error uploading contractor image:', error);
    throw error;
  }
}
