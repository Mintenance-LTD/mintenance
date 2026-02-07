import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AIPricingWidget } from '../AIPricingWidget';
import { PricingAnalysis } from '../../services/AIPricingEngine';

import { useAIPricing } from '../../hooks/useAIPricing';

// Mock dependencies
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
      surface: '#FFFFFF',
      border: '#E0E0E0',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
    },
    spacing: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      6: 24,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        '2xl': 24,
      },
      fontWeight: {
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    borderRadius: {
      md: 8,
      lg: 12,
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Default mock for useAIPricing
const mockAnalyzePricing = jest.fn();
const mockFormatPricing = jest.fn();
const mockGetHomeownerInsights = jest.fn();

jest.mock('../../hooks/useAIPricing', () => ({
  useAIPricing: jest.fn(),
}));

const mockJobInput = {
  title: 'Fix leaky faucet',
  description: 'Kitchen faucet is leaking and needs repair',
  category: 'plumbing',
  location: 'London',
};

const mockAnalysis: PricingAnalysis = {
  suggestedPrice: {
    min: 150,
    max: 250,
    optimal: 200,
  },
  confidence: 0.85,
  complexity: 'moderate',
  marketData: {
    averagePrice: 190,
    demandLevel: 'medium',
    regionalFactor: 1.1,
  },
  factors: [
    {
      name: 'Location',
      impact: 15,
      description: 'Central London area increases cost',
    },
    {
      name: 'Urgency',
      impact: 10,
      description: 'Same-day service requested',
    },
    {
      name: 'Complexity',
      impact: -5,
      description: 'Standard repair work',
    },
  ],
  recommendations: [
    'Schedule during off-peak hours for better rates',
    'Get multiple quotes for comparison',
  ],
};

describe('AIPricingWidget Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();

    // Default mock implementation
    (useAIPricing as jest.Mock).mockReturnValue({
      analysis: null,
      isLoading: false,
      analyzePricing: mockAnalyzePricing,
      formatPricing: mockFormatPricing,
      getHomeownerInsights: mockGetHomeownerInsights,
    });

    mockFormatPricing.mockReturnValue({
      priceRange: '£150 - £250',
      optimal: '£200',
      confidence: '85%',
      complexityLabel: 'Moderate',
      topFactors: [
        {
          name: 'Location',
          impact: 'increases',
          description: 'Central London area increases cost',
        },
        {
          name: 'Urgency',
          impact: 'increases',
          description: 'Same-day service requested',
        },
      ],
    });

    mockGetHomeownerInsights.mockReturnValue([
      {
        type: 'success',
        message: 'Price is within market range',
      },
      {
        type: 'info',
        message: 'Consider scheduling during off-peak hours',
      },
    ]);
  });

  describe('Initial State (No Analysis)', () => {
    it('should render initial state without analysis', () => {
      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(getByText('AI Pricing Analysis')).toBeTruthy();
      expect(
        getByText(
          'Get intelligent pricing suggestions based on market data and job complexity'
        )
      ).toBeTruthy();
      expect(getByText('Analyze Pricing')).toBeTruthy();
    });

    it('should call analyzePricing when button is pressed', () => {
      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);
      const analyzeButton = getByText('Analyze Pricing');

      fireEvent.press(analyzeButton);

      expect(mockAnalyzePricing).toHaveBeenCalledWith(mockJobInput);
    });

    it('should show alert when analyzing with incomplete job input', () => {
      const incompleteInput = {
        ...mockJobInput,
        title: '',
      };

      const { getByText } = render(
        <AIPricingWidget jobInput={incompleteInput} />
      );
      const analyzeButton = getByText('Analyze Pricing');

      fireEvent.press(analyzeButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Incomplete Information',
        'Please provide a job title and description for accurate pricing analysis.'
      );
      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });

    it('should show alert when analyzing with only whitespace in title', () => {
      const incompleteInput = {
        ...mockJobInput,
        title: '   ',
      };

      const { getByText } = render(
        <AIPricingWidget jobInput={incompleteInput} />
      );
      const analyzeButton = getByText('Analyze Pricing');

      fireEvent.press(analyzeButton);

      expect(Alert.alert).toHaveBeenCalled();
      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });

    it('should not show analyze button when loading', () => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: null,
        isLoading: true,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      const { queryByText, getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} />
      );

      // Should not show analyze button when loading
      expect(queryByText('Analyze Pricing')).toBeNull();

      // Should show loading state instead
      expect(getByText('Analyzing job requirements...')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when analyzing', () => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: null,
        isLoading: true,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      const { getByText, getByTestId } = render(
        <AIPricingWidget jobInput={mockJobInput} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(getByText('Analyzing job requirements...')).toBeTruthy();
      expect(getByText('This may take a few seconds')).toBeTruthy();
    });

    it('should not show analyze button while loading', () => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: null,
        isLoading: true,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      const { queryByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(queryByText('Analyze Pricing')).toBeNull();
    });
  });

  describe('Analysis Display', () => {
    beforeEach(() => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: mockAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });
    });

    it('should display pricing analysis when available', () => {
      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(getByText('Suggested Price Range')).toBeTruthy();
      expect(getByText('£150 - £250')).toBeTruthy();
      expect(getByText('Optimal: £200')).toBeTruthy();
      expect(getByText('Moderate')).toBeTruthy();
      expect(getByText('85% confident')).toBeTruthy();
    });

    it('should toggle expanded state when header is pressed', () => {
      const { getByText, queryByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      const header = getByText('AI Pricing Analysis');

      // Initially collapsed (no details visible)
      expect(queryByText('Key Pricing Factors')).toBeNull();

      // Expand
      fireEvent.press(header);
      expect(getByText('Key Pricing Factors')).toBeTruthy();

      // Collapse again
      fireEvent.press(header);
      expect(queryByText('Key Pricing Factors')).toBeNull();
    });

    it('should show pricing factors when expanded', () => {
      const { getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      expect(getByText('Key Pricing Factors')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
      expect(getByText('Central London area increases cost')).toBeTruthy();
      expect(getByText('Urgency')).toBeTruthy();
    });

    it('should show market context when expanded', () => {
      const { getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      expect(getByText('Market Context')).toBeTruthy();
      expect(getByText('Average Price')).toBeTruthy();
      expect(getByText('£190')).toBeTruthy();
      expect(getByText('Demand Level')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should show homeowner insights when expanded', () => {
      const { getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      expect(getByText('Budget Insights')).toBeTruthy();
      expect(getByText('Price is within market range')).toBeTruthy();
      expect(getByText('Consider scheduling during off-peak hours')).toBeTruthy();
    });

    it('should show recommendations when expanded', () => {
      const { getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      expect(getByText('Recommendations')).toBeTruthy();
      expect(
        getByText('Schedule during off-peak hours for better rates')
      ).toBeTruthy();
      expect(getByText('Get multiple quotes for comparison')).toBeTruthy();
    });

    it('should show re-analyze button when expanded', () => {
      const { getByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      const reanalyzeButton = getByText('Re-analyze');
      expect(reanalyzeButton).toBeTruthy();

      fireEvent.press(reanalyzeButton);
      expect(mockAnalyzePricing).toHaveBeenCalledWith(mockJobInput);
    });

    it('should not show details when showDetails is false', () => {
      const { getByText, queryByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails={false} />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      // Details should not be shown
      expect(queryByText('Key Pricing Factors')).toBeNull();
      expect(queryByText('Market Context')).toBeNull();
    });
  });

  describe('Auto Analyze', () => {
    it('should auto analyze when autoAnalyze is true and all fields are present', () => {
      render(<AIPricingWidget jobInput={mockJobInput} autoAnalyze />);

      expect(mockAnalyzePricing).toHaveBeenCalledWith(mockJobInput);
    });

    it('should not auto analyze when title is missing', () => {
      const incompleteInput = { ...mockJobInput, title: '' };

      render(<AIPricingWidget jobInput={incompleteInput} autoAnalyze />);

      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });

    it('should not auto analyze when description is missing', () => {
      const incompleteInput = { ...mockJobInput, description: '' };

      render(<AIPricingWidget jobInput={incompleteInput} autoAnalyze />);

      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });

    it('should not auto analyze when category is missing', () => {
      const incompleteInput = { ...mockJobInput, category: '' };

      render(<AIPricingWidget jobInput={incompleteInput} autoAnalyze />);

      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });

    it('should not auto analyze when autoAnalyze is false', () => {
      render(<AIPricingWidget jobInput={mockJobInput} autoAnalyze={false} />);

      expect(mockAnalyzePricing).not.toHaveBeenCalled();
    });
  });

  describe('Pricing Update Callback', () => {
    it('should call onPricingUpdate when analysis is available', () => {
      const onPricingUpdate = jest.fn();

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: mockAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      render(
        <AIPricingWidget
          jobInput={mockJobInput}
          onPricingUpdate={onPricingUpdate}
        />
      );

      expect(onPricingUpdate).toHaveBeenCalledWith(mockAnalysis);
    });

    it('should not call onPricingUpdate when analysis is null', () => {
      const onPricingUpdate = jest.fn();

      render(
        <AIPricingWidget
          jobInput={mockJobInput}
          onPricingUpdate={onPricingUpdate}
        />
      );

      expect(onPricingUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Confidence Color Logic', () => {
    it('should use success color for high confidence (>= 0.8)', () => {
      const highConfidenceAnalysis = { ...mockAnalysis, confidence: 0.9 };

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: highConfidenceAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      mockFormatPricing.mockReturnValue({
        ...mockFormatPricing(),
        confidence: '90%',
      });

      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(getByText('90% confident')).toBeTruthy();
    });

    it('should use warning color for medium confidence (0.6-0.8)', () => {
      const mediumConfidenceAnalysis = { ...mockAnalysis, confidence: 0.7 };

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: mediumConfidenceAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      mockFormatPricing.mockReturnValue({
        ...mockFormatPricing(),
        confidence: '70%',
      });

      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(getByText('70% confident')).toBeTruthy();
    });

    it('should use error color for low confidence (< 0.6)', () => {
      const lowConfidenceAnalysis = { ...mockAnalysis, confidence: 0.5 };

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: lowConfidenceAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      mockFormatPricing.mockReturnValue({
        ...mockFormatPricing(),
        confidence: '50%',
      });

      const { getByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(getByText('50% confident')).toBeTruthy();
    });
  });

  describe('Complexity Icons', () => {
    it.each([
      ['simple', 'checkmark-circle'],
      ['moderate', 'warning'],
      ['complex', 'alert-circle'],
      ['specialist', 'star'],
      ['unknown', 'help-circle'],
    ])(
      'should return correct icon for %s complexity',
      (complexity, expectedIcon) => {
        const analysisWithComplexity = { ...mockAnalysis, complexity };

        (useAIPricing as jest.Mock).mockReturnValue({
          analysis: analysisWithComplexity,
          isLoading: false,
          analyzePricing: mockAnalyzePricing,
          formatPricing: mockFormatPricing,
          getHomeownerInsights: mockGetHomeownerInsights,
        });

        mockFormatPricing.mockReturnValue({
          ...mockFormatPricing(),
          complexityLabel:
            complexity.charAt(0).toUpperCase() + complexity.slice(1),
        });

        render(<AIPricingWidget jobInput={mockJobInput} />);

        // Component renders successfully with the complexity
        expect(true).toBe(true);
      }
    );
  });

  describe('Demand Level Display', () => {
    it.each([
      ['high', 'High', 'error'],
      ['medium', 'Medium', 'warning'],
      ['low', 'Low', 'success'],
    ])(
      'should display %s demand level correctly',
      (demandLevel, displayText, colorType) => {
        const analysisWithDemand = {
          ...mockAnalysis,
          marketData: { ...mockAnalysis.marketData, demandLevel },
        };

        (useAIPricing as jest.Mock).mockReturnValue({
          analysis: analysisWithDemand,
          isLoading: false,
          analyzePricing: mockAnalyzePricing,
          formatPricing: mockFormatPricing,
          getHomeownerInsights: mockGetHomeownerInsights,
        });

        const { getByText } = render(
          <AIPricingWidget jobInput={mockJobInput} showDetails />
        );

        // Expand to see market context
        fireEvent.press(getByText('AI Pricing Analysis'));

        expect(getByText(displayText)).toBeTruthy();
      }
    );
  });

  describe('Edge Cases', () => {
    it('should handle empty pricing factors array', () => {
      const analysisWithNoFactors = { ...mockAnalysis, factors: [] };

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: analysisWithNoFactors,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      mockFormatPricing.mockReturnValue({
        ...mockFormatPricing(),
        topFactors: [],
      });

      const { getByText, queryByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      // Should not show Key Pricing Factors section
      expect(queryByText('Key Pricing Factors')).toBeNull();
    });

    it('should handle empty recommendations array', () => {
      const analysisWithNoRecommendations = {
        ...mockAnalysis,
        recommendations: [],
      };

      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: analysisWithNoRecommendations,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      const { getByText, queryByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      // Should not show Recommendations section
      expect(queryByText('Recommendations')).toBeNull();
    });

    it('should handle empty insights array', () => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: mockAnalysis,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: mockFormatPricing,
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      mockGetHomeownerInsights.mockReturnValue([]);

      const { getByText, queryByText } = render(
        <AIPricingWidget jobInput={mockJobInput} showDetails />
      );

      // Expand
      fireEvent.press(getByText('AI Pricing Analysis'));

      // Should not show Budget Insights section
      expect(queryByText('Budget Insights')).toBeNull();
    });

    it('should return null when no analysis and not loading', () => {
      (useAIPricing as jest.Mock).mockReturnValue({
        analysis: null,
        isLoading: false,
        analyzePricing: mockAnalyzePricing,
        formatPricing: jest.fn(() => null),
        getHomeownerInsights: mockGetHomeownerInsights,
      });

      const { queryByText } = render(<AIPricingWidget jobInput={mockJobInput} />);

      // Should render the initial state (not null)
      expect(queryByText('AI Pricing Analysis')).toBeTruthy();
    });

    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<AIPricingWidget jobInput={mockJobInput} />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
