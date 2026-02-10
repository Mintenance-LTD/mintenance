// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { ArticleCard } from '../ArticleCard';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('lucide-react', () => ({
  User: () => <span data-testid="icon-user" />,
  Calendar: () => <span data-testid="icon-calendar" />,
}));

describe('ArticleCard', () => {
  const mockProps = {
    title: 'How to Improve Your Contractor Rating',
    excerpt: 'Learn the best practices for maintaining a high rating on the platform.',
    image: '/article-image.jpg',
    author: 'John Smith',
    publishedDate: '2026-01-20',
    category: 'Tips & Guides',
    href: '/articles/improve-rating',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<ArticleCard {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should display article title and excerpt', () => {
    render(<ArticleCard {...mockProps} />);
    expect(screen.getByText(mockProps.title)).toBeInTheDocument();
    expect(screen.getByText(mockProps.excerpt)).toBeInTheDocument();
  });

  it('should display author and date', () => {
    const { container } = render(<ArticleCard {...mockProps} />);
    expect(container.textContent).toContain('John Smith');
    expect(container.textContent).toContain('Jan');
  });

  it('should render with minimal props', () => {
    const minimalProps = {
      title: 'Test Article',
      excerpt: 'Test excerpt',
      href: '/test',
    };
    const { container } = render(<ArticleCard {...minimalProps} />);
    expect(container.textContent).toContain('Test Article');
  });
});
