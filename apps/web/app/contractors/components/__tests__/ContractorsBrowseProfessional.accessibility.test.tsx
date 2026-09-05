import { render, screen, fireEvent } from '@testing-library/react';
import { ContractorsBrowseProfessional } from '../ContractorsBrowseProfessional';

describe('contractor browse form accessibility', () => {
  it('names the search, location, rate and sort controls and describes the rate value', () => {
    render(
      <ContractorsBrowseProfessional
        totalCount={1}
        contractors={[
          {
            id: 'contractor-1',
            name: 'Local Plumber',
            company_name: null,
            city: 'London',
            profile_image: null,
            hourly_rate: 40,
            rating: 4.5,
            review_count: 2,
            verified: false,
            skills: ['Plumbing'],
            completed_jobs: 3,
            response_time: '1 hour',
          },
        ]}
      />
    );

    expect(
      screen.getByRole('textbox', { name: 'Search contractors' })
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Location' })).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: 'Sort contractors' })
    ).toHaveValue('recommended');
    const rate = screen.getByRole('slider', { name: 'Max Hourly Rate' });
    expect(rate).toHaveAttribute('aria-valuetext', 'Any rate');
    fireEvent.change(rate, { target: { value: '50' } });
    expect(rate).toHaveAttribute('aria-valuetext', '£50 per hour');
  });
});
