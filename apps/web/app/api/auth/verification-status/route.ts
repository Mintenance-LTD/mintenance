import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerVerificationService } from '@/lib/services/verification/HomeownerVerificationService';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to check verification status');
    }

    const status = await HomeownerVerificationService.getVerificationStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    return handleAPIError(error);
  }
}

