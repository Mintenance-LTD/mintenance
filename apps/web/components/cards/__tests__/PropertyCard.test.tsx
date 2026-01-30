import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyCard } from '../PropertyCard';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock lucide-react Heart icon
vi.mock('lucide-react', () => ({
  Heart: ({ className }: { className: string }) => <span data-testid="heart-icon" className={className} />,
}));

const mockProperty = {
  id: 'prop-1',
  imageUrl: '/property.jpg',
  imageAlt: 'Beautiful Property',
  title: 'Luxury Apartment',
  location: 'London, UK',
  rating: 4.8,
  reviewCount: 120,
  price: 150,
  currency: '£',
};

describe('PropertyCard', () => {
  it('should render property details correctly', () => {
    render(<PropertyCard {...mockProperty} />);

    expect(screen.getByText('Luxury Apartment')).toBeInTheDocument();
    expect(screen.getByText('London, UK')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(120)')).toBeInTheDocument();
    expect(screen.getByText(/£150/)).toBeInTheDocument();
  });

  it('should display discounted price when provided', () => {
    render(<PropertyCard {...mockProperty} discountedPrice={120} />);

    expect(screen.getByText(/£120/)).toBeInTheDocument();
    expect(screen.getByText(/£150/)).toBeInTheDocument(); // Original price
  });

  it('should show guest favourite badge when isGuestFavourite is true', () => {
    render(<PropertyCard {...mockProperty} isGuestFavourite={true} />);

    expect(screen.getByText('Guest favourite')).toBeInTheDocument();
  });

  it('should call onClick handler when card is clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<PropertyCard {...mockProperty} onClick={onClick} />);

    // Click the card container (has tabindex="0", not the favorite button)
    const card = container.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith('prop-1');
  });

  it('should toggle favorite state when heart icon is clicked', () => {
    const onFavoriteToggle = vi.fn();
    render(<PropertyCard {...mockProperty} onFavoriteToggle={onFavoriteToggle} />);

    const favoriteButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(favoriteButton);

    expect(onFavoriteToggle).toHaveBeenCalledWith('prop-1');
  });
});