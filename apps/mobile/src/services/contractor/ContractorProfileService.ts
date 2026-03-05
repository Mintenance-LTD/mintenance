import { supabase } from '../../config/supabase';
import { ContractorProfile } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { mapDatabaseToContractorProfile } from './ContractorHelpers';
import type { DatabaseContractorProfileRow, DatabaseError } from './types';

/** Fetch a contractor's extended profile by user ID. */
export async function getContractorProfile(userId: string): Promise<DatabaseContractorProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('contractor_profiles')
      .select('*, user:user_id (first_name, last_name, email)')
      .eq('user_id', userId)
      .single();

    if (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === 'PGRST116') return null;
    }
    if (!data) return null;
    return data as DatabaseContractorProfileRow;
  } catch (error) {
    throw error;
  }
}

/** Update or create a contractor's profile (user + contractor_profiles upsert). */
export async function updateContractorProfile(
  userId: string,
  profileData: Partial<ContractorProfile>
): Promise<ContractorProfile> {
  try {
    const userUpdateData = {
      bio: profileData.bio,
      profile_image_url: profileData.profile_image_url,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
    };

    const { error: userError } = await supabase.from('profiles').update(userUpdateData).eq('id', userId);
    if (userError) throw userError;

    const contractorProfileData = {
      user_id: userId,
      company_name: profileData.companyName,
      company_logo: profileData.companyLogo,
      hourly_rate: profileData.hourly_rate || profileData.hourlyRate,
      years_experience: profileData.years_experience || profileData.yearsExperience,
      service_radius: profileData.serviceRadius,
      availability: profileData.availability,
      portfolio_images: profileData.portfolioImages,
      specialties: profileData.specialties,
      certifications: profileData.certifications,
      license_number: profileData.license_number || profileData.licenseNumber,
    };

    const { data, error } = await supabase
      .from('contractor_profiles')
      .upsert(contractorProfileData)
      .select()
      .single();

    if (error) throw error;

    logger.info('Contractor profile updated successfully');
    return mapDatabaseToContractorProfile(data as DatabaseContractorProfileRow);
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
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `contractors/${userId}/${type}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('contractor-images')
      .upload(fileName, blob, { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`, upsert: type === 'logo' });

    if (error) throw error;
    const { data: urlData } = supabase.storage.from('contractor-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    logger.error('Error uploading contractor image:', error);
    throw error;
  }
}
