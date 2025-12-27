import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DBSCheckService, DBSCheckLevel, DBSProvider } from '@/lib/services/verification/DBSCheckService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/errors/api-error';

const initiateCheckSchema = z.object({
  dbsType: z.enum(['basic', 'standard', 'enhanced']),
  provider: z.enum(['dbs_online', 'gbgroup', 'ucheck', 'custom']).optional().default('dbs_online'),
});

/**
 * POST /api/contractor/dbs-check
 * Initiate a DBS check for the authenticated contractor
 */
export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can initiate DBS checks');
    }

    const validation = await validateRequest(request, initiateCheckSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { dbsType, provider } = validation.data;

    const result = await DBSCheckService.initiateCheck(
      user.id,
      dbsType as DBSCheckLevel,
      provider as DBSProvider
    );

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to initiate DBS check');
    }

    return NextResponse.json({
      success: true,
      message: 'DBS check initiated successfully',
      checkId: result.checkId,
      dbsType,
      provider,
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET /api/contractor/dbs-check
 * Get DBS check status for the authenticated contractor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can access DBS check status');
    }

    const status = await DBSCheckService.getCheckStatus(user.id);

    if (!status) {
      return NextResponse.json({
        hasCheck: false,
        message: 'No DBS check found',
      });
    }

    return NextResponse.json({
      hasCheck: true,
      check: {
        id: status.id,
        dbsType: status.dbsType,
        status: status.status,
        certificateNumber: status.certificateNumber,
        checkDate: status.checkDate,
        issueDate: status.issueDate,
        expiryDate: status.expiryDate,
        boostPercentage: status.boostPercentage,
        provider: status.provider,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
