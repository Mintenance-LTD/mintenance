import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedArticle } from '../FeaturedArticle';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Image: () => <span data-testid="icon-image" />,
  User: () => <span data-testid="icon-user" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Clock: () => <span data-testid="icon-clock" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('FeaturedArticle', () => {
  const mockProps = {
    id: 'article-1',
    title: 'Top 10 Tips for Successful Contractor Business',
    excerpt: 'Learn essential strategies to grow your contracting business and win more jobs.',
    coverImage: '/featured-article.jpg',
    author: 'Jane Smith',
    publishedDate: '2026-01-15',
    category: 'Business Tips',
    href: '/articles/top-10-tips',
    readingTime: 5,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<FeaturedArticle {...mockProps} />);
    expect(container).toBeDefined();
  });

  it('should display article information', () => {
    render(<FeaturedArticle {...mockProps} />);
    expect(screen.getByText(mockProps.title)).toBeInTheDocument();
    expect(screen.getByText(mockProps.excerpt)).toBeInTheDocument();
  });

  it('should display metadata', () => {
    const { container } = render(<FeaturedArticle {...mockProps} />);
    expect(container.textContent).toContain('Jane Smith');
    expect(container.textContent).toContain('5');
  });

  it('should render with minimal props', () => {
    const minimalProps = {
      id: 'article-2',
      title: 'Test Article',
      excerpt: 'Test excerpt',
      href: '/test',
    };
    const { container } = render(<FeaturedArticle {...minimalProps} />);
    expect(container.textContent).toContain('Test Article');
  });
});
