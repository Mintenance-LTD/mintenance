// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetRangeSelector } from '../BudgetRangeSelector';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    __call: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Info: () => <span data-testid="icon-info" />,
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eyeoff" />,
  TrendingUp: () => <span data-testid="icon-trending" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Lock: () => <span data-testid="icon-lock" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
}));

describe('BudgetRangeSelector', () => {
  const defaultProps = {
    value: {
      budget: '500',
      budget_min: '450',
      budget_max: '550',
      show_budget_to_contractors: true,
      require_itemized_bids: false,
    },
    onChange: vi.fn(),
    hasImages: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Budget Input', () => {
    it('should display budget input with correct label', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText("What's your maximum budget?")).toBeInTheDocument();
    });

    it('should display current budget value', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter maximum budget') as HTMLInputElement;
      expect(input.value).toBe('500');
    });

    it('should call onChange with auto-calculated min/max when budget changes', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter maximum budget');

      fireEvent.change(input, { target: { value: '1000' } });

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        budget: '1000',
        budget_min: '900',
        budget_max: '1100',
      });
    });

    it('should display formatted budget amount', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      // "£500" may appear in multiple places (display + visibility text)
      const matches = screen.getAllByText(/£500/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Maximum budget')).toBeInTheDocument();
    });

    it('should show budget range when hidden from contractors', () => {
      const props = {
        ...defaultProps,
        value: {
          ...defaultProps.value,
          show_budget_to_contractors: false,
        },
      };
      render(<BudgetRangeSelector {...props} />);

      expect(screen.getByText('Contractors will see a range:')).toBeInTheDocument();
      expect(screen.getByText('£450 - £550')).toBeInTheDocument();
    });
  });

  describe('Budget Visibility Control', () => {
    it('should display budget visibility checkbox', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText('Budget Visibility')).toBeInTheDocument();
      expect(screen.getByText(/Hide exact budget from contractors/)).toBeInTheDocument();
    });

    it('should show Eye icon when budget is visible', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    });

    it('should show EyeOff icon when budget is hidden', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, show_budget_to_contractors: false },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.getByTestId('icon-eyeoff')).toBeInTheDocument();
    });

    it('should toggle visibility when hiding budget', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox', { name: /Hide exact budget/ });

      fireEvent.click(checkbox);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        show_budget_to_contractors: false,
      });
    });

    it('should show expected savings section when budget is hidden', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, show_budget_to_contractors: false },
      };
      render(<BudgetRangeSelector {...props} />);

      expect(screen.getByText('Expected savings: 15-25%')).toBeInTheDocument();
      expect(screen.getByText(/Jobs with hidden budgets receive bids that are 15-25% lower/)).toBeInTheDocument();
    });
  });

  describe('Itemization Requirement', () => {
    it('should display itemization checkbox', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText('Require Detailed Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByText(/Contractors must itemize their bids/)).toBeInTheDocument();
    });

    it('should recommend itemization for budgets over £500', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '600', budget_min: '540', budget_max: '660' },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.getByText('(Recommended for £500+)')).toBeInTheDocument();
    });

    it('should toggle itemization requirement when clicked', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox', { name: /Contractors must itemize/ });

      fireEvent.click(checkbox);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        require_itemized_bids: true,
      });
    });

    it('should show breakdown details when itemization is required', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, require_itemized_bids: true },
      };
      render(<BudgetRangeSelector {...props} />);

      expect(screen.getByText('Required breakdown:')).toBeInTheDocument();
      expect(screen.getByText(/Materials:/)).toBeInTheDocument();
      expect(screen.getByText(/Labor:/)).toBeInTheDocument();
      expect(screen.getByText(/Other Costs:/)).toBeInTheDocument();
      expect(screen.getByText(/VAT:/)).toBeInTheDocument();
    });
  });

  describe('Photo Requirement Warning', () => {
    it('should show photo warning for budgets over £500 without images', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '600', budget_min: '540', budget_max: '660' },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.getByText('Photos Required')).toBeInTheDocument();
      expect(screen.getByText(/For jobs over £500, you must upload at least one photo/)).toBeInTheDocument();
    });

    it('should not show photo warning when images are present', () => {
      const props = { ...defaultProps, hasImages: true };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.queryByText('Photos Required')).not.toBeInTheDocument();
    });

    it('should not show photo warning for budgets under £500', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '400', budget_min: '360', budget_max: '440' },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.queryByText('Photos Required')).not.toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should show advanced options toggle button', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText(/Advanced Budget Options/)).toBeInTheDocument();
    });

    it('should expand advanced options when clicked', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const toggleButton = screen.getByText(/Advanced Budget Options/);

      fireEvent.click(toggleButton);

      expect(screen.getByText('Custom Budget Range (shown to contractors)')).toBeInTheDocument();
      expect(screen.getByText('Minimum')).toBeInTheDocument();
      expect(screen.getByText('Maximum')).toBeInTheDocument();
    });

    it('should allow custom min/max input in advanced options', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      const toggleButton = screen.getByText(/Advanced Budget Options/);
      fireEvent.click(toggleButton);

      const minInput = screen.getByPlaceholderText('Min');
      const maxInput = screen.getByPlaceholderText('Max');

      fireEvent.change(minInput, { target: { value: '400' } });

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        budget_min: '400',
        budget_max: '550',
      });
    });
  });

  describe('Budget Tips', () => {
    it('should display budget tips section', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText('Budget Tips')).toBeInTheDocument();
    });

    it('should show appropriate budget guidance', () => {
      render(<BudgetRangeSelector {...defaultProps} />);
      expect(screen.getByText(/Typical budgets for standard jobs: £500-£1,200/)).toBeInTheDocument();
    });

    it('should show different guidance for large budgets', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '5000', budget_min: '4500', budget_max: '5500' },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.getByText(/Typical budgets for major renovations: £3,000-£12,000/)).toBeInTheDocument();
    });

    it('should show congratulatory message when budget is hidden', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, show_budget_to_contractors: false },
      };
      render(<BudgetRangeSelector {...props} />);
      expect(screen.getByText(/Great choice!/)).toBeInTheDocument();
      expect(screen.getByText(/Hidden budgets save homeowners 15-25% on average/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero budget', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '0', budget_min: '', budget_max: '' },
      };
      render(<BudgetRangeSelector {...props} />);
      const input = screen.getByPlaceholderText('Enter maximum budget') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should not show features for budget below £50', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '30', budget_min: '27', budget_max: '33' },
      };
      render(<BudgetRangeSelector {...props} />);

      expect(screen.queryByText('Budget Visibility')).not.toBeInTheDocument();
      expect(screen.queryByText('Require Detailed Cost Breakdown')).not.toBeInTheDocument();
      expect(screen.queryByText('Budget Tips')).not.toBeInTheDocument();
    });

    it('should handle empty budget gracefully', () => {
      const props = {
        ...defaultProps,
        value: { ...defaultProps.value, budget: '', budget_min: '', budget_max: '' },
      };
      const { container } = render(<BudgetRangeSelector {...props} />);
      expect(container).toBeInTheDocument();
    });
  });
});
