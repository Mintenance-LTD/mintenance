import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EmailService } from '@/lib/email-service';
import { checkApiRateLimit } from '@/lib/rate-limiter';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';

// Validation schema
const submitBidSchema = z.object({
  jobId: z.string().uuid(),
  bidAmount: z.number().positive(),
  proposalText: z.string().min(50).max(5000),
  estimatedDuration: z.number().int().positive().optional(),
  proposedStartDate: z.string().optional(),
  materialsCost: z.number().nonnegative().optional(),
  laborCost: z.number().nonnegative().optional(),
  // Quote fields
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().nonnegative(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })).optional(),
  subtotal: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive().optional(),
  terms: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkApiRateLimit(`submit-bid:${ip}`);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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

    // Check subscription requirement
    const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(request, 'submit_bid');
    if (subscriptionCheck) {
      return subscriptionCheck;
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Invalid JSON in bid submission request', {
        service: 'contractor',
        error: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Invalid request format. Please ensure the request body is valid JSON.' },
        { status: 400 }
      );
    }

    let validatedData;
    try {
      validatedData = submitBidSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn('Invalid bid submission data', {
          service: 'contractor',
          errors: validationError.issues
        });
        return NextResponse.json({
          error: 'Invalid bid data',
          details: validationError.issues
        }, { status: 400 });
      }
      throw validationError;
    }

    // Check if job exists and is accepting bids (include homeowner details for email)
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        budget,
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

    // Validate bid amount doesn't exceed job budget
    // Convert to cents to avoid floating point precision errors
    if (job.budget) {
      const bidAmountCents = Math.round(validatedData.bidAmount * 100);
      const budgetCents = Math.round(job.budget * 100);

      if (bidAmountCents > budgetCents) {
        logger.warn('Bid amount exceeds job budget', {
          service: 'contractor',
          jobId: validatedData.jobId,
          bidAmount: validatedData.bidAmount,
          jobBudget: job.budget,
          contractorId: user.id
        });
        return NextResponse.json({
          error: `Bid amount ($${validatedData.bidAmount.toFixed(2)}) cannot exceed job budget ($${job.budget.toFixed(2)})`
        }, { status: 400 });
      }
    }

    // Check if contractor already has a bid on this job
    const { data: existingBid } = await serverSupabase
      .from('bids')
      .select('id, quote_id')
      .eq('job_id', validatedData.jobId)
      .eq('contractor_id', user.id)
      .single();

    // Get pricing recommendation (async, don't block)
    const pricingRecommendation = await PricingAgent.generateRecommendation(
      validatedData.jobId,
      user.id,
      validatedData.bidAmount
    ).catch((error) => {
      logger.error('Error generating pricing recommendation', error, {
        service: 'contractor',
        jobId: validatedData.jobId,
      });
      return null;
    });

    // Calculate competitiveness score if recommendation exists
    let competitivenessScore: number | undefined;
    let pricingRecommendationId: string | undefined;
    let suggestedPriceRange: Record<string, number> | undefined;

    if (pricingRecommendation) {
      competitivenessScore = pricingRecommendation.competitivenessScore;
      pricingRecommendationId = (pricingRecommendation as any).id || undefined;
      suggestedPriceRange = {
        min: pricingRecommendation.recommendedMinPrice,
        max: pricingRecommendation.recommendedMaxPrice,
        optimal: pricingRecommendation.recommendedOptimalPrice,
      };
    }

    // Prepare the bid payload (align with existing DB schema: amount, description, status)
    const bidPayload = {
      job_id: validatedData.jobId,
      contractor_id: user.id,
      amount: validatedData.bidAmount,
      description: (validatedData.proposalText || '').trim(),
      status: 'pending' as const,
      competitiveness_score: competitivenessScore,
      pricing_recommendation_id: pricingRecommendationId,
      suggested_price_range: suggestedPriceRange,
      was_price_recommended: pricingRecommendation ? Math.abs(validatedData.bidAmount - pricingRecommendation.recommendedOptimalPrice) < 0.01 : false,
      updated_at: new Date().toISOString(),
    };

    let bid;
    let isUpdate = false;

    if (existingBid) {
      // Update existing bid
      const { data: updatedBid, error: updateError } = await serverSupabase
        .from('bids')
        .update(bidPayload)
        .eq('id', existingBid.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update bid', {
          service: 'contractor',
          contractorId: user.id,
          jobId: validatedData.jobId,
          bidId: existingBid.id,
          error: updateError.message,
          errorCode: updateError.code,
        });
        return NextResponse.json({ 
          error: 'Unable to update your bid. Please try again.' 
        }, { status: 500 });
      }

      bid = updatedBid;
      isUpdate = true;
    } else {
      // Create new bid
      const insertPayload = {
        ...bidPayload,
        created_at: new Date().toISOString(),
      };

      const { data: newBid, error: insertError } = await serverSupabase
        .from('bids')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        // Handle duplicate bid constraint violation (race condition) - try to update instead
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique constraint')) {
          // Try to fetch and update instead
          const { data: raceConditionBid } = await serverSupabase
            .from('bids')
            .select('id')
            .eq('job_id', validatedData.jobId)
            .eq('contractor_id', user.id)
            .single();

          if (raceConditionBid) {
            const { data: updatedBid, error: updateError } = await serverSupabase
              .from('bids')
              .update(bidPayload)
              .eq('id', raceConditionBid.id)
              .select()
              .single();

            if (updateError) {
              logger.error('Failed to update bid after race condition', {
                service: 'contractor',
                contractorId: user.id,
                jobId: validatedData.jobId,
                error: updateError.message,
              });
              return NextResponse.json({ 
                error: 'Unable to update your bid. Please try again.' 
              }, { status: 500 });
            }

            bid = updatedBid;
            isUpdate = true;
          } else {
            logger.warn('Duplicate bid constraint but bid not found', {
              service: 'contractor',
              contractorId: user.id,
              jobId: validatedData.jobId,
            });
            return NextResponse.json({ error: 'You have already submitted a bid for this job' }, { status: 409 });
          }
        } else {
          // Handle other insert errors
          const bidError = insertError;

      // Log the full error details for debugging
      // Properly serialize error details
      const errorInfo = {
        service: 'contractor',
        contractorId: user.id,
        jobId: validatedData.jobId,
        errorCode: bidError.code || 'NO_CODE',
        errorMessage: bidError.message || 'NO_MESSAGE',
        errorDetails: typeof bidError.details === 'string' ? bidError.details : JSON.stringify(bidError.details || {}),
        errorHint: bidError.hint || 'NO_HINT',
        // Capture all enumerable properties
        allProperties: Object.keys(bidError).reduce((acc: any, key) => {
          acc[key] = (bidError as any)[key];
          return acc;
        }, {}),
        // Also try to stringify the entire error
        stringified: JSON.stringify(bidError, Object.getOwnPropertyNames(bidError))
      };
      
      logger.error('Failed to create bid in database', errorInfo);
      
      // Also log to console for immediate visibility
      console.error('=== DATABASE ERROR DETAILS ===');
      console.error('Error Code:', bidError.code);
      console.error('Error Message:', bidError.message);
      console.error('Error Details:', bidError.details);
      console.error('Error Hint:', bidError.hint);
      console.error('Full Error Object:', bidError);
      console.error('=== END DATABASE ERROR ===');

      // Provide more specific error messages based on error codes
      if (bidError.code === '23503') {
        // Foreign key violation
        return NextResponse.json({ 
          error: 'Invalid job or contractor reference. Please refresh and try again.' 
        }, { status: 400 });
      }

      if (bidError.code === '23502') {
        // Not null violation
        return NextResponse.json({ 
          error: 'Missing required bid information. Please fill in all fields.' 
        }, { status: 400 });
      }

      if (bidError.code === '42501') {
        // Insufficient privileges
        return NextResponse.json({ 
          error: 'You do not have permission to submit bids. Please check your account status.' 
        }, { status: 403 });
      }

      if (bidError.code === '23514') {
        // Check constraint violation
        return NextResponse.json({ 
          error: 'Bid failed validation. Please review your inputs and try again.' 
        }, { status: 400 });
      }

      // Common text-based patterns from Postgres/PostgREST
      const messageLower = (bidError.message || '').toLowerCase();
      if (messageLower.includes('invalid input syntax for type numeric') || messageLower.includes('invalid input syntax')) {
        return NextResponse.json({ error: 'Bid amount is invalid. Please enter a valid number.' }, { status: 400 });
      }

      // For unknown errors, return a generic message but include dev diagnostics
      const devInfo = process.env.NODE_ENV !== 'production'
        ? {
            devError: {
              code: bidError.code,
              message: bidError.message,
              details: typeof (bidError as any).details === 'string' ? (bidError as any).details : JSON.stringify((bidError as any).details || {}),
              hint: (bidError as any).hint,
            }
          }
        : {};

      return NextResponse.json({ 
        error: 'Unable to submit bid due to a database error. Please try again or contact support.',
        ...devInfo,
      }, { status: 500 });
        }
      } else {
        bid = newBid;
        isUpdate = false;
      }
    }

    if (!bid) {
      logger.error('Bid creation/update failed but no error was thrown', {
        service: 'contractor',
        contractorId: user.id,
        jobId: validatedData.jobId,
      });
      return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
    }

    // Create or update quote linked to this bid
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    const homeownerName = homeowner 
      ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || 'Client'
      : 'Client';
    const homeownerEmail = homeowner?.email || '';

    // Prepare quote data
    const quoteSubtotal = validatedData.subtotal ?? validatedData.bidAmount;
    const quoteTaxRate = validatedData.taxRate ?? 0;
    const quoteTaxAmount = validatedData.taxAmount ?? ((quoteSubtotal * quoteTaxRate) / 100);
    const quoteTotalAmount = validatedData.totalAmount ?? validatedData.bidAmount;
    const quoteLineItems = validatedData.lineItems && validatedData.lineItems.length > 0
      ? validatedData.lineItems
      : [];

    // Check if quote already exists for this bid
    const { data: existingQuote } = existingBid?.id
      ? await serverSupabase
          .from('contractor_quotes')
          .select('id')
          .eq('id', existingBid.quote_id || '')
          .single()
      : { data: null };

    const quotePayload = {
      contractor_id: user.id,
      job_id: validatedData.jobId,
      client_name: homeownerName,
      client_email: homeownerEmail,
      title: `Quote for ${job.title}`,
      description: validatedData.proposalText.trim(),
      subtotal: quoteSubtotal,
      tax_rate: quoteTaxRate,
      tax_amount: quoteTaxAmount,
      total_amount: quoteTotalAmount,
      line_items: quoteLineItems.length > 0 ? quoteLineItems : [],
      terms: validatedData.terms?.trim() || null,
      status: 'sent' as const, // Quote status: sent when bid is pending
      quote_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };

    let quote;
    if (existingQuote?.id) {
      // Update existing quote
      const { data: updatedQuote, error: quoteUpdateError } = await serverSupabase
        .from('contractor_quotes')
        .update(quotePayload)
        .eq('id', existingQuote.id)
        .select()
        .single();

      if (quoteUpdateError) {
        logger.error('Failed to update quote', {
          service: 'contractor',
          contractorId: user.id,
          jobId: validatedData.jobId,
          quoteId: existingQuote.id,
          error: quoteUpdateError.message,
        });
        // Don't fail the bid if quote update fails, but log it
      } else {
        quote = updatedQuote;
      }
    } else {
      // Create new quote
      const { data: newQuote, error: quoteInsertError } = await serverSupabase
        .from('contractor_quotes')
        .insert({
          ...quotePayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteInsertError) {
        logger.error('Failed to create quote', {
          service: 'contractor',
          contractorId: user.id,
          jobId: validatedData.jobId,
          error: quoteInsertError.message,
        });
        // Don't fail the bid if quote creation fails, but log it
      } else {
        quote = newQuote;

        // Link quote to bid
        const { error: linkError } = await serverSupabase
          .from('bids')
          .update({ quote_id: newQuote.id })
          .eq('id', bid.id);

        if (linkError) {
          logger.error('Failed to link quote to bid', {
            service: 'contractor',
            contractorId: user.id,
            jobId: validatedData.jobId,
            bidId: bid.id,
            quoteId: newQuote.id,
            error: linkError.message,
          });
          // Don't fail the bid if linking fails
        }
      }
    }

    // Send email notification to homeowner (only for new bids, not updates)
    if (!isUpdate) {
      if (homeowner?.email) {
        const contractorName = `${user.first_name} ${user.last_name}`.trim() || user.email;
        const homeownerName = `${homeowner.first_name} ${homeowner.last_name}`.trim() || 'Valued Client';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const proposalExcerpt = validatedData.proposalText.substring(0, 150);

        // Send email notification
        await EmailService.sendBidNotification(homeowner.email, {
          homeownerName,
          contractorName,
          jobTitle: job.title,
          bidAmount: validatedData.bidAmount,
          proposalExcerpt,
          viewUrl: `${baseUrl}/jobs/${validatedData.jobId}`,
        }).catch((error) => {
          logger.error('Failed to send bid notification email', {
            service: 'contractor',
            homeownerId: homeowner.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });

        // Create database notification for homeowner
        try {
          console.log('[Bid Submit] Creating notification for homeowner', {
            service: 'contractor',
            homeownerId: homeowner.id,
            jobId: validatedData.jobId,
            jobTitle: job.title,
            bidAmount: validatedData.bidAmount,
          });

          const { error: notificationError } = await serverSupabase
            .from('notifications')
            .insert({
              user_id: homeowner.id,
              title: 'New Bid Received',
              message: `${contractorName} has submitted a bid of £${validatedData.bidAmount.toFixed(2)} for your job "${job.title}"`,
              type: 'bid_received',
              read: false,
              action_url: `/jobs/${validatedData.jobId}`,
              created_at: new Date().toISOString(),
            });

          if (notificationError) {
            console.error('[Bid Submit] Failed to create bid notification', {
              service: 'contractor',
              homeownerId: homeowner.id,
              error: notificationError.message,
              errorDetails: notificationError,
            });
            logger.error('Failed to create bid notification', {
              service: 'contractor',
              homeownerId: homeowner.id,
              error: notificationError.message,
            });
          } else {
            console.log('[Bid Submit] Bid notification created for homeowner', {
              service: 'contractor',
              homeownerId: homeowner.id,
              jobId: validatedData.jobId,
            });
            logger.info('Bid notification created for homeowner', {
              service: 'contractor',
              homeownerId: homeowner.id,
              jobId: validatedData.jobId,
            });
          }
        } catch (notificationError) {
          console.error('[Bid Submit] Unexpected error creating notification', {
            service: 'contractor',
            homeownerId: homeowner.id,
            error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          });
          logger.error('Unexpected error creating notification', {
            service: 'contractor',
            homeownerId: homeowner.id,
            error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          });
        }
      }
    }

    logger.info('Bid submitted successfully', {
      service: 'contractor',
      bidId: bid.id,
      contractorId: user.id,
      jobId: validatedData.jobId,
      bidAmount: validatedData.bidAmount
    });

    // Trigger auto-accept evaluation asynchronously (fire-and-forget)
    // Only evaluate new bids, not updates
    if (!isUpdate && bid.status === 'pending') {
      BidAcceptanceAgent.evaluateAutoAccept(
        validatedData.jobId,
        bid.id,
        {
          jobId: validatedData.jobId,
          userId: homeowner?.id,
          contractorId: user.id,
        }
      ).catch((error) => {
        // Log error but don't block the response
        logger.error('Error in auto-accept evaluation', {
          service: 'contractor',
          jobId: validatedData.jobId,
          bidId: bid.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    return NextResponse.json({
      success: true,
      updated: isUpdate,
      message: isUpdate ? 'Your bid has been updated successfully.' : 'Your bid has been submitted successfully.',
      bid: {
        id: bid.id,
        jobId: bid.job_id,
        bidAmount: bid.amount,
        status: bid.status,
        createdAt: bid.created_at
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid bid submission data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid bid data',
        details: error.issues
      }, { status: 400 });
    }

    // Log complete error details
    logger.error('Unexpected error in submit-bid', {
      service: 'contractor',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });

    const devInfo = process.env.NODE_ENV !== 'production' && error && typeof error === 'object'
      ? {
          devError: {
            type: error instanceof Error ? error.constructor.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }
        }
      : {};

    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      ...devInfo,
    }, { status: 500 });
  }
}
