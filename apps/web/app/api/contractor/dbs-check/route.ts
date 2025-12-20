import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DBSCheckService, DBSCheckLevel, DBSProvider } from '@/lib/services/verification/DBSCheckService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can initiate DBS checks' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: result.error || 'Failed to initiate DBS check' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'DBS check initiated successfully',
      checkId: result.checkId,
      dbsType,
      provider,
    }, { status: 201 });
  } catch (error) {
    logger.error('DBS check initiation error', error, { service: 'contractor-api' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can access DBS check status' },
        { status: 403 }
      );
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
    logger.error('Error fetching DBS check status', error, { service: 'contractor-api' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
