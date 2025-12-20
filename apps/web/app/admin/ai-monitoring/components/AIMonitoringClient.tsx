'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, BarChart, DonutChart, LineChart } from '@tremor/react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OverviewMetrics {
  totalDecisions24h: number;
  totalDecisions7d: number;
  totalDecisions30d: number;
  averageConfidence: number;
  successRate: number;
  errorRate: number;
  activeAgents: number;
  topPerformingAgent: string | null;
  recentErrors: Array<{
    agentName: string;
    decisionType: string;
    timestamp: string;
    error: string;
  }>;
}

interface AgentMetrics {
  agentName: string;
  totalDecisions: number;
  successRate: number;
  averageConfidence: number;
  errorRate: number;
  averageLatency: number;
  learningMetrics: {
    memoryUpdates: number;
    accuracyTrend: number[];
    lastSelfModification: Date | null;
  };
}

interface TimelineDataPoint {
  timestamp: string;
  decisions: number;
  successRate: number;
  averageConfidence: number;
}

interface DecisionLog {
  id: string;
  agentName: string;
  decisionType: string;
  actionTaken: string | null;
  confidence: number;
  outcomeSuccess: boolean | null;
  createdAt: string;
  reasoning: string;
}

export function AIMonitoringClient() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortField, setSortField] = useState<keyof AgentMetrics>('totalDecisions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, agentsRes, timelineRes, decisionsRes] = await Promise.all([
        fetch('/api/admin/ai-monitoring/overview'),
        fetch('/api/admin/ai-monitoring/agents'),
        fetch(`/api/admin/ai-monitoring/timeline${selectedAgent ? `?agentName=${selectedAgent}` : ''}`),
        fetch(`/api/admin/ai-monitoring/decisions?limit=20&errorsOnly=${showErrorsOnly}`),
      ]);

      const [overviewData, agentsData, timelineData, decisionsData] = await Promise.all([
        overviewRes.json(),
        agentsRes.json(),
        timelineRes.json(),
        decisionsRes.json(),
      ]);

      if (overviewData.success) setOverview(overviewData.data);
      if (agentsData.success) setAgents(agentsData.data);
      if (timelineData.success) setTimeline(timelineData.data);
      if (decisionsData.success) setDecisionLogs(decisionsData.data);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching AI monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgent, showErrorsOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleSort = (field: keyof AgentMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600 bg-emerald-100';
    if (rate >= 70) return 'text-amber-600 bg-amber-100';
    return 'text-rose-600 bg-rose-100';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 90) return <CheckCircle className="w-5 h-5" />;
    if (rate >= 70) return <AlertTriangle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading AI monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">AI Agent Monitoring</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg border font-medium transition-all ${
              autoRefresh
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh {autoRefresh ? 'On' : 'Off'}
            </div>
          </button>

          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-all"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </div>
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <MotionDiv
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={staggerItem}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">24h / 7d / 30d</div>
              <div className="text-xs text-gray-600">
                {overview?.totalDecisions24h} / {overview?.totalDecisions7d} / {overview?.totalDecisions30d}
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {overview?.totalDecisions24h || 0}
          </div>
          <div className="text-sm text-gray-600">Total Decisions (24h)</div>
        </MotionDiv>

        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={staggerItem}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(overview?.successRate || 0)}`}>
              {getStatusIcon(overview?.successRate || 0)}
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {overview?.successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </MotionDiv>

        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={staggerItem}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {overview?.averageConfidence.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Avg Confidence</div>
        </MotionDiv>

        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={staggerItem}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {overview?.errorRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Error Rate</div>
        </MotionDiv>
      </MotionDiv>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Decision Timeline */}
        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Decision Timeline (24h)</h3>
            <select
              value={selectedAgent || 'all'}
              onChange={(e) => setSelectedAgent(e.target.value === 'all' ? null : e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.agentName} value={agent.agentName}>
                  {agent.agentName}
                </option>
              ))}
            </select>
          </div>
          <LineChart
            data={timeline}
            index="timestamp"
            categories={['decisions', 'successRate']}
            colors={['purple', 'emerald']}
            valueFormatter={(value) => value.toFixed(0)}
            showAnimation={true}
            showLegend={true}
            showGridLines={true}
            className="h-80"
          />
        </MotionDiv>

        {/* Confidence Distribution */}
        <MotionDiv
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Confidence Distribution</h3>
          <AreaChart
            data={timeline}
            index="timestamp"
            categories={['averageConfidence']}
            colors={['indigo']}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
            showAnimation={true}
            showLegend={false}
            showGridLines={true}
            className="h-80"
          />
        </MotionDiv>
      </div>

      {/* Agent Performance Table */}
      <MotionDiv
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Agent Performance</h3>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">{agents.length} Active Agents</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('agentName')}
                >
                  <div className="flex items-center gap-2">
                    Agent Name
                    {sortField === 'agentName' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalDecisions')}
                >
                  <div className="flex items-center gap-2">
                    Decisions
                    {sortField === 'totalDecisions' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('successRate')}
                >
                  <div className="flex items-center gap-2">
                    Success Rate
                    {sortField === 'successRate' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('averageConfidence')}
                >
                  <div className="flex items-center gap-2">
                    Avg Confidence
                    {sortField === 'averageConfidence' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('errorRate')}
                >
                  <div className="flex items-center gap-2">
                    Error Rate
                    {sortField === 'errorRate' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('averageLatency')}
                >
                  <div className="flex items-center gap-2">
                    Avg Latency
                    {sortField === 'averageLatency' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                  Memory Updates
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent) => (
                <tr key={agent.agentName} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{agent.agentName}</div>
                    {overview?.topPerformingAgent === agent.agentName && (
                      <div className="text-xs text-purple-600 font-semibold mt-1">Top Performer</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-900">{agent.totalDecisions}</td>
                  <td className="py-3 px-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${getStatusColor(agent.successRate)}`}>
                      {agent.successRate.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{agent.averageConfidence.toFixed(1)}%</td>
                  <td className="py-3 px-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                      agent.errorRate > 10 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {agent.errorRate.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {agent.averageLatency > 0 ? `${agent.averageLatency.toFixed(0)}ms` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-900">{agent.learningMetrics.memoryUpdates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MotionDiv>

      {/* Recent Decisions Log */}
      <MotionDiv
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Decisions</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowErrorsOnly(!showErrorsOnly)}
              className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
                showErrorsOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {showErrorsOnly ? 'Errors Only' : 'All Decisions'}
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {decisionLogs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-xl border ${
                log.outcomeSuccess === false
                  ? 'border-rose-200 bg-rose-50'
                  : log.outcomeSuccess === true
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">{log.agentName}</span>
                    <span className="text-sm text-gray-600">{log.decisionType}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {log.actionTaken && (
                    <div className="text-sm text-gray-700 mb-2">
                      Action: <span className="font-medium">{log.actionTaken}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">{log.reasoning}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-3 py-1 rounded-lg bg-white border border-gray-200">
                    <span className="text-xs text-gray-600">Confidence:</span>
                    <span className="ml-2 font-semibold text-gray-900">{log.confidence}%</span>
                  </div>
                  {log.outcomeSuccess !== null && (
                    <div className={`px-3 py-1 rounded-lg ${
                      log.outcomeSuccess
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {log.outcomeSuccess ? 'Success' : 'Failed'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {decisionLogs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No decisions found
            </div>
          )}
        </div>
      </MotionDiv>
    </div>
  );
}
