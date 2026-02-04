import { render, screen, fireEvent } from '@testing-library/react';
import { SkeletonShowcase } from '../SkeletonShowcase';

// Mock the skeleton components
vi.mock('../../Skeleton', () => ({
  default: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
  SkeletonText: ({ lines }: { lines: number }) => <div data-testid="skeleton-text">{lines} lines</div>,
  SkeletonAvatar: ({ size }: { size: string }) => <div data-testid="skeleton-avatar" data-size={size} />,
  SkeletonButton: ({ size }: { size: string }) => <div data-testid="skeleton-button" data-size={size} />,
  SkeletonBadge: ({ className }: { className?: string }) => <div data-testid="skeleton-badge" className={className} />,
  SkeletonImage: ({ aspectRatio }: { aspectRatio: string }) => <div data-testid="skeleton-image" data-aspect={aspectRatio} />,
}));

vi.mock('../JobCardSkeleton', () => ({
  JobCardSkeleton: ({ showImage }: { showImage?: boolean }) => <div data-testid="job-card-skeleton" data-show-image={showImage} />,
}));

vi.mock('../ContractorCardSkeleton', () => ({
  ContractorCardSkeleton: ({ showPortfolio }: { showPortfolio?: boolean }) => <div data-testid="contractor-card-skeleton" data-show-portfolio={showPortfolio} />,
}));

vi.mock('../DashboardSkeleton', () => ({
  DashboardSkeleton: ({ kpiCount, tableRows }: { kpiCount?: number; tableRows?: number }) => (
    <div data-testid="dashboard-skeleton" data-kpi-count={kpiCount} data-table-rows={tableRows} />
  ),
}));

vi.mock('../MessageListSkeleton', () => ({
  MessageListSkeleton: ({ count }: { count: number }) => <div data-testid="message-list-skeleton" data-count={count} />,
}));

vi.mock('../FormSkeleton', () => ({
  FormSkeleton: ({ fields }: { fields: number }) => <div data-testid="form-skeleton" data-fields={fields} />,
}));

vi.mock('../TableSkeleton', () => ({
  TableSkeleton: ({ rows, columns }: { rows: number; columns: number }) => (
    <div data-testid="table-skeleton" data-rows={rows} data-columns={columns} />
  ),
}));

describe('SkeletonShowcase', () => {
  it('should render the showcase with header and tabs', () => {
    render(<SkeletonShowcase />);

    expect(screen.getByText('Skeleton Loader System')).toBeInTheDocument();
    expect(screen.getByText('Basic Components')).toBeInTheDocument();
    expect(screen.getByText('Card Skeletons')).toBeInTheDocument();
    expect(screen.getByText('Complex Layouts')).toBeInTheDocument();
  });

  it('should show basic components tab by default', () => {
    render(<SkeletonShowcase />);

    // Basic tab content should be visible
    expect(screen.getByText('Base Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Text Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Avatar Skeleton')).toBeInTheDocument();
  });

  it('should switch to cards tab when clicked', () => {
    render(<SkeletonShowcase />);

    const cardsTab = screen.getByText('Card Skeletons');
    fireEvent.click(cardsTab);

    expect(screen.getByText('Job Card Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Contractor Card Skeleton')).toBeInTheDocument();
  });

  it('should switch to complex layouts tab when clicked', () => {
    render(<SkeletonShowcase />);

    const complexTab = screen.getByText('Complex Layouts');
    fireEvent.click(complexTab);

    expect(screen.getByText('Dashboard Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Form Skeleton')).toBeInTheDocument();
    expect(screen.getByText('Table Skeleton')).toBeInTheDocument();
  });
});