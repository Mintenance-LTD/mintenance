import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PricingSuggestionCard } from '../PricingSuggestionCard';

// Mock MotionDiv to avoid animation issues in tests
jest.mock('@/components/ui/MotionDiv', () => ({
  MotionDiv: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock fadeIn animation
jest.mock('@/lib/animations/variants', () => ({
  fadeIn: {},
}));

describe('PricingSuggestionCard', () => {
  const mockOnApplyPrice = jest.fn();
  const mockOnDismiss = jest.fn();

  const baseSuggestion = {
    priceRange: {
      min: 800,
      recommended: 1000,
      max: 1200,
    },
    marketData: {
      averageBid: 950,
      medianBid: 975,
      rangeMin: 700,
      rangeMax: 1300,
    },
    winProbability: 75,
    competitivenessLevel: 'competitive' as const,
    competitivenessScore: 85,
    confidenceScore: 90,
    reasoning: 'This price is competitive based on market analysis.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without costBreakdown', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/AI-Powered Pricing Suggestion/i)).toBeInTheDocument();
      expect(screen.getByText('£1000.00')).toBeInTheDocument();
      expect(screen.queryByText('Cost Breakdown')).not.toBeInTheDocument();
    });

    it('renders with costBreakdown', () => {
      const suggestionWithBreakdown = {
        ...baseSuggestion,
        costBreakdown: {
          materials: 350,
          labor: 450,
          overhead: 150,
          profit: 50,
          total: 1000,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithBreakdown}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByText('£350.00')).toBeInTheDocument(); // Materials
      expect(screen.getByText('£450.00')).toBeInTheDocument(); // Labor
      expect(screen.getByText('£150.00')).toBeInTheDocument(); // Overhead
      expect(screen.getByText('£50.00')).toBeInTheDocument(); // Profit
    });

    it('displays all price ranges correctly', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('£800.00')).toBeInTheDocument(); // Min
      expect(screen.getByText('£1000.00')).toBeInTheDocument(); // Recommended
      expect(screen.getByText('£1200.00')).toBeInTheDocument(); // Max
    });

    it('displays market data correctly', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('£950.00')).toBeInTheDocument(); // Average bid
      expect(screen.getByText('£975.00')).toBeInTheDocument(); // Median bid
    });

    it('displays AI reasoning', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('This price is competitive based on market analysis.')).toBeInTheDocument();
    });

    it('displays confidence score', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  describe('Cost Breakdown Visualization', () => {
    const suggestionWithBreakdown = {
      ...baseSuggestion,
      costBreakdown: {
        materials: 400,
        labor: 400,
        overhead: 150,
        profit: 50,
        total: 1000,
      },
    };

    it('renders stacked bar chart', () => {
      render(
        <PricingSuggestionCard
          suggestion={suggestionWithBreakdown}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      const stackedBar = screen.getByRole('img', { name: /cost breakdown visualization/i });
      expect(stackedBar).toBeInTheDocument();
    });

    it('renders legend with color indicators', () => {
      render(
        <PricingSuggestionCard
          suggestion={suggestionWithBreakdown}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Materials')).toBeInTheDocument();
      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Overhead (15%)')).toBeInTheDocument();
      expect(screen.getByText('Profit')).toBeInTheDocument();
    });

    it('calculates correct percentages', () => {
      const { container } = render(
        <PricingSuggestionCard
          suggestion={suggestionWithBreakdown}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      // Materials: 400/1000 = 40%
      const materialsBar = container.querySelector('[title*="Materials"]');
      expect(materialsBar).toHaveStyle({ width: '40%' });

      // Labor: 400/1000 = 40%
      const laborBar = container.querySelector('[title*="Labor"]');
      expect(laborBar).toHaveStyle({ width: '40%' });

      // Overhead: 150/1000 = 15%
      const overheadBar = container.querySelector('[title*="Overhead"]');
      expect(overheadBar).toHaveStyle({ width: '15%' });

      // Profit: 50/1000 = 5%
      const profitBar = container.querySelector('[title*="Profit"]');
      expect(profitBar).toHaveStyle({ width: '5%' });
    });

    it('handles zero values in breakdown', () => {
      const suggestionWithZeros = {
        ...baseSuggestion,
        costBreakdown: {
          materials: 0,
          labor: 850,
          overhead: 150,
          profit: 0,
          total: 1000,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithZeros}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('£0.00')).toBeInTheDocument(); // Should still show zero values
      expect(screen.getByText('£850.00')).toBeInTheDocument();
    });

    it('handles small percentages correctly', () => {
      const suggestionWithSmallValues = {
        ...baseSuggestion,
        costBreakdown: {
          materials: 900,
          labor: 50,
          overhead: 30,
          profit: 20,
          total: 1000,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithSmallValues}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      // All values should still be displayed in legend
      expect(screen.getByText('£900.00')).toBeInTheDocument();
      expect(screen.getByText('£50.00')).toBeInTheDocument();
      expect(screen.getByText('£30.00')).toBeInTheDocument();
      expect(screen.getByText('£20.00')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onApplyPrice with recommended price when button clicked', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      const applyButton = screen.getByRole('button', { name: /use £1000.00/i });
      fireEvent.click(applyButton);

      expect(mockOnApplyPrice).toHaveBeenCalledTimes(1);
      expect(mockOnApplyPrice).toHaveBeenCalledWith(1000);
    });

    it('calls onDismiss when dismiss button clicked', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Competitiveness Levels', () => {
    it('displays competitive badge correctly', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Competitive')).toBeInTheDocument();
    });

    it('displays too_low badge correctly', () => {
      const tooLowSuggestion = {
        ...baseSuggestion,
        competitivenessLevel: 'too_low' as const,
      };

      render(
        <PricingSuggestionCard
          suggestion={tooLowSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Too Low')).toBeInTheDocument();
    });

    it('displays premium badge correctly', () => {
      const premiumSuggestion = {
        ...baseSuggestion,
        competitivenessLevel: 'premium' as const,
      };

      render(
        <PricingSuggestionCard
          suggestion={premiumSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('displays too_high badge correctly', () => {
      const tooHighSuggestion = {
        ...baseSuggestion,
        competitivenessLevel: 'too_high' as const,
      };

      render(
        <PricingSuggestionCard
          suggestion={tooHighSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Too High')).toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('handles missing factors gracefully', () => {
      const suggestionWithoutFactors = {
        ...baseSuggestion,
        factors: undefined,
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithoutFactors}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(/AI-Powered Pricing Suggestion/i)).toBeInTheDocument();
    });

    it('displays sample size when available', () => {
      const suggestionWithSampleSize = {
        ...baseSuggestion,
        factors: {
          sampleSize: 15,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithSampleSize}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Based on 15 similar accepted bids')).toBeInTheDocument();
    });

    it('displays adjustment factors when available', () => {
      const suggestionWithFactors = {
        ...baseSuggestion,
        factors: {
          complexityFactor: 1.2,
          locationFactor: 1.1,
          contractorTierFactor: 0.95,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithFactors}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      // Check that factors section exists
      const factorsToggle = screen.getByText('View adjustment factors');
      expect(factorsToggle).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very large numbers correctly', () => {
      const largeSuggestion = {
        ...baseSuggestion,
        priceRange: {
          min: 50000,
          recommended: 75000,
          max: 100000,
        },
        costBreakdown: {
          materials: 30000,
          labor: 35000,
          overhead: 7500,
          profit: 2500,
          total: 75000,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={largeSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('£75000.00')).toBeInTheDocument();
      expect(screen.getByText('£30000.00')).toBeInTheDocument();
    });

    it('handles decimal values correctly', () => {
      const decimalSuggestion = {
        ...baseSuggestion,
        priceRange: {
          min: 999.99,
          recommended: 1234.56,
          max: 1500.75,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={decimalSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('£1234.56')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const suggestionWithBreakdown = {
        ...baseSuggestion,
        costBreakdown: {
          materials: 350,
          labor: 450,
          overhead: 150,
          profit: 50,
          total: 1000,
        },
      };

      render(
        <PricingSuggestionCard
          suggestion={suggestionWithBreakdown}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      const stackedBar = screen.getByRole('img', { name: /cost breakdown visualization/i });
      expect(stackedBar).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(
        <PricingSuggestionCard
          suggestion={baseSuggestion}
          onApplyPrice={mockOnApplyPrice}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByRole('button', { name: /use £1000.00/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });
  });
});
