import { NextResponse } from 'next/server';
import { DBSCheckService, DBSCheckLevel, DBSProvider } from '@/lib/services/verification/DBSCheckService';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const initiateCheckSchema = z.object({
  dbsType: z.enum(['basic', 'standard', 'enhanced']),
  provider: z.enum(['dbs_online', 'gbgroup', 'ucheck', 'custom']).optional().default('dbs_online'),
});

/**
 * POST /api/contractor/dbs-check - initiate a DBS check.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const validation = await validateRequest(request, initiateCheckSchema);
    if ('headers' in validation) return validation;

    const { dbsType, provider } = validation.data;

    const result = await DBSCheckService.initiateCheck(
      user.id,
      dbsType as DBSCheckLevel,
      provider as DBSProvider,
    );

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to initiate DBS check');
    }

    return NextResponse.json(
      { success: true, message: 'DBS check initiated successfully', checkId: result.checkId, dbsType, provider },
      { status: 201 },
    );
  },
);

/**
 * GET /api/contractor/dbs-check - get DBS check status.
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user }) => {
    const status = await DBSCheckService.getCheckStatus(user.id);

    if (!status) {
      return NextResponse.json({ hasCheck: false, message: 'No DBS check found' });
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
  },
);
