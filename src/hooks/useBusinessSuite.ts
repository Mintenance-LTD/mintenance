import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contractorBusinessSuite,
  BusinessMetrics,
  FinancialSummary,
  ClientAnalytics,
  MarketingInsights,
  Invoice,
  ExpenseRecord,
  ContractorSchedule,
  ResourceInventory,
  MarketingCampaign,
  ClientCRM,
  BusinessGoal,
} from '../services/ContractorBusinessSuite';
import { logger } from '../utils/logger';

// Query Keys for React Query
export const BUSINESS_SUITE_KEYS = {
  all: ['business-suite'] as const,
  metrics: (contractorId: string, period?: string) =>
    ['business-suite', 'metrics', contractorId, period] as const,
  financial: (contractorId: string) =>
    ['business-suite', 'financial', contractorId] as const,
  clients: (contractorId: string) =>
    ['business-suite', 'clients', contractorId] as const,
  marketing: (contractorId: string) =>
    ['business-suite', 'marketing', contractorId] as const,
  invoices: (contractorId: string, status?: string) =>
    ['business-suite', 'invoices', contractorId, status] as const,
  expenses: (contractorId: string, period?: string) =>
    ['business-suite', 'expenses', contractorId, period] as const,
  schedule: (contractorId: string, date?: string) =>
    ['business-suite', 'schedule', contractorId, date] as const,
  inventory: (contractorId: string) =>
    ['business-suite', 'inventory', contractorId] as const,
  campaigns: (contractorId: string) =>
    ['business-suite', 'campaigns', contractorId] as const,
  goals: (contractorId: string) =>
    ['business-suite', 'goals', contractorId] as const,
};

// Hook for business metrics and analytics
export const useBusinessMetrics = (
  contractorId: string,
  periodStart?: string,
  periodEnd?: string,
  autoRefresh: boolean = false
) => {
  const queryClient = useQueryClient();

  const metricsQuery = useQuery({
    queryKey: BUSINESS_SUITE_KEYS.metrics(
      contractorId,
      `${periodStart}-${periodEnd}`
    ),
    queryFn: async () => {
      const start =
        periodStart ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = periodEnd || new Date().toISOString();
      return await contractorBusinessSuite.calculateBusinessMetrics(
        contractorId,
        start,
        end
      );
    },
    enabled: Boolean(contractorId),
    staleTime: autoRefresh ? 5 * 60 * 1000 : 30 * 60 * 1000, // 5 min or 30 min
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : undefined, // Auto-refresh if enabled
  });

  const refreshMetrics = useMutation({
    mutationFn: async () => {
      const start =
        periodStart ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = periodEnd || new Date().toISOString();
      return await contractorBusinessSuite.calculateBusinessMetrics(
        contractorId,
        start,
        end
      );
    },
    onSuccess: (newMetrics) => {
      queryClient.setQueryData(
        BUSINESS_SUITE_KEYS.metrics(
          contractorId,
          `${periodStart}-${periodEnd}`
        ),
        newMetrics
      );
      logger.info('Business metrics refreshed', { contractorId });
    },
    onError: (error) => {
      logger.error('Failed to refresh business metrics', error);
    },
  });

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
    refresh: refreshMetrics.mutate,
    isRefreshing: refreshMetrics.isPending,
  };
};

// Hook for financial summary and management
export const useFinancialSummary = (contractorId: string) => {
  return useQuery({
    queryKey: BUSINESS_SUITE_KEYS.financial(contractorId),
    queryFn: async () =>
      await contractorBusinessSuite.getFinancialSummary(contractorId),
    enabled: Boolean(contractorId),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Hook for client analytics and CRM
export const useClientAnalytics = (contractorId: string) => {
  return useQuery({
    queryKey: BUSINESS_SUITE_KEYS.clients(contractorId),
    queryFn: async () =>
      await contractorBusinessSuite.getClientAnalytics(contractorId),
    enabled: Boolean(contractorId),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook for invoice management
export const useInvoiceManagement = (contractorId: string) => {
  const queryClient = useQueryClient();

  const createInvoice = useMutation({
    mutationFn: async (invoiceData: {
      contractor_id: string;
      job_id?: string;
      client_id: string;
      line_items: {
        description: string;
        quantity: number;
        unit_price: number;
      }[];
      tax_rate?: number;
      payment_terms?: string;
      due_date?: string;
      notes?: string;
    }) => {
      return await contractorBusinessSuite.createInvoice(invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.invoices(contractorId),
      });
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.financial(contractorId),
      });
      logger.info('Invoice created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create invoice', error);
    },
  });

  const sendInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await contractorBusinessSuite.sendInvoice(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.invoices(contractorId),
      });
      logger.info('Invoice sent successfully');
    },
    onError: (error) => {
      logger.error('Failed to send invoice', error);
    },
  });

  return {
    createInvoice: createInvoice.mutate,
    isCreatingInvoice: createInvoice.isPending,
    sendInvoice: sendInvoice.mutate,
    isSendingInvoice: sendInvoice.isPending,
    createError: createInvoice.error,
    sendError: sendInvoice.error,
  };
};

// Hook for expense tracking
export const useExpenseTracking = (contractorId: string) => {
  const queryClient = useQueryClient();

  const recordExpense = useMutation({
    mutationFn: async (expenseData: {
      contractor_id: string;
      category: string;
      subcategory?: string;
      description: string;
      amount: number;
      expense_date: string;
      payment_method: string;
      receipt_url?: string;
      tax_deductible?: boolean;
      business_purpose?: string;
      mileage?: number;
    }) => {
      return await contractorBusinessSuite.recordExpense(expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.expenses(contractorId),
      });
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.financial(contractorId),
      });
      logger.info('Expense recorded successfully');
    },
    onError: (error) => {
      logger.error('Failed to record expense', error);
    },
  });

  return {
    recordExpense: recordExpense.mutate,
    isRecording: recordExpense.isPending,
    error: recordExpense.error,
  };
};

// Hook for schedule management
export const useScheduleManagement = (contractorId: string) => {
  const queryClient = useQueryClient();

  const updateAvailability = useMutation({
    mutationFn: async ({
      date,
      timeSlots,
    }: {
      date: string;
      timeSlots: ContractorSchedule['time_slots'];
    }) => {
      return await contractorBusinessSuite.updateScheduleAvailability(
        contractorId,
        date,
        timeSlots
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.schedule(contractorId),
      });
      logger.info('Schedule updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update schedule', error);
    },
  });

  return {
    updateAvailability: updateAvailability.mutate,
    isUpdating: updateAvailability.isPending,
    error: updateAvailability.error,
  };
};

// Hook for inventory management
export const useInventoryManagement = (contractorId: string) => {
  const queryClient = useQueryClient();

  const updateInventory = useMutation({
    mutationFn: async (inventoryUpdates: Partial<ResourceInventory>[]) => {
      return await contractorBusinessSuite.manageInventory(
        contractorId,
        inventoryUpdates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.inventory(contractorId),
      });
      logger.info('Inventory updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update inventory', error);
    },
  });

  return {
    updateInventory: updateInventory.mutate,
    isUpdating: updateInventory.isPending,
    error: updateInventory.error,
  };
};

// Hook for marketing campaigns
export const useMarketingCampaigns = (contractorId: string) => {
  const queryClient = useQueryClient();

  const createCampaign = useMutation({
    mutationFn: async (campaignData: Partial<MarketingCampaign>) => {
      return await contractorBusinessSuite.createMarketingCampaign(
        campaignData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.campaigns(contractorId),
      });
      logger.info('Marketing campaign created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create marketing campaign', error);
    },
  });

  return {
    createCampaign: createCampaign.mutate,
    isCreating: createCampaign.isPending,
    error: createCampaign.error,
  };
};

// Hook for CRM management
export const useCRMManagement = (contractorId: string) => {
  const queryClient = useQueryClient();

  const updateClient = useMutation({
    mutationFn: async (clientData: Partial<ClientCRM>) => {
      return await contractorBusinessSuite.updateClientCRM(clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.clients(contractorId),
      });
      logger.info('Client CRM updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update client CRM', error);
    },
  });

  return {
    updateClient: updateClient.mutate,
    isUpdating: updateClient.isPending,
    error: updateClient.error,
  };
};

// Hook for business goals tracking
export const useBusinessGoals = (contractorId: string) => {
  const queryClient = useQueryClient();

  const setGoals = useMutation({
    mutationFn: async (goals: Partial<BusinessGoal>[]) => {
      return await contractorBusinessSuite.setBusinessGoals(
        contractorId,
        goals
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUSINESS_SUITE_KEYS.goals(contractorId),
      });
      logger.info('Business goals updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to set business goals', error);
    },
  });

  return {
    setGoals: setGoals.mutate,
    isSetting: setGoals.isPending,
    error: setGoals.error,
  };
};

// Hook for business suite formatters and utilities
export const useBusinessSuiteFormatters = () => {
  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatBusinessMetrics = (metrics: BusinessMetrics) => {
    return {
      totalRevenue: formatCurrency(metrics.total_revenue),
      averageJobValue: formatCurrency(metrics.average_job_value),
      completionRate: formatPercentage(metrics.completion_rate),
      clientSatisfaction: `${metrics.client_satisfaction.toFixed(1)}/5.0`,
      repeatClientRate: formatPercentage(metrics.repeat_client_rate),
      responseTime: formatResponseTime(metrics.response_time_avg),
      quoteConversion: formatPercentage(metrics.quote_conversion_rate),
      profitMargin: formatPercentage(metrics.profit_margin),
    };
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPerformanceColor = (
    value: number,
    thresholds: {
      excellent: number;
      good: number;
      average: number;
    }
  ) => {
    if (value >= thresholds.excellent) return '#10B981'; // Green
    if (value >= thresholds.good) return '#84CC16'; // Lime
    if (value >= thresholds.average) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getBusinessInsights = (metrics: BusinessMetrics) => {
    const insights = [];

    if (metrics.completion_rate >= 90) {
      insights.push({
        type: 'success' as const,
        title: 'Excellent Completion Rate',
        message: `${metrics.completion_rate.toFixed(1)}% completion rate shows strong reliability`,
        icon: '✅',
      });
    } else if (metrics.completion_rate < 70) {
      insights.push({
        type: 'warning' as const,
        title: 'Completion Rate Needs Improvement',
        message: 'Focus on better project scoping and time management',
        icon: '⚠️',
      });
    }

    if (metrics.client_satisfaction >= 4.5) {
      insights.push({
        type: 'success' as const,
        title: 'Outstanding Client Satisfaction',
        message: 'Your clients love your work! Great for word-of-mouth growth.',
        icon: '⭐',
      });
    }

    if (metrics.repeat_client_rate >= 40) {
      insights.push({
        type: 'success' as const,
        title: 'Strong Client Loyalty',
        message: 'High repeat client rate indicates excellent service quality',
        icon: '🤝',
      });
    }

    if (metrics.profit_margin < 20) {
      insights.push({
        type: 'warning' as const,
        title: 'Low Profit Margin',
        message: 'Consider reviewing pricing strategy and expense management',
        icon: '💰',
      });
    }

    return insights;
  };

  const calculateGrowthTrend = (data: number[]) => {
    if (data.length < 2) return { trend: 'stable', percentage: 0 };

    const recent = data.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
    const previous = data.slice(-6, -3).reduce((sum, val) => sum + val, 0) / 3;

    if (previous === 0) return { trend: 'stable', percentage: 0 };

    const percentage = ((recent - previous) / previous) * 100;

    if (percentage > 10) return { trend: 'growing', percentage };
    if (percentage < -10) return { trend: 'declining', percentage };
    return { trend: 'stable', percentage };
  };

  const formatInvoiceStatus = (status: string) => {
    const statusMap = {
      draft: { label: 'Draft', color: '#6B7280' },
      sent: { label: 'Sent', color: '#3B82F6' },
      paid: { label: 'Paid', color: '#10B981' },
      overdue: { label: 'Overdue', color: '#EF4444' },
      cancelled: { label: 'Cancelled', color: '#6B7280' },
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.draft;
  };

  const getExpenseCategories = () => {
    return [
      {
        category: 'Materials',
        subcategories: ['Hardware', 'Paint', 'Electrical', 'Plumbing'],
      },
      {
        category: 'Transportation',
        subcategories: ['Fuel', 'Vehicle Maintenance', 'Parking', 'Tolls'],
      },
      {
        category: 'Equipment',
        subcategories: ['Tools', 'Safety Equipment', 'Rental Equipment'],
      },
      {
        category: 'Business',
        subcategories: [
          'Insurance',
          'Licenses',
          'Marketing',
          'Professional Services',
        ],
      },
      {
        category: 'Office',
        subcategories: ['Supplies', 'Software', 'Phone', 'Internet'],
      },
    ];
  };

  const calculateROI = (revenue: number, investment: number) => {
    if (investment === 0) return 0;
    return ((revenue - investment) / investment) * 100;
  };

  return {
    formatCurrency,
    formatPercentage,
    formatBusinessMetrics,
    formatResponseTime,
    getPerformanceColor,
    getBusinessInsights,
    calculateGrowthTrend,
    formatInvoiceStatus,
    getExpenseCategories,
    calculateROI,
  };
};

// Hook for business suite dashboard data
export const useBusinessDashboard = (contractorId: string) => {
  const currentMonth = new Date().toISOString().substring(0, 7);

  const { metrics, isLoading: metricsLoading } = useBusinessMetrics(
    contractorId,
    undefined,
    undefined,
    true
  );

  const { data: financialSummary, isLoading: financialLoading } =
    useFinancialSummary(contractorId);

  const { data: clientAnalytics, isLoading: clientsLoading } =
    useClientAnalytics(contractorId);

  const { getBusinessInsights, calculateGrowthTrend } =
    useBusinessSuiteFormatters();

  const dashboardData = {
    // Key Performance Indicators
    kpis: metrics
      ? {
          revenue: {
            current: metrics.total_revenue,
            trend: financialSummary
              ? calculateGrowthTrend(financialSummary.monthly_revenue)
              : null,
          },
          jobs: {
            completed: metrics.completed_jobs,
            total: metrics.total_jobs,
            completionRate: metrics.completion_rate,
          },
          satisfaction: {
            rating: metrics.client_satisfaction,
            trend: clientAnalytics?.client_satisfaction_trend.slice(-3) || [],
          },
          profitability: {
            margin: metrics.profit_margin,
            projection: financialSummary?.yearly_projection || 0,
          },
        }
      : null,

    // Business insights
    insights: metrics ? getBusinessInsights(metrics) : [],

    // Quick actions needed
    actionItems: [
      ...((financialSummary?.overdue_amount ?? 0) > 0
        ? [
            {
              type: 'urgent' as const,
              title: 'Overdue Invoices',
              description: `£${(financialSummary?.overdue_amount ?? 0).toFixed(2)} in overdue payments`,
              action: 'Follow up with clients',
            },
          ]
        : []),

      ...(metrics && metrics.response_time_avg > 120
        ? [
            {
              type: 'warning' as const,
              title: 'Slow Response Time',
              description: 'Average response time is over 2 hours',
              action: 'Improve response efficiency',
            },
          ]
        : []),
    ],

    // Data loading states
    isLoading: metricsLoading || financialLoading || clientsLoading,

    // Last updated timestamp
    lastUpdated: metrics?.updated_at || new Date().toISOString(),
  };

  return dashboardData;
};

// Utility functions
export const businessSuiteUtils = {
  generateInvoiceTemplate: () => {
    return {
      line_items: [{ description: '', quantity: 1, unit_price: 0 }],
      tax_rate: 0.2, // UK VAT
      payment_terms: '30 days',
      notes: '',
    };
  },

  getScheduleTemplates: () => {
    return {
      weekday: {
        morning: { start_time: '08:00', end_time: '12:00' },
        afternoon: { start_time: '13:00', end_time: '17:00' },
      },
      weekend: {
        morning: { start_time: '09:00', end_time: '13:00' },
      },
    };
  },

  validateBusinessGoal: (goal: Partial<BusinessGoal>) => {
    const errors = [];

    if (!goal.title?.trim()) errors.push('Goal title is required');
    if (!goal.target_value || goal.target_value <= 0)
      errors.push('Target value must be positive');
    if (!goal.target_date) errors.push('Target date is required');
    if (goal.target_date && new Date(goal.target_date) <= new Date()) {
      errors.push('Target date must be in the future');
    }

    return { isValid: errors.length === 0, errors };
  },

  calculateBusinessHealth: (
    metrics: BusinessMetrics,
    financialSummary: FinancialSummary
  ) => {
    const scores = {
      profitability: Math.min(100, (metrics.profit_margin / 40) * 100), // 40% is excellent
      efficiency: Math.min(100, (metrics.completion_rate / 95) * 100), // 95% is excellent
      growth: Math.min(
        100,
        Math.max(0, ((financialSummary.quarterly_growth + 20) / 40) * 100)
      ), // -20% to +20% range
      satisfaction: (metrics.client_satisfaction / 5) * 100,
      cashFlow:
        (financialSummary?.overdue_amount ?? 0) === 0
          ? 100
          : Math.max(
              0,
              100 - ((financialSummary?.overdue_amount ?? 0) / 1000) * 10
            ),
    };

    const overallScore =
      Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;

    return {
      overall: Math.round(overallScore),
      breakdown: scores,
      level:
        overallScore >= 80
          ? 'excellent'
          : overallScore >= 60
            ? 'good'
            : overallScore >= 40
              ? 'fair'
              : 'needs_improvement',
    };
  },
};
