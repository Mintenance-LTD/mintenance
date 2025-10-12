import React from 'react';
import { FinanceChart } from '../FinanceChart';
import { theme } from '../../theme';
import type { FinancialSummary } from '../../services/contractor-business';

interface ChartSectionProps {
  financialData: FinancialSummary;
  formatCurrency: (amount: number) => string;
}

export const ChartSection: React.FC<ChartSectionProps> = ({
  financialData,
  formatCurrency,
}) => {
  const getRevenueChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return {
      labels: months,
      datasets: [
        {
          data: financialData.monthly_revenue.slice(-6),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getProfitChartData = () => {
    return {
      labels: financialData.profit_trends.map((trend) =>
        trend.month.slice(0, 3)
      ),
      datasets: [
        {
          data: financialData.profit_trends.map((trend) => trend.profit),
          color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getCashFlowChartData = () => {
    return {
      labels: financialData.cash_flow_forecast
        .slice(0, 4)
        .map((flow) => `W${flow.week}`),
      datasets: [
        {
          data: financialData.cash_flow_forecast
            .slice(0, 4)
            .map((flow) => flow.net_flow),
          colors: financialData.cash_flow_forecast
            .slice(0, 4)
            .map((flow) =>
              flow.net_flow >= 0 ? theme.colors.success : theme.colors.error
            ),
        },
      ],
    };
  };

  const getExpenseBreakdownData = () => {
    // Mock expense categories data - would come from actual expense tracking
    return [
      {
        name: 'Materials',
        value: 45,
        color: theme.colors.info,
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Labor',
        value: 30,
        color: '#34C759',
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Transport',
        value: 15,
        color: '#FF9500',
        legendFontColor: theme.colors.textSecondary,
      },
      {
        name: 'Equipment',
        value: 10,
        color: '#FF3B30',
        legendFontColor: theme.colors.textSecondary,
      },
    ];
  };

  return (
    <>
      {/* Revenue Trend Chart */}
      <FinanceChart
        type='line'
        data={getRevenueChartData()}
        title='Revenue Trend'
        subtitle={`Last 6 months • ${formatCurrency(financialData.yearly_projection)} projected annually`}
        height={200}
      />

      {/* Profit Analysis Chart */}
      <FinanceChart
        type='bar'
        data={getProfitChartData()}
        title='Profit Analysis'
        subtitle='Monthly profit after expenses'
        height={200}
      />

      {/* Cash Flow Forecast */}
      <FinanceChart
        type='bar'
        data={getCashFlowChartData()}
        title='Cash Flow Forecast'
        subtitle='Next 4 weeks projection'
        height={180}
      />

      {/* Expense Breakdown */}
      <FinanceChart
        type='pie'
        data={getExpenseBreakdownData()}
        title='Expense Breakdown'
        subtitle='Current period distribution'
        height={200}
      />
    </>
  );
};
