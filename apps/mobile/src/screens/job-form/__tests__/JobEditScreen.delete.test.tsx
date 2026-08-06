/* eslint-disable import/first --
 * jest.mock factories are hoisted above imports, so the screen under test must
 * be imported after them. Same pattern as AssessmentHistoryScreen.test.tsx.
 */
/**
 * JobEditScreen — delete flow.
 *
 * Homeowners could edit but not delete a posted job on mobile (web already
 * had a Delete button in its edit form). These tests pin the new behaviour:
 * the button confirms first, only deletes on the destructive choice, refreshes
 * the cached list, routes to JobsList (NOT goBack, which would 404 on the
 * deleted job's detail screen), and surfaces a server refusal as an error.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

const mockGetJobById = jest.fn();
const mockDeleteJob = jest.fn();
jest.mock('../../../services/JobCRUDService', () => ({
  JobCRUDService: {
    getJobById: (...args: unknown[]) => mockGetJobById(...args),
    deleteJob: (...args: unknown[]) => mockDeleteJob(...args),
    updateJob: jest.fn(),
  },
}));

const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('../../../lib/queryClient', () => ({
  queryKeys: { jobs: { all: ['jobs'] } },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

// Discard-prompt guard is orthogonal to deletion — return a no-op release.
jest.mock('../../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import JobEditScreen from '../JobEditScreen';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const postedJob = {
  id: 'job-1',
  title: 'Plumbing issue',
  description: 'Leaky tap',
  category: 'Plumbing',
  priority: 'low',
  budget: 0,
  location: '1 peveril road, Stafford, ST161YS, GB',
  status: 'posted',
};

const renderScreen = () =>
  render(
    <JobEditScreen
      navigation={navigation as never}
      route={{ params: { jobId: 'job-1' } } as never}
    />
  );

// Tap the delete button, then invoke the destructive Alert choice.
const confirmDelete = async (getByTestId: (id: string) => unknown) => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  fireEvent.press(getByTestId('job-edit-delete-button') as never);
  expect(alertSpy).toHaveBeenCalledTimes(1);
  const buttons = alertSpy.mock.calls[0][2] as {
    text?: string;
    style?: string;
    onPress?: () => void;
  }[];
  const destructive = buttons.find((b) => b.style === 'destructive');
  expect(destructive?.text).toBe('Delete');
  await destructive?.onPress?.();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetJobById.mockResolvedValue(postedJob);
});

describe('JobEditScreen — delete', () => {
  it('confirms, deletes, refreshes the list, and routes to JobsList', async () => {
    mockDeleteJob.mockResolvedValue(undefined);
    const { getByTestId, getByDisplayValue } = renderScreen();

    // Wait for the form to hydrate from getJobById.
    await waitFor(() =>
      expect(getByDisplayValue('Plumbing issue')).toBeTruthy()
    );

    await confirmDelete(getByTestId);

    await waitFor(() => {
      expect(mockDeleteJob).toHaveBeenCalledWith('job-1');
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['jobs'],
      });
      expect(navigation.navigate).toHaveBeenCalledWith('JobsList');
    });
    // Must NOT fall back to goBack (deleted job's detail screen would 404).
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('does nothing when the confirmation is dismissed', async () => {
    const { getByTestId, getByDisplayValue } = renderScreen();
    await waitFor(() =>
      expect(getByDisplayValue('Plumbing issue')).toBeTruthy()
    );

    const alertSpy = jest.spyOn(Alert, 'alert');
    fireEvent.press(getByTestId('job-edit-delete-button'));
    const buttons = alertSpy.mock.calls[0][2] as {
      text?: string;
      style?: string;
    }[];
    expect(buttons.find((b) => b.style === 'cancel')?.text).toBe('Cancel');
    expect(mockDeleteJob).not.toHaveBeenCalled();
  });

  it('surfaces a server refusal without navigating away', async () => {
    mockDeleteJob.mockRejectedValue(
      new Error(
        'Cannot delete job with accepted bids. Please cancel the job instead'
      )
    );
    const { getByTestId, getByDisplayValue, findByText } = renderScreen();
    await waitFor(() =>
      expect(getByDisplayValue('Plumbing issue')).toBeTruthy()
    );

    await confirmDelete(getByTestId);

    expect(
      await findByText(/Cannot delete job with accepted bids/i)
    ).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
