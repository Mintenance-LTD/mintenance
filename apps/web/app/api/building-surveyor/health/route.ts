import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Building Surveyor service
 * Returns configuration status without exposing sensitive data
 */
export async function GET() {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'NOT_SET';
    
    return NextResponse.json({
        status: hasApiKey ? 'configured' : 'not_configured',
        hasApiKey,
        apiKeyLength,
        apiKeyPrefix,
        message: hasApiKey 
            ? 'OpenAI API key is configured' 
            : 'OpenAI API key is missing. Add OPENAI_API_KEY to .env.local',
    });
}

