import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { JobCard } from '../../components/JobCard';
import { Job } from '../../types';

const mockJob: Job = {
  id: 'test-job-1',
  title: 'Kitchen Faucet Repair',
  description: 'Leaky kitchen faucet needs professional repair',
  budget: 150,
  status: 'posted',
  category: 'Plumbing',
  subcategory: 'Faucet Repair',
  priority: 'high',
  location: '123 Main Street, Anytown, USA',
  homeowner_id: 'homeowner-1',
  photos: ['photo1.jpg'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockOnPress = jest.fn();
const mockOnBid = jest.fn();

describe('JobCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders job information correctly', () => {
    const { getByText } = render(
      <JobCard job={mockJob} onPress={mockOnPress} />
    );

    expect(getByText('Kitchen Faucet Repair')).toBeTruthy();
    expect(getByText('$150')).toBeTruthy();
    expect(getByText('Plumbing')).toBeTruthy();
    expect(getByText('HIGH PRIORITY')).toBeTruthy();
  });

  it('calls onPress when card is tapped', () => {
    const { getByTestId } = render(
      <JobCard job={mockJob} onPress={mockOnPress} />
    );

    fireEvent.press(getByTestId('job-card'));
    expect(mockOnPress).toHaveBeenCalledWith(mockJob);
  });

  it('shows bid button for contractors', () => {
    const { getByText } = render(
      <JobCard
        job={mockJob}
        onPress={mockOnPress}
        onBid={mockOnBid}
        showBidButton={true}
      />
    );

    expect(getByText('Place Bid')).toBeTruthy();
  });

  it('calls onBid when bid button is pressed', () => {
    const { getByText } = render(
      <JobCard
        job={mockJob}
        onPress={mockOnPress}
        onBid={mockOnBid}
        showBidButton={true}
      />
    );

    fireEvent.press(getByText('Place Bid'));
    expect(mockOnBid).toHaveBeenCalledWith(mockJob);
  });

  it('displays job status correctly', () => {
    const assignedJob = { ...mockJob, status: 'assigned' as const };
    const { getByText } = render(
      <JobCard job={assignedJob} onPress={mockOnPress} />
    );

    expect(getByText('ASSIGNED')).toBeTruthy();
  });

  it('shows photo indicator when photos exist', () => {
    const { getByTestId } = render(
      <JobCard job={mockJob} onPress={mockOnPress} />
    );

    expect(getByTestId('photo-indicator')).toBeTruthy();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalJob: Job = {
      id: 'test-job-2',
      title: 'Basic Job',
      description: 'Simple description',
      location: '456 Oak Street, Somewhere',
      budget: 100,
      status: 'posted',
      homeowner_id: 'homeowner-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { getByText } = render(
      <JobCard job={minimalJob} onPress={mockOnPress} />
    );

    expect(getByText('Basic Job')).toBeTruthy();
    expect(getByText('$100')).toBeTruthy();
  });

  it('formats budget correctly', () => {
    const expensiveJob = { ...mockJob, budget: 1500.5 };
    const { getByText } = render(
      <JobCard job={expensiveJob} onPress={mockOnPress} />
    );

    expect(getByText('$1,501')).toBeTruthy();
  });

  it('truncates long descriptions', () => {
    const longDescriptionJob = {
      ...mockJob,
      description:
        'This is a very long description that should be truncated to prevent the card from becoming too tall and affecting the layout of the job list screen.',
    };

    const { getByText } = render(
      <JobCard job={longDescriptionJob} onPress={mockOnPress} />
    );

    const description = getByText(/This is a very long description/);
    expect(description.props.numberOfLines).toBe(3);
  });
});
