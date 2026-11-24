import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { readContractorPaymentRecord } from '@/lib/contractor/payment-record';
import { NotFoundError } from '@/lib/errors/api-error';
import { isValidUUID } from '@/lib/validation/uuid';

export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const id = params.id;
    if (user.role !== 'contractor' || !isValidUUID(id)) {
      throw new NotFoundError('Payment not found');
    }
    const payment = await readContractorPaymentRecord(id, user.id);
    if (!payment) throw new NotFoundError('Payment not found');
    return NextResponse.json(payment, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
);
