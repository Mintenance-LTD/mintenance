import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { theme } from '../theme';

const screenWidth = Dimensions.get('window').width;

interface ChartDataset {
  labels: string[];
  datasets: { data: number[]; color?: (opacity?: number) => string; strokeWidth?: number; colors?: ((opacity: number) => string)[] }[];
}

interface PieDataItem {
  name: string;
  value?: number;
  population?: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

interface FinanceChartProps {
  type: 'line' | 'bar' | 'pie';
  data: ChartDataset | PieDataItem[];
  title: string;
  subtitle?: string;
  height?: number;
}

export const FinanceChart: React.FC<FinanceChartProps> = ({
  type,
  data,
  title,
  subtitle,
  height = 220,
}) => {
  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: theme.colors.surface,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.borderLight,
      strokeOpacity: 0.3,
    },
    propsForLabels: {
      fontSize: theme.typography.rawFontSize.xs,
      fontFamily: 'System',
      fill: theme.colors.textSecondary,
    },
  };

  const pieChartConfig = {
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
  };

  const renderChart = () => {
    const chartWidth = screenWidth - 48; // Account for padding

    switch (type) {
      case 'line':
        return (
          <LineChart
            data={data as ChartDataset}
            width={chartWidth}
            height={height}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero
          />
        );

      case 'bar':
        return (
          <BarChart
            data={data as ChartDataset}
            width={chartWidth}
            height={height}
            chartConfig={chartConfig}
            yAxisLabel=''
            yAxisSuffix=''
            style={styles.chart}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero
            showBarTops={false}
          />
        );

      case 'pie':
        return (
          <View style={styles.pieContainer}>
            <PieChart
              data={data as PieDataItem[]}
              width={chartWidth}
              height={height}
              chartConfig={pieChartConfig}
              accessor='value'
              backgroundColor='transparent'
              paddingLeft='15'
              hasLegend={true}
              style={styles.chart}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {renderChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.base,
  },
  header: {
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  chart: {
    marginVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
  },
  pieContainer: {
    alignItems: 'center',
  },
});
