import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/training-data/export
 * 
 * Export validated assessments in training format (JSONL or JSON)
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get format from query params
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'jsonl') as 'jsonl' | 'json';
    const limit = parseInt(searchParams.get('limit') || '10000', 10);

    // Export training data
    const trainingData = await DataCollectionService.exportTrainingData(format, limit);

    // Return as downloadable file
    const contentType = format === 'jsonl' ? 'application/x-ndjson' : 'application/json';
    const filename = `training-data-${new Date().toISOString().split('T')[0]}.${format === 'jsonl' ? 'jsonl' : 'json'}`;

    return new NextResponse(trainingData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    logger.error('Error exporting training data', error, {
      service: 'training-data-export-api',
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to export training data';

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

