/**
 * Agent Decision API Endpoint
 * Allows mobile to request decisions from any AI agent
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { SchedulingAgent } from '@/lib/services/agents/SchedulingAgent';
import { NotificationAgent } from '@/lib/services/agents/NotificationAgent';
import { DisputeResolutionAgent } from '@/lib/services/agents/DisputeResolutionAgent';
import { EscrowReleaseAgent } from '@/lib/services/agents/EscrowReleaseAgent';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { PredictiveAgent } from '@/lib/services/agents/PredictiveAgent';
import { AgentOrchestrator } from '@/lib/services/agents/AgentOrchestrator';
import { AgentLogger } from '@/lib/services/agents/AgentLogger';
import { rateLimit } from '@/lib/rate-limiter';
import { withErrorHandler } from '@/lib/error-handler';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const requestSchema = z.object({
  agentName: z.string(),
  context: z.object({
    userId: z.string(),
    jobId: z.string().optional(),
    contractorId: z.string().optional(),
    automationPreferences: z.object({
      enableAutomation: z.boolean(),
      automationLevel: z.enum(['none', 'minimal', 'moderate', 'full']),
      requireApproval: z.boolean(),
      notificationSettings: z.object({
        email: z.boolean(),
        push: z.boolean(),
        sms: z.boolean()
      })
    }).optional(),
    historicalData: z.any().optional()
  })
});

const agents: { [key: string]: unknown } = {
  'PricingAgent': PricingAgent,
  'BidAcceptanceAgent': BidAcceptanceAgent,
  'SchedulingAgent': SchedulingAgent,
  'NotificationAgent': NotificationAgent,
  'DisputeResolutionAgent': DisputeResolutionAgent,
  'EscrowReleaseAgent': EscrowReleaseAgent,
  'JobStatusAgent': JobStatusAgent,
  'PredictiveAgent': PredictiveAgent
};

export const POST = withErrorHandler(async (req: Request) => {
  try {
    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitResult = await rateLimit(identifier, 30); // 30 requests per minute

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.reset.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          }
        }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    const { agentName, context } = validatedData;

    // Check if agent exists
    const Agent = agents[agentName];
    if (!Agent) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentName}` },
        { status: 400 }
      );
    }

    // Check user permissions for automation
    const { data: userPrefs } = await supabase
      .from('automation_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const automationEnabled = userPrefs?.enable_automation ?? false;
    const requiresApproval = userPrefs?.require_approval ?? true;

    if (!automationEnabled) {
      return NextResponse.json(
        { error: 'Automation is disabled for this user' },
        { status: 403 }
      );
    }

    // Use orchestrator for complex multi-agent workflows
    if (context.jobId && agentName !== 'PricingAgent') {
      const orchestratorResult = await AgentOrchestrator.processJobLifecycle(
        context.jobId,
        {
          ...context,
          userId: session.user.id,
          automationPreferences: {
            enableAutomation: automationEnabled,
            automationLevel: userPrefs?.automation_level || 'minimal',
            requireApproval: requiresApproval,
            notificationSettings: {
              email: userPrefs?.notify_email ?? true,
              push: userPrefs?.notify_push ?? true,
              sms: userPrefs?.notify_sms ?? false
            }
          }
        }
      );

      // Log the orchestrated decision
      await AgentLogger.logDecision({
        agentName: 'AgentOrchestrator',
        decisionType: 'multi-agent-workflow',
        actionTaken: 'orchestrated',
        confidence: 0.85,
        reasoning: 'Multiple agents coordinated for job lifecycle',
        metadata: {
          jobId: context.jobId,
          agents: Object.keys(orchestratorResult)
        }
      });

      return NextResponse.json(orchestratorResult, {
        headers: {
          'X-Request-ID': crypto.randomUUID(),
          'X-Agent': 'AgentOrchestrator',
          'X-Automation-Level': userPrefs?.automation_level || 'minimal'
        }
      });
    }

    // Single agent decision
    let decision;

    switch (agentName) {
      case 'PricingAgent':
        if (!context.jobId) {
          return NextResponse.json(
            { error: 'jobId is required for PricingAgent' },
            { status: 400 }
          );
        }
        decision = await PricingAgent.generateRecommendation(
          context.jobId,
          context.contractorId || session.user.id
        );
        break;

      case 'BidAcceptanceAgent':
        decision = await BidAcceptanceAgent.evaluateBid(
          context.jobId!,
          context.contractorId!,
          context.historicalData
        );
        break;

      case 'SchedulingAgent':
        decision = await SchedulingAgent.optimizeSchedule(
          context.jobId!,
          context.contractorId || session.user.id,
          context.historicalData?.preferredTimes
        );
        break;

      case 'NotificationAgent':
        decision = await NotificationAgent.determineNotificationStrategy(
          session.user.id,
          context.historicalData?.notificationType,
          context.historicalData
        );
        break;

      case 'DisputeResolutionAgent':
        decision = await DisputeResolutionAgent.analyzeDispute(
          context.jobId!,
          context.historicalData?.disputeDetails
        );
        break;

      case 'EscrowReleaseAgent':
        decision = await EscrowReleaseAgent.evaluateRelease(
          context.jobId!,
          context.historicalData
        );
        break;

      case 'JobStatusAgent':
        decision = await JobStatusAgent.determineNextStatus(
          context.jobId!,
          context.historicalData?.currentStatus
        );
        break;

      case 'PredictiveAgent':
        decision = await PredictiveAgent.predictDemand(
          context.historicalData?.category,
          context.historicalData?.location
        );
        break;

      default:
        return NextResponse.json(
          { error: `Agent ${agentName} not implemented` },
          { status: 501 }
        );
    }

    // Log the decision
    await AgentLogger.logDecision({
      agentName,
      decisionType: 'api-request',
      actionTaken: decision?.action || 'evaluated',
      confidence: decision?.confidence || 0.75,
      reasoning: decision?.reasoning || 'API request processed',
      metadata: {
        ...decision,
        userId: session.user.id,
        platform: req.headers.get('x-platform') || 'unknown'
      }
    });

    // Track metrics
    await supabase
      .from('agent_analytics')
      .insert({
        agent_name: agentName,
        decision_count: 1,
        success_count: decision ? 1 : 0,
        avg_confidence: decision?.confidence || 0,
        avg_processing_time: Date.now() - performance.now(),
        date: new Date().toISOString().split('T')[0]
      });

    return NextResponse.json(
      {
        success: true,
        agentName,
        decision,
        requiresApproval,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'X-Request-ID': crypto.randomUUID(),
          'X-Agent': agentName,
          'X-Confidence': (decision?.confidence || 0).toString(),
          'X-Automation-Level': userPrefs?.automation_level || 'minimal',
          'X-Processing-Time': (Date.now() - performance.now()).toString()
        }
      }
    );

  } catch (error: unknown) {
    logger.error('Agent decision error:', error, { service: 'api' });

    // Log error
    await AgentLogger.logDecision({
      agentName: 'error',
      decisionType: 'error',
      actionTaken: 'failed',
      confidence: 0,
      reasoning: error.message,
      metadata: { error: error.stack }
    });

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process agent decision', details: error.message },
      { status: 500 }
    );
  }
});