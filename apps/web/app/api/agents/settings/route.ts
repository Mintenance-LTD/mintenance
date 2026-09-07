/**
 * Agent Settings API
 * Manages user preferences for AI agent automation
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@/lib/logger';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { z } from 'zod';

interface AgentSettings {
  enableAutomation: boolean;
  automationLevel: 'none' | 'minimal' | 'moderate' | 'full';
  agents: {
    [key: string]: { enabled: boolean; confidence: number; lastAction?: string; lastActionTime?: string; };
  };
}

const DEFAULT_SETTINGS: AgentSettings = {
  enableAutomation: false,
  automationLevel: 'none',
  agents: {
    BidAcceptanceAgent: { enabled: false, confidence: 0.85 },
    PricingAgent: { enabled: false, confidence: 0.90 },
    SchedulingAgent: { enabled: false, confidence: 0.80 },
    NotificationAgent: { enabled: true, confidence: 0.95 },
    DisputeResolutionAgent: { enabled: false, confidence: 0.75 },
    JobStatusAgent: { enabled: false, confidence: 0.88 },
    PredictiveAgent: { enabled: false, confidence: 0.70 }
  }
};

const agentSettingSchema = z.object({
  enabled: z.boolean(),
  confidence: z.number().min(0).max(1),
  lastAction: z.string().optional(),
  lastActionTime: z.string().optional(),
});

const settingsSchema = z.object({
  enableAutomation: z.boolean(),
  automationLevel: z
    .enum(['none', 'minimal', 'moderate', 'full'])
    .default('none'),
  agents: z.record(agentSettingSchema).default({}),
});

export const GET = withApiHandler({}, async (_req, { user }) => {
  const { data: existingSettings, error: fetchError } = await serverSupabase
    .from('user_agent_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !existingSettings) {
    logger.info('Returning default agent settings for user', { userId: user.id });
    return NextResponse.json(DEFAULT_SETTINGS);
  }

  const { data: recentActions } = await serverSupabase
    .from('agent_decisions')
    .select('agent_name, action, confidence, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const settings: AgentSettings = {
    enableAutomation: existingSettings.enable_automation ?? false,
    automationLevel: existingSettings.automation_level ?? 'none',
    agents: existingSettings.agents ?? {}
  };

  if (recentActions) {
    for (const action of recentActions) {
      if (settings.agents[action.agent_name]) {
        settings.agents[action.agent_name].lastAction = action.action;
        settings.agents[action.agent_name].lastActionTime = action.created_at;
        settings.agents[action.agent_name].confidence = action.confidence;
      }
    }
  }

  return NextResponse.json(settings);
});

export const POST = withApiHandler({}, async (req, { user }) => {
  let settings: AgentSettings;
  try {
    settings = settingsSchema.parse(await req.json());
  } catch {
    throw new BadRequestError('Invalid settings format');
  }

  const dbSettings = {
    user_id: user.id,
    enable_automation: settings.enableAutomation,
    automation_level: settings.automationLevel,
    agents: settings.agents,
    updated_at: new Date().toISOString()
  };

  const { error: upsertError } = await serverSupabase
    .from('user_agent_settings')
    .upsert(dbSettings, { onConflict: 'user_id' });

  if (upsertError) {
    logger.error('Failed to update agent settings', upsertError);
    throw new InternalServerError('Failed to save settings');
  }

  const bidAcceptEnabled = settings.enableAutomation && settings.agents?.BidAcceptanceAgent?.enabled === true;
  const { error: preferencesError } = await serverSupabase
    .from('automation_preferences')
    .upsert(
    { user_id: user.id, auto_accept_bids: bidAcceptEnabled, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  if (preferencesError) {
    logger.error('Failed to synchronize automation preferences', preferencesError);
    throw new InternalServerError('Failed to save automation preferences');
  }

  const { error: auditError } = await serverSupabase.from('agent_decisions').insert({
    user_id: user.id, agent_name: 'SettingsManager',
    context: { previous_level: settings.automationLevel },
    decision: 'settings_updated',
    action: `Automation ${settings.enableAutomation ? 'enabled' : 'disabled'}`,
    confidence: 1.0,
    metadata: { automation_level: settings.automationLevel, enabled_agents: Object.entries(settings.agents).filter(([_, config]) => config.enabled).map(([name]) => name) }
  });

  if (auditError) {
    logger.error('Failed to record agent settings audit event', auditError);
    throw new InternalServerError('Failed to record settings change');
  }

  logger.info('Agent settings updated', { userId: user.id, automationEnabled: settings.enableAutomation, level: settings.automationLevel });

  return NextResponse.json({ success: true });
});
