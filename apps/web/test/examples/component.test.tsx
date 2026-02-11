/**
 * Example: Component Testing with Vitest + React Testing Library
 * Demonstrates testing client components, user interactions, and accessibility
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockJob, mockBid } from '../utils';
import { JobCard } from '@/components/jobs/JobCard';

describe('JobCard Component', () => {
  const defaultProps = {
    job: mockJob(),
    onSelect: vi.fn(),
    onBid: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render job information correctly', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      expect(screen.getByText(defaultProps.job.title)).toBeInTheDocument();
      expect(screen.getByText(defaultProps.job.description)).toBeInTheDocument();
      expect(screen.getByText(`£${defaultProps.job.budget}`)).toBeInTheDocument();
      expect(screen.getByText(/plumbing/i)).toBeInTheDocument();
    });

    it('should display job status badge', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      const statusBadge = screen.getByText(/posted/i);
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-teal-100');
    });

    it('should render job photos when available', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('src', expect.stringContaining('photo1.jpg'));
    });

    it('should show placeholder when no photos available', () => {
      const jobWithoutPhotos = mockJob({ photos: [] });
      renderWithProviders(
        <JobCard {...defaultProps} job={jobWithoutPhotos} />
      );

      expect(screen.getByTestId('placeholder-image')).toBeInTheDocument();
    });

    it('should display urgency indicator for urgent jobs', () => {
      const urgentJob = mockJob({ urgency: 'urgent' });
      renderWithProviders(<JobCard {...defaultProps} job={urgentJob} />);

      expect(screen.getByText(/urgent/i)).toBeInTheDocument();
      expect(screen.getByTestId('urgency-indicator')).toHaveClass('text-red-600');
    });
  });

  describe('User Interactions', () => {
    it('should call onSelect when card is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      const card = screen.getByTestId('job-card');
      await user.click(card);

      expect(defaultProps.onSelect).toHaveBeenCalledWith(defaultProps.job);
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onBid when bid button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      const bidButton = screen.getByRole('button', { name: /submit bid/i });
      await user.click(bidButton);

      expect(defaultProps.onBid).toHaveBeenCalledWith(defaultProps.job.id);
      expect(defaultProps.onBid).toHaveBeenCalledTimes(1);
    });

    it('should prevent bid button click from triggering onSelect', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      const bidButton = screen.getByRole('button', { name: /submit bid/i });
      await user.click(bidButton);

      // onBid should be called but onSelect should not
      expect(defaultProps.onBid).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });

    it('should show more details when expand button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /show more/i });
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('job-details-expanded')).toBeVisible();
      });
    });

    it('should copy job link when share button is clicked', async () => {
      const user = userEvent.setup();

      // Mock clipboard API
      const mockClipboard = {
        writeText: vi.fn(() => Promise.resolve()),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      renderWithProviders(<JobCard {...defaultProps} />);

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining(defaultProps.job.id)
        );
      });

      // Should show toast notification
      expect(screen.getByText(/link copied/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      const card = screen.getByTestId('job-card');

      // Tab to focus card
      await user.tab();
      expect(card).toHaveFocus();

      // Press Enter to select
      await user.keyboard('{Enter}');
      expect(defaultProps.onSelect).toHaveBeenCalled();
    });

    it('should navigate to bid button with Tab', async () => {
      const user = userEvent.setup();
      renderWithProviders(<JobCard {...defaultProps} />);

      await user.tab(); // Focus card
      await user.tab(); // Focus bid button

      const bidButton = screen.getByRole('button', { name: /submit bid/i });
      expect(bidButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(defaultProps.onBid).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        expect.stringContaining(defaultProps.job.title)
      );

      const bidButton = screen.getByRole('button', { name: /submit bid/i });
      expect(bidButton).toHaveAttribute('aria-label');
    });

    it('should have proper heading hierarchy', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(defaultProps.job.title);
    });

    it('should support screen reader text', () => {
      renderWithProviders(<JobCard {...defaultProps} />);

      const srOnlyElements = document.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loader when job is undefined', () => {
      renderWithProviders(<JobCard {...defaultProps} job={undefined as any} />);

      expect(screen.getByTestId('job-card-skeleton')).toBeInTheDocument();
    });

    it('should disable buttons when loading', () => {
      renderWithProviders(<JobCard {...defaultProps} isLoading={true} />);

      const bidButton = screen.getByRole('button', { name: /submit bid/i });
      expect(bidButton).toBeDisabled();
    });
  });

  describe('Error States', () => {
    it('should display error message when job data is invalid', () => {
      const invalidJob = mockJob({ title: '' });
      renderWithProviders(<JobCard {...defaultProps} job={invalidJob} />);

      expect(screen.getByText(/invalid job data/i)).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should hide bid button for completed jobs', () => {
      const completedJob = mockJob({ status: 'completed' });
      renderWithProviders(<JobCard {...defaultProps} job={completedJob} />);

      expect(
        screen.queryByRole('button', { name: /submit bid/i })
      ).not.toBeInTheDocument();
    });

    it('should show "View Bids" button for homeowners', () => {
      renderWithProviders(
        <JobCard {...defaultProps} userRole="homeowner" />
      );

      expect(
        screen.getByRole('button', { name: /view bids/i })
      ).toBeInTheDocument();
    });

    it('should show bid count when bids exist', () => {
      const jobWithBids = mockJob({ bid_count: 5 });
      renderWithProviders(<JobCard {...defaultProps} job={jobWithBids} />);

      expect(screen.getByText(/5 bids/i)).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display relative time for recent jobs', () => {
      const recentJob = mockJob({
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      renderWithProviders(<JobCard {...defaultProps} job={recentJob} />);

      expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();
    });

    it('should display absolute date for old jobs', () => {
      const oldJob = mockJob({
        created_at: new Date('2024-01-01').toISOString(),
      });

      renderWithProviders(<JobCard {...defaultProps} job={oldJob} />);

      expect(screen.getByText(/jan 1, 2024/i)).toBeInTheDocument();
    });
  });
});
