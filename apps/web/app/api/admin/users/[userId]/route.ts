import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationService } from '@/lib/services/admin/VerificationService';
import { logger } from '@mintenance/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    const { userId } = await params;

    // Fetch full user data
    const { data: userData, error: userError } = await serverSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      logger.error('Error fetching user details', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        ]) as [any, any[]];

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
  } catch (error) {
    logger.error('Unexpected error in GET /api/admin/users/[userId]', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

