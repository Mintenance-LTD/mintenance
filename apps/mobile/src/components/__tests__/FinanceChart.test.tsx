import React from 'react';
import { render } from '@testing-library/react-native';
import { FinanceChart } from '../FinanceChart';

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));

// Mock theme
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      background: '#FFFFFF',
      borderLight: '#E5E7EB',
      textSecondary: '#6B7280',
      textPrimary: '#111827',
    },
    borderRadius: {
      base: 8,
      lg: 12,
    },
    shadows: {
      base: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    },
  },
}));

describe('FinanceChart', () => {
  const mockLineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
      },
    ],
  };

  const mockBarData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        data: [50, 75, 60, 90],
      },
    ],
  };

  const mockPieData = [
    {
      name: 'Materials',
      value: 45,
      color: 'rgba(131, 167, 234, 1)',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Labor',
      value: 35,
      color: '#F00',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Equipment',
      value: 20,
      color: 'rgb(0, 0, 255)',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render successfully with required props', () => {
      const { getByText } = render(
        <FinanceChart type="line" data={mockLineData} title="Revenue Trend" />
      );

      expect(getByText('Revenue Trend')).toBeTruthy();
    });

    it('should render without subtitle when not provided', () => {
      const { queryByText } = render(
        <FinanceChart type="line" data={mockLineData} title="Revenue Trend" />
      );

      expect(queryByText(/subtitle/i)).toBeNull();
    });

    it('should render with subtitle when provided', () => {
      const { getByText } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Revenue Trend"
          subtitle="Monthly Performance"
        />
      );

      expect(getByText('Revenue Trend')).toBeTruthy();
      expect(getByText('Monthly Performance')).toBeTruthy();
    });

    it('should render with custom height when provided', () => {
      const { toJSON } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Revenue Trend"
          height={300}
        />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with default height when not provided', () => {
      const { toJSON } = render(
        <FinanceChart type="line" data={mockLineData} title="Revenue Trend" />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render title text correctly', () => {
      const { getByText } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Test Chart Title"
        />
      );

      const titleElement = getByText('Test Chart Title');
      expect(titleElement).toBeTruthy();
    });

    it('should render subtitle text correctly', () => {
      const { getByText } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Test Chart"
          subtitle="Test Subtitle"
        />
      );

      const subtitleElement = getByText('Test Subtitle');
      expect(subtitleElement).toBeTruthy();
    });
  });

  describe('LineChart Rendering', () => {
    it('should render LineChart when type is "line"', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      expect(UNSAFE_getByType('LineChart')).toBeTruthy();
    });

    it('should render LineChart with correct data prop', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.data).toEqual(mockLineData);
    });

    it('should render LineChart with bezier curve enabled', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.bezier).toBe(true);
    });

    it('should render LineChart with dots enabled', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.withDots).toBe(true);
    });

    it('should render LineChart without shadow', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.withShadow).toBe(false);
    });

    it('should render LineChart with vertical labels', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.withVerticalLabels).toBe(true);
    });

    it('should render LineChart with horizontal labels', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.withHorizontalLabels).toBe(true);
    });

    it('should render LineChart starting from zero', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.fromZero).toBe(true);
    });

    it('should render LineChart with custom height', () => {
      const customHeight = 250;
      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Line Chart"
          height={customHeight}
        />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.height).toBe(customHeight);
    });

    it('should render LineChart with default height when not specified', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.height).toBe(220);
    });
  });

  describe('BarChart Rendering', () => {
    it('should render BarChart when type is "bar"', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      expect(UNSAFE_getByType('BarChart')).toBeTruthy();
    });

    it('should render BarChart with correct data prop', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.data).toEqual(mockBarData);
    });

    it('should render BarChart with empty yAxisLabel', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.yAxisLabel).toBe('');
    });

    it('should render BarChart with empty yAxisSuffix', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.yAxisSuffix).toBe('');
    });

    it('should render BarChart with vertical labels', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.withVerticalLabels).toBe(true);
    });

    it('should render BarChart with horizontal labels', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.withHorizontalLabels).toBe(true);
    });

    it('should render BarChart starting from zero', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.fromZero).toBe(true);
    });

    it('should render BarChart without bar tops', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.showBarTops).toBe(false);
    });

    it('should render BarChart with custom height', () => {
      const customHeight = 300;
      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="bar"
          data={mockBarData}
          title="Bar Chart"
          height={customHeight}
        />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.height).toBe(customHeight);
    });
  });

  describe('PieChart Rendering', () => {
    it('should render PieChart when type is "pie"', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      expect(UNSAFE_getByType('PieChart')).toBeTruthy();
    });

    it('should render PieChart with correct data prop', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.data).toEqual(mockPieData);
    });

    it('should render PieChart with value accessor', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.accessor).toBe('value');
    });

    it('should render PieChart with transparent background', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.backgroundColor).toBe('transparent');
    });

    it('should render PieChart with padding left', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.paddingLeft).toBe('15');
    });

    it('should render PieChart with legend enabled', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.hasLegend).toBe(true);
    });

    it('should render PieChart with custom height', () => {
      const customHeight = 250;
      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="pie"
          data={mockPieData}
          title="Pie Chart"
          height={customHeight}
        />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.height).toBe(customHeight);
    });
  });

  describe('Chart Type Switching', () => {
    it('should not render BarChart when type is "line"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      expect(UNSAFE_queryByType('BarChart')).toBeNull();
    });

    it('should not render PieChart when type is "line"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      expect(UNSAFE_queryByType('PieChart')).toBeNull();
    });

    it('should not render LineChart when type is "bar"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      expect(UNSAFE_queryByType('LineChart')).toBeNull();
    });

    it('should not render PieChart when type is "bar"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      expect(UNSAFE_queryByType('PieChart')).toBeNull();
    });

    it('should not render LineChart when type is "pie"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      expect(UNSAFE_queryByType('LineChart')).toBeNull();
    });

    it('should not render BarChart when type is "pie"', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      expect(UNSAFE_queryByType('BarChart')).toBeNull();
    });
  });

  describe('Chart Configuration', () => {
    it('should pass chart config to LineChart', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.chartConfig).toBeDefined();
      expect(lineChart.props.chartConfig.strokeWidth).toBe(2);
      expect(lineChart.props.chartConfig.barPercentage).toBe(0.7);
      expect(lineChart.props.chartConfig.decimalPlaces).toBe(0);
    });

    it('should pass chart config to BarChart', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="bar" data={mockBarData} title="Bar Chart" />
      );

      const barChart = UNSAFE_getByType('BarChart');
      expect(barChart.props.chartConfig).toBeDefined();
      expect(barChart.props.chartConfig.strokeWidth).toBe(2);
      expect(barChart.props.chartConfig.barPercentage).toBe(0.7);
      expect(barChart.props.chartConfig.decimalPlaces).toBe(0);
    });

    it('should pass pie chart config to PieChart', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Pie Chart" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      expect(pieChart.props.chartConfig).toBeDefined();
      expect(pieChart.props.chartConfig.strokeWidth).toBe(2);
      expect(pieChart.props.chartConfig.barPercentage).toBe(0.5);
      expect(pieChart.props.chartConfig.decimalPlaces).toBe(0);
    });

    it('should configure chart with correct color function', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.chartConfig.color).toBeInstanceOf(Function);
    });

    it('should configure chart with background gradient properties', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(
        lineChart.props.chartConfig.backgroundGradientFrom
      ).toBe('#ffffff');
      expect(
        lineChart.props.chartConfig.backgroundGradientFromOpacity
      ).toBe(0);
      expect(lineChart.props.chartConfig.backgroundGradientTo).toBe('#ffffff');
      expect(lineChart.props.chartConfig.backgroundGradientToOpacity).toBe(0);
    });

    it('should configure chart with props for background lines', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(
        lineChart.props.chartConfig.propsForBackgroundLines
      ).toBeDefined();
      expect(
        lineChart.props.chartConfig.propsForBackgroundLines.strokeDasharray
      ).toBe('');
      expect(
        lineChart.props.chartConfig.propsForBackgroundLines.strokeOpacity
      ).toBe(0.3);
    });

    it('should configure chart with props for labels', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Line Chart" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.chartConfig.propsForLabels).toBeDefined();
      expect(lineChart.props.chartConfig.propsForLabels.fontSize).toBe(12);
      expect(lineChart.props.chartConfig.propsForLabels.fontFamily).toBe(
        'System'
      );
    });
  });

  describe('Data Visualization', () => {
    it('should render with empty line data', () => {
      const emptyLineData = {
        labels: [],
        datasets: [{ data: [] }],
      };

      const { getByText } = render(
        <FinanceChart type="line" data={emptyLineData} title="Empty Chart" />
      );

      expect(getByText('Empty Chart')).toBeTruthy();
    });

    it('should render with empty bar data', () => {
      const emptyBarData = {
        labels: [],
        datasets: [{ data: [] }],
      };

      const { getByText } = render(
        <FinanceChart type="bar" data={emptyBarData} title="Empty Chart" />
      );

      expect(getByText('Empty Chart')).toBeTruthy();
    });

    it('should render with empty pie data', () => {
      const emptyPieData: any[] = [];

      const { getByText } = render(
        <FinanceChart type="pie" data={emptyPieData} title="Empty Chart" />
      );

      expect(getByText('Empty Chart')).toBeTruthy();
    });

    it('should render with single data point in line chart', () => {
      const singlePointData = {
        labels: ['Jan'],
        datasets: [{ data: [100] }],
      };

      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="line"
          data={singlePointData}
          title="Single Point"
        />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.data).toEqual(singlePointData);
    });

    it('should render with multiple datasets in line chart', () => {
      const multiDatasetData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [
          { data: [20, 45, 28] },
          { data: [10, 30, 50] },
        ],
      };

      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="line"
          data={multiDatasetData}
          title="Multi Dataset"
        />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.data).toEqual(multiDatasetData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle =
        'This is a very long title that should still render correctly without breaking the layout';

      const { getByText } = render(
        <FinanceChart type="line" data={mockLineData} title={longTitle} />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle very long subtitles', () => {
      const longSubtitle =
        'This is a very long subtitle with lots of descriptive text that explains the chart';

      const { getByText } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Chart"
          subtitle={longSubtitle}
        />
      );

      expect(getByText(longSubtitle)).toBeTruthy();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Revenue & Expenses (2024) - Q1/Q2';

      const { getByText } = render(
        <FinanceChart type="line" data={mockLineData} title={specialTitle} />
      );

      expect(getByText(specialTitle)).toBeTruthy();
    });

    it('should handle zero height prop', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Chart"
          height={0}
        />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.height).toBe(0);
    });

    it('should handle very large height values', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Chart"
          height={1000}
        />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      expect(lineChart.props.height).toBe(1000);
    });
  });

  describe('Component Structure', () => {
    it('should render header section', () => {
      const { getByText } = render(
        <FinanceChart type="line" data={mockLineData} title="Test Chart" />
      );

      expect(getByText('Test Chart')).toBeTruthy();
    });

    it('should render chart section', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Test Chart" />
      );

      expect(UNSAFE_getByType('LineChart')).toBeTruthy();
    });

    it('should render pie chart inside container', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Test Chart" />
      );

      expect(UNSAFE_getByType('PieChart')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should accept all valid chart types', () => {
      const types: Array<'line' | 'bar' | 'pie'> = ['line', 'bar', 'pie'];

      types.forEach((type) => {
        const data = type === 'pie' ? mockPieData : mockLineData;
        const { getByText } = render(
          <FinanceChart type={type} data={data} title={`${type} Chart`} />
        );

        expect(getByText(`${type} Chart`)).toBeTruthy();
      });
    });

    it('should render with minimal required props', () => {
      const { getByText } = render(
        <FinanceChart type="line" data={mockLineData} title="Minimal" />
      );

      expect(getByText('Minimal')).toBeTruthy();
    });

    it('should render with all optional props', () => {
      const { getByText } = render(
        <FinanceChart
          type="line"
          data={mockLineData}
          title="Full Props"
          subtitle="All optional props included"
          height={280}
        />
      );

      expect(getByText('Full Props')).toBeTruthy();
      expect(getByText('All optional props included')).toBeTruthy();
    });
  });

  describe('Color Function Coverage', () => {
    it('should call chartConfig color function with default opacity', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Test" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      const colorFn = lineChart.props.chartConfig.color;
      const result = colorFn();
      expect(result).toBe('rgba(0, 122, 255, 1)');
    });

    it('should call chartConfig color function with custom opacity', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="line" data={mockLineData} title="Test" />
      );

      const lineChart = UNSAFE_getByType('LineChart');
      const colorFn = lineChart.props.chartConfig.color;
      const result = colorFn(0.75);
      expect(result).toBe('rgba(0, 122, 255, 0.75)');
    });

    it('should call pieChartConfig color function with default opacity', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Test" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      const colorFn = pieChart.props.chartConfig.color;
      const result = colorFn();
      expect(result).toBe('rgba(255, 255, 255, 1)');
    });

    it('should call pieChartConfig color function with custom opacity', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Test" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      const colorFn = pieChart.props.chartConfig.color;
      const result = colorFn(0.5);
      expect(result).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('should call pieChartConfig color function with zero opacity', () => {
      const { UNSAFE_getByType } = render(
        <FinanceChart type="pie" data={mockPieData} title="Test" />
      );

      const pieChart = UNSAFE_getByType('PieChart');
      const colorFn = pieChart.props.chartConfig.color;
      const result = colorFn(0);
      expect(result).toBe('rgba(255, 255, 255, 0)');
    });
  });

  describe('Default Case Coverage', () => {
    it('should render null for invalid chart type', () => {
      const { UNSAFE_queryByType } = render(
        <FinanceChart
          type={'invalid' as any}
          data={mockLineData}
          title="Invalid Type"
        />
      );

      expect(UNSAFE_queryByType('LineChart')).toBeNull();
      expect(UNSAFE_queryByType('BarChart')).toBeNull();
      expect(UNSAFE_queryByType('PieChart')).toBeNull();
    });

    it('should still render title with invalid chart type', () => {
      const { getByText } = render(
        <FinanceChart
          type={'invalid' as any}
          data={mockLineData}
          title="Invalid Type"
        />
      );

      expect(getByText('Invalid Type')).toBeTruthy();
    });
  });
});
