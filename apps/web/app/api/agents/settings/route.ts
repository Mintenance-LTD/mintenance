/**
 * Agent Settings API
 * Manages user preferences for AI agent automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { handleAPIError, UnauthorizedError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

interface AgentSettings {
  enableAutomation: boolean;
  automationLevel: 'none' | 'minimal' | 'moderate' | 'full';
  agents: {
    [key: string]: {
      enabled: boolean;
      confidence: number;
      lastAction?: string;
      lastActionTime?: string;
    };
  };
}

// Default settings for new users
const DEFAULT_SETTINGS: AgentSettings = {
  enableAutomation: false,
  automationLevel: 'none',
  agents: {
    BidAcceptanceAgent: {
      enabled: false,
      confidence: 0.85
    },
    PricingAgent: {
      enabled: false,
      confidence: 0.90
    },
    SchedulingAgent: {
      enabled: false,
      confidence: 0.80
    },
    NotificationAgent: {
      enabled: true,
      confidence: 0.95
    },
    DisputeResolutionAgent: {
      enabled: false,
      confidence: 0.75
    },
    JobStatusAgent: {
      enabled: false,
      confidence: 0.88
    },
    PredictiveAgent: {
      enabled: false,
      confidence: 0.70
    }
  }
};

// GET /api/agents/settings - Fetch current settings
export async function GET(req: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'anonymous'}:${req.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Try to fetch existing settings
    const { data: existingSettings, error: fetchError } = await serverSupabase
      .from('user_agent_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSettings) {
      // Return default settings for new users
      logger.info('Returning default agent settings for user', { userId: user.id });
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // Fetch recent agent actions
    const { data: recentActions } = await serverSupabase
      .from('agent_decisions')
      .select('agent_name, action, confidence, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Merge settings with recent actions
    const settings: AgentSettings = {
      enableAutomation: existingSettings.enable_automation ?? false,
      automationLevel: existingSettings.automation_level ?? 'none',
      agents: existingSettings.agents ?? {}
    };

    // Update agent data with recent actions
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
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/agents/settings - Update settings
export async function POST(req: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const settings: AgentSettings = await req.json();

    // Validate settings
    if (!settings || typeof settings.enableAutomation !== 'boolean') {
      throw new BadRequestError('Invalid settings format');
    }

    // Prepare data for database
    const dbSettings = {
      user_id: user.id,
      enable_automation: settings.enableAutomation,
      automation_level: settings.automationLevel,
      agents: settings.agents,
      updated_at: new Date().toISOString()
    };

    // Upsert settings (insert or update)
    const { error: upsertError } = await serverSupabase
      .from('user_agent_settings')
      .upsert(dbSettings, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      logger.error('Failed to update agent settings', upsertError);
      throw new InternalServerError('Failed to save settings');
    }

    // Log the change for audit
    await serverSupabase
      .from('agent_decisions')
      .insert({
        user_id: user.id,
        agent_name: 'SettingsManager',
        context: { previous_level: settings.automationLevel },
        decision: 'settings_updated',
        action: `Automation ${settings.enableAutomation ? 'enabled' : 'disabled'}`,
        confidence: 1.0,
        metadata: {
          automation_level: settings.automationLevel,
          enabled_agents: Object.entries(settings.agents)
            .filter(([_, config]) => config.enabled)
            .map(([name]) => name)
        }
      });

    logger.info('Agent settings updated', {
      userId: user.id,
      automationEnabled: settings.enableAutomation,
      level: settings.automationLevel
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error);
  }
}