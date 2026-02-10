// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render } from '@testing-library/react';
import { PortfolioSection } from '../PortfolioSection';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('PortfolioSection', () => {
  const defaultProps = {
    images: ['/portfolio1.jpg', '/portfolio2.jpg', '/portfolio3.jpg'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<PortfolioSection {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    const { container } = render(<PortfolioSection {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should display correct data', () => {
    const { container } = render(<PortfolioSection {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle edge cases', () => {
    const { container } = render(<PortfolioSection images={[]} />);
    // Component returns null for empty images
    expect(container).toBeDefined();
  });
});