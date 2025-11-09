import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { BackgroundCheckService } from '@/lib/services/verification/BackgroundCheckService';
import { requireCSRF } from '@/lib/csrf';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const initiateCheckSchema = z.object({
  provider: z.enum(['checkr', 'goodhire', 'sterling', 'custom']).optional().default('checkr'),
});

export async function POST(request: NextRequest) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can initiate background checks' }, { status: 403 });
    }

    const validation = await validateRequest(request, initiateCheckSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { provider } = validation.data;

    const result = await BackgroundCheckService.initiateCheck(user.id, provider);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Background check initiated successfully',
      checkId: result.checkId,
    });
  } catch (error) {
    logger.error('Background check initiation error', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await BackgroundCheckService.getCheckStatus(user.id);

    if (!status) {
      return NextResponse.json({ error: 'Background check status not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error fetching background check status', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

