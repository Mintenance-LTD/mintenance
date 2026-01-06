import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobCard } from '@/components/jobs/JobCard';
import { useRouter } from 'next/navigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

const mockJob = {
  id: '123',
  title: 'Fix leaking roof',
  description: 'Need urgent repair for leaking roof',
  category: 'roofing',
  budget: 5000,
  urgency: 'urgent' as const,
  location: 'London, UK',
  status: 'posted' as const,
  created_at: '2025-01-01T00:00:00Z',
  homeowner_id: 'homeowner123',
  images: ['image1.jpg', 'image2.jpg'],
  homeowner: {
    id: 'homeowner123',
    full_name: 'John Doe',
    avatar_url: 'avatar.jpg',
  },
  _count: {
    bids: 5,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('JobCard Component', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders job information correctly', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    expect(screen.getByText('Fix leaking roof')).toBeInTheDocument();
    expect(screen.getByText('Need urgent repair for leaking roof')).toBeInTheDocument();
    expect(screen.getByText('London, UK')).toBeInTheDocument();
    expect(screen.getByText('£5,000')).toBeInTheDocument();
    expect(screen.getByText('5 bids')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('displays homeowner information', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toHaveAttribute('src', 'avatar.jpg');
  });

  it('handles click navigation to job details', async () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    const card = screen.getByRole('article');
    fireEvent.click(card);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/jobs/123');
    });
  });

  it('displays correct urgency badge styling', () => {
    const { rerender } = render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    let badge = screen.getByText('Urgent');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');

    const normalJob = { ...mockJob, urgency: 'normal' as const };
    rerender(<JobCard job={normalJob} />, { wrapper: createWrapper() });

    badge = screen.getByText('Normal');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('shows image gallery when images are present', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3); // Avatar + 2 job images
  });

  it('does not show images when none are present', () => {
    const jobWithoutImages = { ...mockJob, images: [] };
    render(<JobCard job={jobWithoutImages} />, { wrapper: createWrapper() });

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1); // Only avatar
  });

  it('displays relative time correctly', () => {
    const recentJob = { ...mockJob, created_at: new Date().toISOString() };
    render(<JobCard job={recentJob} />, { wrapper: createWrapper() });

    expect(screen.getByText(/just now|seconds? ago/i)).toBeInTheDocument();
  });

  it('handles missing homeowner gracefully', () => {
    const jobWithoutHomeowner = { ...mockJob, homeowner: null };
    render(<JobCard job={jobWithoutHomeowner} />, { wrapper: createWrapper() });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('formats budget with currency symbol', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    expect(screen.getByText('£5,000')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', 'Job: Fix leaking roof');

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/jobs/123');
  });

  it('shows correct bid count pluralization', () => {
    const { rerender } = render(<JobCard job={mockJob} />, { wrapper: createWrapper() });
    expect(screen.getByText('5 bids')).toBeInTheDocument();

    const singleBidJob = { ...mockJob, _count: { bids: 1 } };
    rerender(<JobCard job={singleBidJob} />, { wrapper: createWrapper() });
    expect(screen.getByText('1 bid')).toBeInTheDocument();

    const noBidsJob = { ...mockJob, _count: { bids: 0 } };
    rerender(<JobCard job={noBidsJob} />, { wrapper: createWrapper() });
    expect(screen.getByText('No bids yet')).toBeInTheDocument();
  });

  it('renders category icon correctly', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    const categoryIcon = screen.getByTestId('category-icon');
    expect(categoryIcon).toBeInTheDocument();
    expect(categoryIcon).toHaveAttribute('data-category', 'roofing');
  });

  it('applies hover effects', () => {
    render(<JobCard job={mockJob} />, { wrapper: createWrapper() });

    const card = screen.getByRole('article');
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('displays job status correctly', () => {
    const { rerender } = render(<JobCard job={mockJob} />, { wrapper: createWrapper() });
    expect(screen.getByText('Posted')).toBeInTheDocument();

    const inProgressJob = { ...mockJob, status: 'in_progress' as const };
    rerender(<JobCard job={inProgressJob} />, { wrapper: createWrapper() });
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const LoadingCard = () => <JobCard job={mockJob} loading />;
    render(<LoadingCard />, { wrapper: createWrapper() });

    expect(screen.getByTestId('job-card-skeleton')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const ErrorCard = () => <JobCard job={mockJob} error="Failed to load job" />;
    render(<ErrorCard />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load job')).toBeInTheDocument();
  });
});