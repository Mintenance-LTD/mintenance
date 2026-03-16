import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
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
    backgroundGradientFrom: theme.colors.textInverse,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: theme.colors.textInverse,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border,
      strokeOpacity: 0.3,
    },
    propsForLabels: {
      fontSize: 12,
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

  const hasHeader = title.length > 0;

  return (
    <View style={hasHeader ? styles.container : styles.containerFlat}>
      {hasHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {renderChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  containerFlat: {
    marginTop: 4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  pieContainer: {
    alignItems: 'center',
  },
});
