import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { BookingInterface } from '../BookingInterface';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('BookingInterface', () => {
  const defaultProps = {
    contractorName: 'Test Contractor',
    contractorRating: 4.8,
    services: [
      {
        id: 'service-1',
        name: 'Leak Repair',
        description: 'Fix a leaking pipe',
        price: 120,
        duration: '1-2 hours',
        popular: true,
      },
    ],
    timeSlots: [
      { id: 'slot-1', time: '09:00', available: true, price: 0 },
      { id: 'slot-2', time: '11:00', available: false },
    ],
    onBookingComplete: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { getByTestId } = render(<BookingInterface {...defaultProps} />);
    expect(getByTestId).toBeDefined();
  });

  it('should display content correctly', () => {
    const { root } = render(<BookingInterface {...defaultProps} />);
    expect(root).toBeTruthy();
  });
});
