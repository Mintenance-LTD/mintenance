/**
 * Agent Automation Panel
 * Allows users to control and monitor AI agent automation
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  DollarSign,
  Calendar,
  Shield,
  MessageSquare,
  FileCheck,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';

interface AutomationSettings {
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

const AGENT_CONFIGS = [
  {
    id: 'BidAcceptanceAgent',
    name: 'Bid Acceptance',
    description: 'Automatically accept high-quality bids',
    icon: CheckCircle,
    color: 'green',
    requiredLevel: 'moderate' as const
  },
  {
    id: 'PricingAgent',
    name: 'Smart Pricing',
    description: 'AI-powered pricing recommendations',
    icon: DollarSign,
    color: 'blue',
    requiredLevel: 'minimal' as const
  },
  {
    id: 'SchedulingAgent',
    name: 'Auto Scheduling',
    description: 'Optimize appointment scheduling',
    icon: Calendar,
    color: 'purple',
    requiredLevel: 'moderate' as const
  },
  {
    id: 'NotificationAgent',
    name: 'Smart Notifications',
    description: 'Intelligent notification timing',
    icon: MessageSquare,
    color: 'orange',
    requiredLevel: 'minimal' as const
  },
  {
    id: 'DisputeResolutionAgent',
    name: 'Dispute Resolution',
    description: 'AI-assisted dispute mediation',
    icon: Shield,
    color: 'red',
    requiredLevel: 'full' as const
  },
  {
    id: 'JobStatusAgent',
    name: 'Status Management',
    description: 'Automatic job status updates',
    icon: Activity,
    color: 'cyan',
    requiredLevel: 'moderate' as const
  },
  {
    id: 'PredictiveAgent',
    name: 'Demand Prediction',
    description: 'Predict job demand and pricing',
    icon: TrendingUp,
    color: 'indigo',
    requiredLevel: 'full' as const
  }
];

const AUTOMATION_LEVELS = [
  { value: 'none', label: 'Off', description: 'No automation' },
  { value: 'minimal', label: 'Basic', description: 'Essential automation only' },
  { value: 'moderate', label: 'Standard', description: 'Balanced automation' },
  { value: 'full', label: 'Full', description: 'Maximum automation' }
];

export function AgentAutomationPanel() {
  const { user } = useCurrentUser();
  const [settings, setSettings] = useState<AutomationSettings>({
    enableAutomation: false,
    automationLevel: 'none',
    agents: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAutomationSettings();
  }, []);

  const fetchAutomationSettings = async () => {
    try {
      const response = await fetch('/api/agents/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch automation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agents/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Automation settings updated');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setSettings(prev => ({
      ...prev,
      agents: {
        ...prev.agents,
        [agentId]: {
          ...prev.agents[agentId],
          enabled: !prev.agents[agentId]?.enabled
        }
      }
    }));
  };

  const setAutomationLevel = (level: string) => {
    setSettings(prev => ({
      ...prev,
      automationLevel: level as AutomationSettings['automationLevel'],
      enableAutomation: level !== 'none'
    }));
  };

  const isAgentAvailable = (requiredLevel: string) => {
    const levels = ['none', 'minimal', 'moderate', 'full'];
    const currentIndex = levels.indexOf(settings.automationLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    return currentIndex >= requiredIndex;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Agent Automation</h3>
              <p className="text-sm text-gray-500">Control how AI agents assist you</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              enableAutomation: !prev.enableAutomation
            }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enableAutomation ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enableAutomation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Automation Level */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Automation Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AUTOMATION_LEVELS.map(level => (
              <button
                key={level.value}
                onClick={() => setAutomationLevel(level.value)}
                disabled={!settings.enableAutomation && level.value !== 'none'}
                className={`p-3 rounded-lg border-2 transition-all ${
                  settings.automationLevel === level.value
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                } ${
                  !settings.enableAutomation && level.value !== 'none'
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <div className="text-sm font-medium">{level.label}</div>
                <div className="text-xs text-gray-500 mt-1">{level.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Controls */}
        <div className="space-y-3">
          {AGENT_CONFIGS.map(agent => {
            const Icon = agent.icon;
            const isAvailable = isAgentAvailable(agent.requiredLevel);
            const isEnabled = settings.agents[agent.id]?.enabled;
            const agentData = settings.agents[agent.id];

            return (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border ${
                  isEnabled
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                } ${
                  !isAvailable ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 bg-${agent.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${agent.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        {!isAvailable && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            Requires {agent.requiredLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{agent.description}</p>

                      {agentData?.lastAction && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last action: {agentData.lastAction}
                          {agentData.lastActionTime && (
                            <span className="ml-2">
                              ({new Date(agentData.lastActionTime).toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}

                      {agentData?.confidence !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Confidence:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${agentData.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {Math.round(agentData.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAgent(agent.id)}
                    disabled={!isAvailable || !settings.enableAutomation}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-green-600' : 'bg-gray-200'
                    } ${
                      !isAvailable || !settings.enableAutomation
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={fetchAutomationSettings}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4 inline-block mr-2" />
            Refresh
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}