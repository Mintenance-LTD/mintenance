import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '../Layout';

vi.mock('../PageHeader', () => ({
  PageHeader: ({ title, subtitle }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('../Navigation', () => ({
  Navigation: ({ items }: any) => (
    <nav data-testid="navigation">
      {items.map((item: any, i: number) => <span key={i}>{item.label}</span>)}
    </nav>
  ),
}));

describe('Layout', () => {
  it('should render children', () => {
    render(<Layout>Main content</Layout>);
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('should render children inside main element', () => {
    render(<Layout>Content</Layout>);
    expect(screen.getByRole('main')).toHaveTextContent('Content');
  });

  it('should render title via PageHeader', () => {
    render(<Layout title="Dashboard">Content</Layout>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render navigation when items provided', () => {
    render(
      <Layout navigation={[{ label: 'Home', href: '/' }]}>
        Content
      </Layout>
    );
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('should render without title or navigation', () => {
    render(<Layout>Minimal</Layout>);
    expect(screen.queryByTestId('page-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigation')).not.toBeInTheDocument();
  });
});
