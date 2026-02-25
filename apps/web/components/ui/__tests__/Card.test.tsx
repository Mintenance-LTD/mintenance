import React from 'react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

vi.mock('@mintenance/shared-ui', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="shared-card" {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/lib/theme-enhancements', () => ({
  getGradientCardStyle: () => ({}),
}));

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should render with default variant', () => {
    render(<Card>Content</Card>);
    const cardEl = screen.getByText('Content');
    expect(cardEl).toBeInTheDocument();
    // Verify the Card renders with the 'card' class from SharedCard
    expect(cardEl.className).toContain('card');
  });

  it('should expose sub-components', () => {
    expect(Card.Header).toBeDefined();
    expect(Card.Footer).toBeDefined();
    expect(Card.Title).toBeDefined();
    expect(Card.Description).toBeDefined();
    expect(Card.Content).toBeDefined();
  });

  it('should render sub-components', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Content>Body</Card.Content>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
