/**
 * Agent Decision API Endpoint
 * Allows mobile to request decisions from any AI agent
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
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
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import type { AgentName, ActionTaken } from '@/lib/services/agents/types';

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
      notificationSettings: z.object({ email: z.boolean(), push: z.boolean(), sms: z.boolean() })
    }).optional(),
    historicalData: z.record(z.string(), z.unknown()).optional()
  })
});

const agents: { [key: string]: unknown } = {
  'PricingAgent': PricingAgent, 'BidAcceptanceAgent': BidAcceptanceAgent,
  'SchedulingAgent': SchedulingAgent, 'NotificationAgent': NotificationAgent,
  'DisputeResolutionAgent': DisputeResolutionAgent, 'EscrowReleaseAgent': EscrowReleaseAgent,
  'JobStatusAgent': JobStatusAgent, 'PredictiveAgent': PredictiveAgent
};

export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (req, { user }) => {
  let validatedData;
  try {
    validatedData = requestSchema.parse(await req.json());
  } catch {
    throw new BadRequestError('Invalid request data. Please check your input and try again.');
  }
  const { agentName, context } = validatedData;

  if (!agents[agentName]) {
    return NextResponse.json({ error: `Unknown agent: ${agentName}` }, { status: 400 });
  }

  const { data: userPrefs } = await serverSupabase
    .from('automation_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const automationEnabled = userPrefs?.enable_automation ?? false;
  const requiresApproval = userPrefs?.require_approval ?? true;

  if (!automationEnabled) {
    return NextResponse.json({ error: 'Automation is disabled for this user' }, { status: 403 });
  }

  if (context.jobId && agentName !== 'PricingAgent') {
    const orchestratorResult = await AgentOrchestrator.processJobLifecycle(context.jobId, {
      jobId: context.jobId, userId: user.id, contractorId: context.contractorId,
      additionalData: {
        enableAutomation: automationEnabled, automationLevel: userPrefs?.automation_level || 'minimal',
        requireApproval: requiresApproval,
        notificationSettings: { email: userPrefs?.notify_email ?? true, push: userPrefs?.notify_push ?? true, sms: userPrefs?.notify_sms ?? false },
        historicalData: context.historicalData,
      }
    });

    await AgentLogger.logDecision({
      agentName: 'AgentOrchestrator', decisionType: 'multi-agent-workflow', actionTaken: 'orchestrated',
      confidence: 0.85, reasoning: 'Multiple agents coordinated for job lifecycle',
      metadata: { jobId: context.jobId, agents: Object.keys(orchestratorResult) }
    });

    return NextResponse.json(orchestratorResult, {
      headers: { 'X-Request-ID': crypto.randomUUID(), 'X-Agent': 'AgentOrchestrator', 'X-Automation-Level': userPrefs?.automation_level || 'minimal' }
    });
  }

  let decision;
  switch (agentName) {
    case 'PricingAgent':
      if (!context.jobId) return NextResponse.json({ error: 'jobId is required for PricingAgent' }, { status: 400 });
      decision = await PricingAgent.generateRecommendation(context.jobId, context.contractorId || user.id);
      break;
    case 'BidAcceptanceAgent':
      decision = await (BidAcceptanceAgent as unknown as { evaluateBid(j: string, c: string, d: unknown): Promise<Record<string, unknown>> }).evaluateBid(context.jobId!, context.contractorId!, context.historicalData);
      break;
    case 'SchedulingAgent':
      decision = await (SchedulingAgent as unknown as { optimizeSchedule(j: string, c: string, t: unknown): Promise<Record<string, unknown>> }).optimizeSchedule(context.jobId!, context.contractorId || user.id, context.historicalData?.preferredTimes);
      break;
    case 'NotificationAgent':
      decision = await (NotificationAgent as unknown as { determineNotificationStrategy(u: string, t: unknown, d: unknown): Promise<Record<string, unknown>> }).determineNotificationStrategy(user.id, context.historicalData?.notificationType, context.historicalData);
      break;
    case 'DisputeResolutionAgent':
      decision = await (DisputeResolutionAgent as unknown as { analyzeDispute(j: string, d: unknown): Promise<Record<string, unknown>> }).analyzeDispute(context.jobId!, context.historicalData?.disputeDetails);
      break;
    case 'EscrowReleaseAgent':
      decision = await EscrowReleaseAgent.evaluateAutoRelease(context.jobId!);
      break;
    case 'JobStatusAgent':
      decision = await (JobStatusAgent as unknown as { determineNextStatus(j: string, s: unknown): Promise<Record<string, unknown>> }).determineNextStatus(context.jobId!, context.historicalData?.currentStatus);
      break;
    case 'PredictiveAgent':
      decision = await (PredictiveAgent as unknown as { predictDemand(c: unknown, l: unknown): Promise<Record<string, unknown>> }).predictDemand(context.historicalData?.category, context.historicalData?.location);
      break;
    default:
      return NextResponse.json({ error: `Agent ${agentName} not implemented` }, { status: 501 });
  }

  const decisionRecord = decision as Record<string, unknown> | undefined;

  await AgentLogger.logDecision({
    agentName: agentName as AgentName, decisionType: 'api-request',
    actionTaken: ((decisionRecord?.action as string) || 'evaluated') as ActionTaken,
    confidence: (decisionRecord?.confidence as number) || 0.75,
    reasoning: (decisionRecord?.reasoning as string) || 'API request processed',
    metadata: { ...(decisionRecord ?? {}), userId: user.id, platform: req.headers.get('x-platform') || 'unknown' }
  });

  await serverSupabase.from('agent_analytics').insert({
    agent_name: agentName, decision_count: 1, success_count: decision ? 1 : 0,
    avg_confidence: (decisionRecord?.confidence as number) || 0,
    avg_processing_time: Date.now() - performance.now(),
    date: new Date().toISOString().split('T')[0]
  });

  return NextResponse.json(
    { success: true, agentName, decision, requiresApproval, timestamp: new Date().toISOString() },
    { headers: { 'X-Request-ID': crypto.randomUUID(), 'X-Agent': agentName, 'X-Confidence': ((decisionRecord?.confidence as number) || 0).toString(), 'X-Automation-Level': userPrefs?.automation_level || 'minimal' } }
  );
});
