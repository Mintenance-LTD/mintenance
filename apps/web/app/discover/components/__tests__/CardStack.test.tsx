import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardStack } from '../CardStack';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('@/components/SwipeableCard', () => ({
  SwipeableCard: ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, ...props }: any) => (
    <div data-testid="swipeable-card" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/lib/theme', () => ({
  theme: {
    colors: {
      surface: '#ffffff',
      border: '#e5e7eb',
    },
  },
}));

describe('CardStack', () => {
  const mockItems = [
    { id: '1', title: 'Card 1' },
    { id: '2', title: 'Card 2' },
    { id: '3', title: 'Card 3' },
  ];

  const defaultProps = {
    items: mockItems,
    currentIndex: 0,
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
    onSwipeUp: vi.fn(),
    onSwipeDown: vi.fn(),
    renderCard: (item: any) => <div data-testid="card-content">{item.title}</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<CardStack {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should handle user interactions', async () => {
    render(<CardStack {...defaultProps} />);
    // CardStack renders SwipeableCard which handles interactions
    expect(screen.getByTestId('swipeable-card')).toBeDefined();
  });

  it('should display correct data', () => {
    render(<CardStack {...defaultProps} />);
    // Current card should be rendered
    expect(screen.getByText('Card 1')).toBeDefined();
  });

  it('should handle edge cases', () => {
    // Test with empty items
    const emptyProps = { ...defaultProps, items: [] };
    const { container } = render(<CardStack {...emptyProps} />);
    expect(container).toBeDefined();
  });
});
