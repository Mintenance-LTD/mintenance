import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CompleteWorkCTA } from '../CompleteWorkCTA';
import { mobileApiClient } from '../../../utils/mobileApiClient';
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn() },
}));
import { JobService } from '../../../services/JobService';
jest.mock('../../../lib/queryClient', () => ({
  queryKeys: { jobs: { all: ['jobs'] } },
}));
const mockInvalidate = jest.fn(async () => {});
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('../../../services/JobService', () => ({
  JobService: { completeJob: jest.fn() },
}));
jest.mock('../../../components/ui/StickyBottomCTA', () => {
  const { Button, View } = jest.requireActual('react-native');
  return {
    StickyBottomCTA: (p: any) => (
      <View>
        <Button testID='complete' title={p.buttonText} onPress={p.onPress} />
        <Button
          testID='upload'
          title={p.secondaryAction.label}
          onPress={p.secondaryAction.onPress}
        />
      </View>
    ),
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  (mobileApiClient.get as jest.Mock).mockResolvedValue({ requests: [] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
it('requires confirmation and refreshes jobs after completion', async () => {
  (JobService.completeJob as jest.Mock).mockResolvedValue(undefined);
  const view = render(<CompleteWorkCTA jobId='job-1' onUpload={jest.fn()} />);
  fireEvent.press(view.getByTestId('complete'));
  expect(JobService.completeJob).not.toHaveBeenCalled();
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
  await buttons[1].onPress();
  await waitFor(() =>
    expect(JobService.completeJob).toHaveBeenCalledWith('job-1')
  );
  expect(mockInvalidate).toHaveBeenCalled();
});
it('keeps upload accessible and reports rejected completion', async () => {
  const upload = jest.fn();
  (JobService.completeJob as jest.Mock).mockRejectedValue(
    new Error('After photo required')
  );
  const view = render(<CompleteWorkCTA jobId='job-1' onUpload={upload} />);
  fireEvent.press(view.getByTestId('upload'));
  expect(upload).toHaveBeenCalled();
  fireEvent.press(view.getByTestId('complete'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  await (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress();
  expect(Alert.alert).toHaveBeenCalledWith(
    'Could not complete work',
    'After photo required'
  );
  expect(mockInvalidate).not.toHaveBeenCalled();
});
it('shows the requested changes and submits the exact rework cycle after confirmation', async () => {
  (mobileApiClient.get as jest.Mock).mockResolvedValue({
    requests: [{ id: 'cycle-2', comments: 'Repair the edge' }],
  });
  (JobService.completeJob as jest.Mock).mockResolvedValue(undefined);
  const view = render(<CompleteWorkCTA jobId='job-1' onUpload={jest.fn()} />);
  fireEvent.press(view.getByTestId('complete'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Submit rework for review?',
      expect.stringContaining('Repair the edge'),
      expect.any(Array)
    )
  );
  expect(JobService.completeJob).not.toHaveBeenCalled();
  await (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress();
  expect(JobService.completeJob).toHaveBeenCalledWith('job-1', 'cycle-2');
});
it('does not submit when current-cycle lookup fails', async () => {
  (mobileApiClient.get as jest.Mock).mockRejectedValue(
    new Error('Cannot verify rework')
  );
  const view = render(<CompleteWorkCTA jobId='job-1' onUpload={jest.fn()} />);
  fireEvent.press(view.getByTestId('complete'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Could not check completion',
      'Cannot verify rework'
    )
  );
  expect(JobService.completeJob).not.toHaveBeenCalled();
});
