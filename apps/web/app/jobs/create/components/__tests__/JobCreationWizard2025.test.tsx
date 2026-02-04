import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobCreationWizard2025 } from '../JobCreationWizard2025';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check" />,
  Circle: () => <span data-testid="icon-circle" />,
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

vi.mock('@tremor/react', () => ({
  ProgressBar: ({ value, ...props }: any) => (
    <div data-testid="progress-bar" data-value={value} {...props} />
  ),
}));

describe('JobCreationWizard2025', () => {
  const defaultProps = {
    currentStep: 1,
    totalSteps: 4,
    onStepChange: vi.fn(),
    children: <div>Step content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should display wizard header', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('Post a New Job')).toBeInTheDocument();
      expect(screen.getByText("Let's get your project started in a few simple steps")).toBeInTheDocument();
    });

    it('should display current step indicator', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('should calculate and display progress percentage', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('25% Complete')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('Step content')).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('should show 50% progress on step 2', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={2} />);
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('should show 75% progress on step 3', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={3} />);
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
      expect(screen.getByText('75% Complete')).toBeInTheDocument();
    });

    it('should show 100% progress on final step', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={4} />);
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });

    it('should pass correct value to progress bar component', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={2} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '50');
    });
  });

  describe('Step Display', () => {
    it('should display all step titles in stepper', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Location & Budget')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should display step descriptions', () => {
      render(<JobCreationWizard2025 {...defaultProps} />);
      expect(screen.getByText('Job details')).toBeInTheDocument();
      expect(screen.getByText('Upload images')).toBeInTheDocument();
      expect(screen.getByText('Set details')).toBeInTheDocument();
      expect(screen.getByText('Confirm & post')).toBeInTheDocument();
    });
  });

  describe('Different Step Counts', () => {
    it('should handle 3-step wizard', () => {
      const props = { ...defaultProps, totalSteps: 3, currentStep: 2 };
      render(<JobCreationWizard2025 {...props} />);

      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('67% Complete')).toBeInTheDocument();
    });

    it('should handle 5-step wizard', () => {
      const props = { ...defaultProps, totalSteps: 5, currentStep: 3 };
      render(<JobCreationWizard2025 {...props} />);

      expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
      expect(screen.getByText('60% Complete')).toBeInTheDocument();
    });
  });

  describe('Dynamic Content', () => {
    it('should render different children for different steps', () => {
      const { rerender } = render(
        <JobCreationWizard2025 {...defaultProps}>
          <div>Step 1 content</div>
        </JobCreationWizard2025>
      );

      expect(screen.getByText('Step 1 content')).toBeInTheDocument();

      rerender(
        <JobCreationWizard2025 {...defaultProps} currentStep={2}>
          <div>Step 2 content</div>
        </JobCreationWizard2025>
      );

      expect(screen.getByText('Step 2 content')).toBeInTheDocument();
      expect(screen.queryByText('Step 1 content')).not.toBeInTheDocument();
    });

    it('should handle complex children components', () => {
      const ComplexChild = () => (
        <div>
          <h2>Complex Form</h2>
          <input placeholder="Test input" />
          <button>Submit</button>
        </div>
      );

      render(
        <JobCreationWizard2025 {...defaultProps}>
          <ComplexChild />
        </JobCreationWizard2025>
      );

      expect(screen.getByText('Complex Form')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle step 0', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={0} />);
      expect(screen.getByText('Step 0 of 4')).toBeInTheDocument();
      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });

    it('should handle step beyond total', () => {
      render(<JobCreationWizard2025 {...defaultProps} currentStep={5} totalSteps={4} />);
      expect(screen.getByText('Step 5 of 4')).toBeInTheDocument();
      expect(screen.getByText('125% Complete')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      const { container } = render(
        <JobCreationWizard2025 {...defaultProps} children={null} />
      );
      expect(container).toBeInTheDocument();
    });
  });
});