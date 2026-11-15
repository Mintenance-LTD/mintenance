import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { loadContractorFinancialSummary } from '@/lib/contractor/load-financial-summary';

export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) =>
    NextResponse.json(await loadContractorFinancialSummary(user.id))
);
