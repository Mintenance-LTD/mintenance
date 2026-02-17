import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { logger } from '@mintenance/shared';
import { NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 }, csrf: false },
  async (request: NextRequest, { params }) => {
    const { userId } = params;

    // Fetch user data with explicit columns
    const { data: userData, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, phone, profile_image_url, company_name, license_number, business_address, latitude, longitude, insurance_provider, insurance_policy_number, insurance_expiry_date, years_experience, admin_verified, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      logger.error('Error fetching user details', { userId, error: userError?.message });
      throw new NotFoundError('User not found');
    }

    // If contractor, fetch verification details and run automated checks
    let verificationData = null;
    if (userData.role === 'contractor') {
      try {
        // Add timeout protection for verification checks
        const verificationPromise = Promise.all([
          VerificationService.automatedVerificationCheck(userId).catch(err => {
            logger.error('Error in automated verification check', { userId, error: err });
            // Return default verification data if check fails
            return {
              passed: false,
              checks: [],
              requiresManualReview: true,
              verificationScore: 0,
            };
          }),
          VerificationService.getVerificationHistory(userId).catch(err => {
            logger.error('Error fetching verification history', { userId, error: err });
            return [];
          }),
        ]);

        // Set a 10 second timeout for verification checks
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Verification check timeout')), 10000)
        );

        const [automatedCheck, verificationHistory] = await Promise.race([
          verificationPromise,
          timeoutPromise,
        ]) as [{ passed: boolean; checks: unknown[]; requiresManualReview: boolean; verificationScore: number }, { id: string; action: string; reason: string | null; created_at: string }[]];

        verificationData = {
          ...automatedCheck,
          history: verificationHistory || [],
          companyName: userData.company_name,
          licenseNumber: userData.license_number,
          businessAddress: userData.business_address,
          latitude: userData.latitude,
          longitude: userData.longitude,
          insuranceProvider: userData.insurance_provider,
          insurancePolicyNumber: userData.insurance_policy_number,
          insuranceExpiryDate: userData.insurance_expiry_date,
          yearsExperience: userData.years_experience,
          adminVerified: userData.admin_verified,
        };
      } catch (verificationError) {
        logger.error('Error fetching verification data', { userId, error: verificationError });
        // Return basic verification data even if checks fail
        verificationData = {
          passed: false,
          checks: [],
          requiresManualReview: true,
          verificationScore: 0,
          history: [],
          companyName: userData.company_name,
          licenseNumber: userData.license_number,
          businessAddress: userData.business_address,
          latitude: userData.latitude,
          longitude: userData.longitude,
          insuranceProvider: userData.insurance_provider,
          insurancePolicyNumber: userData.insurance_policy_number,
          insuranceExpiryDate: userData.insurance_expiry_date,
          yearsExperience: userData.years_experience,
          adminVerified: userData.admin_verified,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        phone: userData.phone,
        profile_image_url: userData.profile_image_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        ...(userData.role === 'contractor' && {
          company_name: userData.company_name,
          admin_verified: userData.admin_verified,
        }),
      },
      verification: verificationData,
    });
  }
);
