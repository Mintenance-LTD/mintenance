'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Award, Users, Clock, Lightbulb, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import type { PerformanceInsight } from '@/lib/services/ContractorAnalyticsService';
import { cn } from '@/lib/utils';
import { logger } from '@mintenance/shared';

interface AnalyticsClientProps {
  initialData: {
    totalRevenue: number;
    pendingRevenue: number;
    averageJobValue: number;
    winRate: number;
    quotesSent: number;
    quotesAccepted: number;
    connections: number;
    avgRating: number;
    completionRate: number;
    totalJobs: number;
    activeJobs: number;
    revenueByMonth: Record<string, number>;
    jobsByMonth: Record<string, number>;
  };
  contractorId: string;
}

export function AnalyticsClient({ initialData, contractorId }: AnalyticsClientProps) {
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    async function loadInsights() {
      try {
        const response = await fetch('/api/analytics/insights');
        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }
        const data = await response.json();
        setInsights(data.insights || []);
      } catch (error) {
        logger.error('Failed to load insights:', error);
        // Don't show error to user, just log it - insights are optional
        setInsights([]);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, [contractorId]);

  // Transform data for charts
  const revenueChartData = Object.entries(initialData.revenueByMonth).map(([month, value]) => ({
    month: month.split(' ')[0], // Just the month name
    revenue: value,
  }));

  const jobsChartData = Object.entries(initialData.jobsByMonth).map(([month, value]) => ({
    month: month.split(' ')[0],
    jobs: value,
  }));

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `£${initialData.totalRevenue.toLocaleString()}`,
      subtitle: `${initialData.totalJobs} completed jobs`,
      icon: DollarSign,
      color: 'text-success-DEFAULT',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending Revenue',
      value: `£${initialData.pendingRevenue.toLocaleString()}`,
      subtitle: 'In escrow',
      icon: Clock,
      color: 'text-warning-DEFAULT',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Avg Job Value',
      value: `£${initialData.averageJobValue.toLocaleString()}`,
      subtitle: 'Per completed job',
      icon: Briefcase,
      color: 'text-primary-600',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Win Rate',
      value: `${initialData.winRate.toFixed(0)}%`,
      subtitle: 'Based on accepted proposals',
      icon: Target,
      color: 'text-primary-600',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Quotes Sent',
      value: initialData.quotesSent.toString(),
      subtitle: `${initialData.quotesAccepted} accepted`,
      icon: Briefcase,
      color: 'text-primary-600',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Network',
      value: initialData.connections.toString(),
      subtitle: 'Professional connections',
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-primary/10',
    },
  ];

  const getInsightIcon = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'strength':
        return CheckCircle2;
      case 'opportunity':
        return TrendingUp;
      case 'warning':
        return AlertCircle;
      case 'recommendation':
        return Lightbulb;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'strength':
        return 'text-success-DEFAULT bg-success/10 border-success/20';
      case 'opportunity':
        return 'text-primary-600 bg-primary/10 border-primary/20';
      case 'warning':
        return 'text-warning-DEFAULT bg-warning/10 border-warning/20';
      case 'recommendation':
        return 'text-info-DEFAULT bg-info/10 border-info/20';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">Track revenue, response time, and win rate</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="p-6 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={cn('text-3xl font-bold mb-1', card.color)}>{card.value}</p>
                  <p className="text-xs text-gray-500">{card.subtitle}</p>
                </div>
                <div className={cn('p-3 rounded-lg', card.bgColor)}>
                  <Icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend</h3>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No revenue data yet. Complete jobs to see your revenue trend.</p>
            </div>
          )}
        </Card>

        {/* Jobs Per Month */}
        <Card className="p-6 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Jobs Per Month</h3>
          {jobsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value: number) => [value, 'Jobs']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="jobs" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No job data yet. Start bidding on jobs to see your activity trend.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Performance Overview */}
      <Card className="p-6 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Average Rating */}
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-gray-600 mb-4">Average Rating</p>
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${(initialData.avgRating / 5) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{initialData.avgRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">/ 5.0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-gray-600 mb-4">Completion Rate</p>
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${(initialData.completionRate / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{initialData.completionRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-gray-600 mb-4">Active Jobs</p>
            <div className="relative w-32 h-32 flex items-center justify-center bg-gray-50 rounded-full border-8 border-warning-DEFAULT">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{initialData.activeJobs}</p>
                <p className="text-xs text-gray-500">of {initialData.totalJobs}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Recommendations */}
      {insights.length > 0 && (
        <Card className="p-6 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI-Powered Business Insights</h3>
          </div>
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <Alert
                  key={index}
                  className={cn('border-l-4', getInsightColor(insight.type))}
                >
                  <Icon className="h-4 w-4" />
                  <AlertTitle className="font-semibold">{insight.title}</AlertTitle>
                  <AlertDescription className="mt-1">
                    {insight.description}
                    {insight.recommendedActions && insight.recommendedActions.length > 0 && (
                      <ul className="mt-3 space-y-1 list-disc list-inside">
                        {insight.recommendedActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

