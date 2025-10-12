import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Test endpoint to verify Jobs API enrichment with JOIN queries
 * This tests the JOIN syntax without requiring authentication
 */
export async function GET() {
  try {
    const supabase = serverSupabase;

    // Test the enriched query with JOINs
    const jobSelectFields = `
      id,
      title,
      description,
      status,
      homeowner_id,
      contractor_id,
      category,
      budget,
      location,
      created_at,
      updated_at,
      homeowner:users!homeowner_id(id,first_name,last_name,email),
      contractor:users!contractor_id(id,first_name,last_name,email),
      bids(count)
    `.replace(/\s+/g, ' ').trim();

    const { data: jobs, error, count } = await supabase
      .from('jobs')
      .select(jobSelectFields, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        query: jobSelectFields
      }, { status: 500 });
    }

    // Check if enrichment worked
    const firstJob = jobs?.[0] as any;
    const enrichmentStatus = {
      totalJobs: count,
      jobsReturned: jobs?.length ?? 0,
      sampleJob: firstJob,
      enrichmentChecks: {
        hasHomeownerData: !!(firstJob?.homeowner),
        hasContractorData: firstJob?.contractor_id ? !!(firstJob?.contractor) : 'N/A (no contractor assigned)',
        hasBidCount: firstJob?.bids !== undefined,
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Jobs API enrichment test successful',
      ...enrichmentStatus
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}
