
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render } from '../../test-utils';
import { JobCard } from '../../../components/JobCard';

describe('Card Components - Snapshots', () => {
  describe('JobCard', () => {
    it('should match snapshot for pending job', () => {
      const mockJob = {
        id: 'job_1',
        title: 'Plumbing Repair',
        description: 'Fix leaky faucet in bathroom',
        budget: 500,
        status: 'posted',
        urgency: 'high',
        created_at: '2024-01-01T10:00:00Z',
      };

      const { toJSON } = render(<JobCard job={mockJob} onPress={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for completed job', () => {
      const mockJob = {
        id: 'job_2',
        title: 'Electrical Work',
        status: 'completed',
        completed_at: '2024-01-02T15:00:00Z',
      };

      const { toJSON } = render(<JobCard job={mockJob} onPress={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

});
