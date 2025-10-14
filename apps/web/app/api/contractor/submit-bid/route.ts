import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EmailService } from '@/lib/email-service';

// Validation schema
const submitBidSchema = z.object({
  jobId: z.string().uuid(),
  bidAmount: z.number().positive(),
  proposalText: z.string().min(50).max(5000),
  estimatedDuration: z.number().int().positive().optional(),
  proposedStartDate: z.string().optional(),
  materialsCost: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized bid submission attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to submit bid', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can submit bids' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = submitBidSchema.parse(body);

    // Check if job exists and is accepting bids (include homeowner details for email)
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        homeowner_id,
        homeowner:homeowner_id (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', validatedData.jobId)
      .single();

    if (jobError || !job) {
      logger.warn('Bid submitted for non-existent job', {
        service: 'contractor',
        jobId: validatedData.jobId,
        contractorId: user.id
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is open for bids
    if (job.status !== 'posted' && job.status !== 'open') {
      logger.warn('Bid submitted for closed job', {
        service: 'contractor',
        jobId: validatedData.jobId,
        jobStatus: job.status
      });
      return NextResponse.json({ error: 'This job is no longer accepting bids' }, { status: 400 });
    }

    // Check if contractor already has a bid on this job
    const { data: existingBid } = await serverSupabase
      .from('bids')
      .select('id')
      .eq('job_id', validatedData.jobId)
      .eq('contractor_id', user.id)
      .single();

    if (existingBid) {
      logger.warn('Duplicate bid attempt', {
        service: 'contractor',
        jobId: validatedData.jobId,
        contractorId: user.id
      });
      return NextResponse.json({ error: 'You have already submitted a bid for this job' }, { status: 409 });
    }

    // Create the bid
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .insert({
        job_id: validatedData.jobId,
        contractor_id: user.id,
        bid_amount: validatedData.bidAmount,
        proposal_text: validatedData.proposalText,
        estimated_duration: validatedData.estimatedDuration,
        proposed_start_date: validatedData.proposedStartDate,
        materials_cost: validatedData.materialsCost,
        labor_cost: validatedData.laborCost,
        status: 'pending',
      })
      .select()
      .single();

    if (bidError) {
      logger.error('Failed to create bid', bidError, {
        service: 'contractor',
        contractorId: user.id,
        jobId: validatedData.jobId
      });
      return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
    }

    // Send email notification to homeowner
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (homeowner?.email) {
      const contractorName = `${user.first_name} ${user.last_name}`.trim() || user.email;
      const homeownerName = `${homeowner.first_name} ${homeowner.last_name}`.trim() || 'Valued Client';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const proposalExcerpt = validatedData.proposalText.substring(0, 150);

      await EmailService.sendBidNotification(homeowner.email, {
        homeownerName,
        contractorName,
        jobTitle: job.title,
        bidAmount: validatedData.bidAmount,
        proposalExcerpt,
        viewUrl: `${baseUrl}/jobs/${validatedData.jobId}`,
      });
    }

    logger.info('Bid submitted successfully', {
      service: 'contractor',
      bidId: bid.id,
      contractorId: user.id,
      jobId: validatedData.jobId,
      bidAmount: validatedData.bidAmount
    });

    return NextResponse.json({
      success: true,
      bid: {
        id: bid.id,
        jobId: bid.job_id,
        bidAmount: bid.bid_amount,
        status: bid.status,
        createdAt: bid.created_at
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid bid submission data', {
        service: 'contractor',
        errors: error.errors
      });
      return NextResponse.json({
        error: 'Invalid bid data',
        details: error.errors
      }, { status: 400 });
    }

    logger.error('Unexpected error in submit-bid', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
