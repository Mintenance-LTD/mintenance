/**
 * Jobs API Route - Refactored Version
 * Thin route that delegates to controller/service layers
 *
 * BEFORE: 854 lines of mixed concerns
 * AFTER: ~20 lines, single responsibility
 */
import { NextRequest } from 'next/server';
import { jobController } from '@mintenance/api-services/jobs';
/**
 * GET /api/jobs - List jobs
 */
export async function GET(request: NextRequest) {
  return jobController.listJobs(request);
}
/**
 * POST /api/jobs - Create job
 */
export async function POST(request: NextRequest) {
  return jobController.createJob(request);
}