/** Business Dashboard, Formatters, and Utilities */
import { contractorBusinessSuite, BusinessMetrics, FinancialSummary, BusinessGoal } from "../../services/contractor-business";
import { useI18n } from "../useI18n";
import { useBusinessMetrics, useFinancialSummary } from "./useBusinessMetrics";
import { useClientAnalytics } from "./useClients";

export const useBusinessSuiteFormatters = () => {
  const { formatters } = useI18n();
  const formatCurrency = (amount: number, currency?: string) => formatters.currency(amount, currency);
  const formatPercentage = (value: number, decimals = 1) => value.toFixed(decimals)+"%";
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return Math.round(minutes)+"m";
    const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60);
    return m > 0 ? h+"h "+m+"m" : h+"h";
  };
  const formatBusinessMetrics = (metrics: BusinessMetrics) => ({
    totalRevenue: formatCurrency(metrics.total_revenue),
    averageJobValue: formatCurrency(metrics.average_job_value),
    completionRate: formatPercentage(metrics.completion_rate),
    clientSatisfaction: metrics.client_satisfaction.toFixed(1)+"/5.0",
    repeatClientRate: formatPercentage(metrics.repeat_client_rate),
    responseTime: formatResponseTime(metrics.response_time_avg),
    quoteConversion: formatPercentage(metrics.quote_conversion_rate),
    profitMargin: formatPercentage(metrics.profit_margin),
  });
  const getPerformanceColor = (value: number, thresholds: { excellent: number; good: number; average: number }) => {
    if (value >= thresholds.excellent) return "#10B981";
    if (value >= thresholds.good) return "#84CC16";
    if (value >= thresholds.average) return "#F59E0B";
    return "#EF4444";
  };
  const getBusinessInsights = (metrics: BusinessMetrics) => {
    const insights: Array<{ type: "success"|"warning"; title: string; message: string; icon: string }> = [];
    if (metrics.completion_rate >= 90) insights.push({ type: "success", title: "Excellent Completion Rate", message: metrics.completion_rate.toFixed(1)+"% completion rate", icon: "OK" });
    else if (metrics.completion_rate < 70) insights.push({ type: "warning", title: "Completion Rate Needs Improvement", message: "Focus on better project scoping", icon: "WARN" });
    if (metrics.client_satisfaction >= 4.5) insights.push({ type: "success", title: "Outstanding Client Satisfaction", message: "Your clients love your work!", icon: "STAR" });
    if (metrics.repeat_client_rate >= 40) insights.push({ type: "success", title: "Strong Client Loyalty", message: "High repeat client rate", icon: "OK" });
    if (metrics.profit_margin < 20) insights.push({ type: "warning", title: "Low Profit Margin", message: "Review pricing strategy", icon: "MONEY" });
    return insights;
  };
  const calculateGrowthTrend = (data: number[]) => {
    if (data.length < 2) return { trend: "stable", percentage: 0 };
    const recent = data.slice(-3).reduce((s, v) => s+v, 0) / 3;
    const previous = data.slice(-6, -3).reduce((s, v) => s+v, 0) / 3;
    if (previous === 0) return { trend: "stable", percentage: 0 };
    const percentage = ((recent - previous) / previous) * 100;
    if (percentage > 10) return { trend: "growing", percentage };
    if (percentage < -10) return { trend: "declining", percentage };
    return { trend: "stable", percentage };
  };
  const formatInvoiceStatus = (status: string) => {
    const m: Record<string,{ label: string; color: string }> = { draft: { label: "Draft", color: "#6B7280" }, sent: { label: "Sent", color: "#3B82F6" }, paid: { label: "Paid", color: "#10B981" }, overdue: { label: "Overdue", color: "#EF4444" }, cancelled: { label: "Cancelled", color: "#6B7280" } };
    return m[status] || m.draft;
  };
  const getExpenseCategories = () => [
    { category: "Materials", subcategories: ["Hardware","Paint","Electrical","Plumbing"] },
    { category: "Transportation", subcategories: ["Fuel","Vehicle Maintenance","Parking","Tolls"] },
    { category: "Equipment", subcategories: ["Tools","Safety Equipment","Rental Equipment"] },
    { category: "Business", subcategories: ["Insurance","Licenses","Marketing","Professional Services"] },
    { category: "Office", subcategories: ["Supplies","Software","Phone","Internet"] },
  ];
  const calculateROI = (revenue: number, investment: number) => investment === 0 ? 0 : ((revenue-investment)/investment)*100;
  return { formatCurrency, formatPercentage, formatBusinessMetrics, formatResponseTime, getPerformanceColor, getBusinessInsights, calculateGrowthTrend, formatInvoiceStatus, getExpenseCategories, calculateROI };
};
export const useBusinessDashboard = (contractorId: string) => {
  const { metrics, isLoading: metricsLoading } = useBusinessMetrics(contractorId, undefined, undefined, true);
  const { data: financialSummary, isLoading: financialLoading } = useFinancialSummary(contractorId);
  const { data: clientAnalytics, isLoading: clientsLoading } = useClientAnalytics(contractorId);
  const { getBusinessInsights, calculateGrowthTrend } = useBusinessSuiteFormatters();
  const kpis = metrics ? {
    revenue: { current: metrics.total_revenue, trend: financialSummary ? calculateGrowthTrend(financialSummary.monthlyRevenue) : null },
    jobs: { completed: metrics.completed_jobs, total: metrics.total_jobs, completionRate: metrics.completion_rate },
    satisfaction: { rating: metrics.client_satisfaction, trend: clientAnalytics?.trends?.satisfactionTrend.slice(-3) || [] },
    profitability: { margin: metrics.profit_margin, projection: financialSummary?.yearlyProjection || 0 },
  } : null;
  const actionItems = [
    ...((financialSummary?.overdueAmount ?? 0) > 0 ? [{ type: "urgent" as const, title: "Overdue Invoices", description: "Overdue payments", action: "Follow up with clients" }] : []),
    ...(metrics && metrics.response_time_avg > 120 ? [{ type: "warning" as const, title: "Slow Response Time", description: "Average response time over 2 hours", action: "Improve response efficiency" }] : []),
  ];
  return { kpis, insights: metrics ? getBusinessInsights(metrics) : [], actionItems, isLoading: metricsLoading || financialLoading || clientsLoading, lastUpdated: metrics?.updated_at || new Date().toISOString() };
};
export const businessSuiteUtils = {
  generateInvoiceTemplate: () => ({ line_items: [{ description: "", quantity: 1, unit_price: 0 }], tax_rate: 0.2, payment_terms: "30 days", notes: "" }),
  getScheduleTemplates: () => ({ weekday: { morning: { start_time: "08:00", end_time: "12:00" }, afternoon: { start_time: "13:00", end_time: "17:00" } }, weekend: { morning: { start_time: "09:00", end_time: "13:00" } } }),
  validateBusinessGoal: (goal: Partial<BusinessGoal>) => {
    const errors: string[] = [];
    if (!goal.title?.trim()) errors.push("Goal title is required");
    if (!goal.target_value || goal.target_value <= 0) errors.push("Target value must be positive");
    if (!goal.target_date) errors.push("Target date is required");
    if (goal.target_date && new Date(goal.target_date) <= new Date()) errors.push("Target date must be in the future");
    return { isValid: errors.length === 0, errors };
  },
  calculateBusinessHealth: (metrics: BusinessMetrics, financialSummary: FinancialSummary) => {
    const scores = {
      profitability: Math.min(100, (metrics.profit_margin / 40) * 100),
      efficiency: Math.min(100, (metrics.completion_rate / 95) * 100),
      growth: Math.min(100, Math.max(0, ((financialSummary.quarterly_growth + 20) / 40) * 100)),
      satisfaction: (metrics.client_satisfaction / 5) * 100,
      cashFlow: (financialSummary?.overdue_amount ?? 0) === 0 ? 100 : Math.max(0, 100 - ((financialSummary?.overdue_amount ?? 0) / 1000) * 10),
    };
    const overallScore = Object.values(scores).reduce((s, sc) => s + sc, 0) / 5;
    return { overall: Math.round(overallScore), breakdown: scores, level: overallScore >= 80 ? "excellent" : overallScore >= 60 ? "good" : overallScore >= 40 ? "fair" : "needs_improvement" };
  },
};
