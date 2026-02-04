import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

vi.mock('../Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('PageHeader', () => {
  it('should render title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('should render subtitle when provided', () => {
    render(<PageHeader title="Dashboard" subtitle="Welcome back" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('should not render subtitle when not provided', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(<PageHeader title="Jobs" actions={<button>Create Job</button>} />);
    expect(screen.getByText('Create Job')).toBeInTheDocument();
  });

  it('should render breadcrumbs when provided', () => {
    render(
      <PageHeader
        title="Details"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Jobs' },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
  });
});
