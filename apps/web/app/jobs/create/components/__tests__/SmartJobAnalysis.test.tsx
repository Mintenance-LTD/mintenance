// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartJobAnalysis } from '../SmartJobAnalysis';

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
      primary: '#4f46e5',
      success: '#10b981',
      warning: '#f59e0b',
      text: '#111827',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6'
    },
    spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px' },
    borderRadius: { md: '8px', lg: '12px' },
    typography: {
      fontSize: { xs: '12px', sm: '14px', base: '16px' },
      fontWeight: { semibold: 600, bold: 700 }
    }
  },
}));

vi.mock('@/lib/utils/currency', () => ({
  formatMoney: vi.fn((amount) => `£${amount.toLocaleString()}`)
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`} />
}));

const mockAnalysisResponse = {
  suggestedCategory: 'plumbing',
  suggestedBudget: { min: 200, max: 400, recommended: 300 },
  suggestedTimeline: { minDays: 1, maxDays: 3, urgency: 'medium' as const },
  confidence: 85,
  reasoning: ['Keyword "sink" detected', 'Location-based pricing'],
  detectedKeywords: ['sink', 'leak', 'kitchen'],
};

global.fetch = vi.fn();

describe('SmartJobAnalysis', () => {
  const defaultProps = {
    title: 'Kitchen Repair',
    description: 'Need to fix leaking kitchen sink',
    location: 'London',
    imageUrls: [],
    onCategorySelect: vi.fn(),
    onBudgetSelect: vi.fn(),
    onUrgencySelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should not show suggestions when no analysis available', () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      expect(screen.queryByText('Smart Job Analysis')).not.toBeInTheDocument();
    });

    it('should not trigger analysis with insufficient text', async () => {
      render(<SmartJobAnalysis {...defaultProps} title="Hi" description="" />);
      await vi.advanceTimersByTimeAsync(1500);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Analysis Trigger', () => {
    it('should trigger analysis after debounce period with sufficient text', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      render(<SmartJobAnalysis {...defaultProps} />);

      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/jobs/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Kitchen Repair',
            description: 'Need to fix leaking kitchen sink',
            location: 'London',
            imageUrls: [],
          }),
        });
      });
    });

    it('should use faster debounce when images are provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });

      render(<SmartJobAnalysis {...defaultProps} imageUrls={['image1.jpg']} />);

      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  // TODO: Fix fake timers + waitFor incompatibility in Vitest v4 (known issue)
  // These tests time out because waitFor's internal polling is also frozen by fake timers
  describe.skip('Suggestions Display', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });
    });

    it('should display analysis results after successful fetch', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('Smart Job Analysis')).toBeInTheDocument();
      });

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
      expect(screen.getByText('Plumbing')).toBeInTheDocument();
      expect(screen.getByText('£300')).toBeInTheDocument();
    });

    it('should display budget range correctly', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText(/Range:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/£200.*£400/)).toBeInTheDocument();
    });

    it('should display timeline with urgency badge', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('1-3 days')).toBeInTheDocument();
      });

      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('should display reasoning insights', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('Analysis Insights:')).toBeInTheDocument();
      });

      expect(screen.getByText(/Keyword "sink" detected/)).toBeInTheDocument();
      expect(screen.getByText(/Location-based pricing/)).toBeInTheDocument();
    });
  });

  // TODO: Fix fake timers + waitFor incompatibility in Vitest v4
  describe.skip('User Interactions', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse,
      });
    });

    it('should call onCategorySelect when Apply button clicked for category', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('Plumbing')).toBeInTheDocument();
      });

      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[0]); // First Apply button is for category

      expect(defaultProps.onCategorySelect).toHaveBeenCalledWith('plumbing');
    });

    it('should call onBudgetSelect when Apply button clicked for budget', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('£300')).toBeInTheDocument();
      });

      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[1]); // Second Apply button is for budget

      expect(defaultProps.onBudgetSelect).toHaveBeenCalledWith(300);
    });

    it('should call onUrgencySelect when Apply button clicked for timeline', async () => {
      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(screen.getByText('1-3 days')).toBeInTheDocument();
      });

      const applyButtons = screen.getAllByText('Apply');
      fireEvent.click(applyButtons[2]); // Third Apply button is for urgency

      expect(defaultProps.onUrgencySelect).toHaveBeenCalledWith('medium');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const mockLogger = vi.mocked((await import('@mintenance/shared')).logger);
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error analyzing job',
          expect.any(Error),
          { service: 'smart-job-analysis' }
        );
      });

      expect(screen.queryByText('Smart Job Analysis')).not.toBeInTheDocument();
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<SmartJobAnalysis {...defaultProps} />);
      await vi.advanceTimersByTimeAsync(1000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(screen.queryByText('Smart Job Analysis')).not.toBeInTheDocument();
    });
  });

  describe('Image Analysis', () => {
    it('should display image analysis section when available', async () => {
      const responseWithImages = {
        ...mockAnalysisResponse,
        imageAnalysis: {
          detectedFeatures: ['water damage', 'pipe leak', 'cabinet damage'],
          condition: 'moderate',
          complexity: 'medium',
          confidence: 78,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithImages,
      });

      render(<SmartJobAnalysis {...defaultProps} imageUrls={['img1.jpg']} />);
      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() => {
        expect(screen.getByText('Image Analysis Detected:')).toBeInTheDocument();
      });

      expect(screen.getByText(/water damage, pipe leak, cabinet damage/)).toBeInTheDocument();
      expect(screen.getByText(/Property condition:/)).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
    });

    it('should show appropriate subtitle for image analysis', async () => {
      const responseWithImages = {
        ...mockAnalysisResponse,
        imageAnalysis: { detectedFeatures: ['leak'], confidence: 80 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithImages,
      });

      render(<SmartJobAnalysis {...defaultProps} imageUrls={['img1.jpg']} />);
      await vi.advanceTimersByTimeAsync(500);

      await waitFor(() => {
        expect(screen.getByText(/AI suggestions based on your description and images/)).toBeInTheDocument();
      });
    });
  });
});