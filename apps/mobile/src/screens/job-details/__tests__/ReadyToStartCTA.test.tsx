/**
 * ReadyToStartCTA — start-job CTA for the ready-to-start sub-state. Mocks
 * StickyBottomCTA (to a pressable), JobService, react-query client and Alert.
 * Covers success, error, and the double-tap ref guard.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockStartJob = jest.fn();
jest.mock('../../../services/JobService', () => ({
  __esModule: true,
  JobService: { startJob: (...a: unknown[]) => mockStartJob(...a) },
}));

jest.mock('@tanstack/react-query', () => ({
  __esModule: true,
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('../../../lib/queryClient', () => ({
  __esModule: true,
  queryKeys: {
    jobs: { details: () => ['jobs', 'detail'], lists: () => ['jobs', 'list'] },
  },
}));

jest.mock('../../../components/ui/StickyBottomCTA', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    StickyBottomCTA: ({
      buttonText,
      onPress,
      disabled,
    }: {
      buttonText: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        { onPress, disabled, testID: 'start-cta' },
        React.createElement(Text, null, buttonText)
      ),
  };
});

import { ReadyToStartCTA } from '../ReadyToStartCTA';

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockStartJob.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => alertSpy.mockRestore());

describe('ReadyToStartCTA', () => {
  it('starts the job and notifies on success', async () => {
    const onStarted = jest.fn();
    const { getByTestId } = render(
      <ReadyToStartCTA jobId='j1' onStarted={onStarted} />
    );
    fireEvent.press(getByTestId('start-cta'));
    await waitFor(() => expect(mockStartJob).toHaveBeenCalledWith('j1'));
    expect(onStarted).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Job Started', expect.any(String));
  });

  it('alerts with the error message on failure', async () => {
    mockStartJob.mockRejectedValueOnce(new Error('escrow not funded'));
    const { getByTestId } = render(
      <ReadyToStartCTA jobId='j1' onStarted={jest.fn()} />
    );
    fireEvent.press(getByTestId('start-cta'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Could Not Start Job',
        'escrow not funded'
      )
    );
  });

  it('guards against a fast double-tap', async () => {
    let resolveStart: () => void = () => {};
    mockStartJob.mockReturnValue(new Promise<void>((r) => (resolveStart = r)));
    const { getByTestId } = render(
      <ReadyToStartCTA jobId='j1' onStarted={jest.fn()} />
    );
    const cta = getByTestId('start-cta');
    fireEvent.press(cta);
    fireEvent.press(cta); // second tap while in-flight
    resolveStart();
    await waitFor(() => expect(mockStartJob).toHaveBeenCalledTimes(1));
  });
});
