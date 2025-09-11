import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { theme } from '../theme';

const screenWidth = Dimensions.get('window').width;

interface FinanceChartProps {
  type: 'line' | 'bar' | 'pie';
  data: any;
  title: string;
  subtitle?: string;
  height?: number;
}

export const FinanceChart: React.FC<FinanceChartProps> = ({
  type,
  data,
  title,
  subtitle,
  height = 220
}) => {
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#ffffff',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.borderLight,
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
            data={data}
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
            data={data}
            width={chartWidth}
            height={height}
            chartConfig={chartConfig}
            yAxisLabel=""
            yAxisSuffix=""
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
              data={data}
              width={chartWidth}
              height={height}
              chartConfig={pieChartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
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
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chart: {
    marginVertical: 8,
    borderRadius: theme.borderRadius.base,
  },
  pieContainer: {
    alignItems: 'center',
  },
});
