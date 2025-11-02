import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { JobAnalysisService } from '@/lib/services/JobAnalysisService';

/**
 * Analyze job description and return suggestions
 * POST /api/jobs/analyze
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, location } = body;

    if (!title && !description) {
      return NextResponse.json(
        { error: 'Title or description is required' },
        { status: 400 }
      );
    }

    // Analyze the job description
    const analysis = await JobAnalysisService.analyzeJobDescription(
      title || '',
      description || '',
      location
    );

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error analyzing job:', error);
    return NextResponse.json(
      { error: 'Failed to analyze job description' },
      { status: 500 }
    );
  }
}

