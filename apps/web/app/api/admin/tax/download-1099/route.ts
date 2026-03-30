import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { Form1099Service } from '@/lib/services/tax/Form1099Service';
import { logger } from '@mintenance/shared';

// ── GET Handler ─────────────────────────────────────────────────────

/**
 * GET /api/admin/tax/download-1099?contractorId=...&year=...
 *
 * Fetch the generated 1099-NEC data for a specific contractor and tax year.
 * Returns the form data as a JSON response for download.
 *
 * Requires admin role.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 30, windowMs: 60_000 } },
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');
    const yearParam = searchParams.get('year');

    if (!contractorId || !yearParam) {
      return NextResponse.json(
        { error: 'Missing required query parameters: contractorId and year' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    logger.info('Downloading 1099 data', {
      service: 'admin-tax',
      adminUserId: user.id,
      contractorId,
      year,
    });

    try {
      const formData = await Form1099Service.generate1099Data(
        contractorId,
        year
      );

      return new NextResponse(JSON.stringify(formData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="1099-NEC-${contractorId}-${year}.json"`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to download 1099 data', err, {
        service: 'admin-tax',
        adminUserId: user.id,
        contractorId,
        year,
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
