import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  it('should render breadcrumb items', () => {
    render(
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Details', current: true },
      ]} />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('should render links for items with href', () => {
    render(
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Current', current: true },
      ]} />
    );
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
  });

  it('should mark current item with aria-current', () => {
    render(
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Current', current: true },
      ]} />
    );
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('should render nav with aria-label', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} />);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Breadcrumb navigation');
  });
});
