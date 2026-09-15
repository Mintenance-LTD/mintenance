import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HomeownerPhotoReviewScreen } from '../../screens/job-details/HomeownerPhotoReviewScreen';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-homeowner' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
  useRoute: () => ({ params: { jobId: 'synthetic-job' } }),
}));
jest.mock('../../navigation/hooks', () => ({ goBackSafe: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobById: async () => ({ title: 'Synthetic rework', completed_at: null }),
  },
}));
jest.mock('../../services/PhotoUploadService', () => ({
  PhotoUploadService: {
    getJobPhotos: async () => [
      { id: 'before', photo_type: 'before', photo_url: '/before' },
      { id: 'after', photo_type: 'after', photo_url: '/after' },
    ],
  },
}));
jest.mock('../../screens/job-details/components/BeforeAfterSliderView', () => ({
  BeforeAfterSliderView: () => null,
}));

const post = mobileApiClient.post as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
const show = async () => {
  const view = render(<HomeownerPhotoReviewScreen />);
  fireEvent.press(await view.findByLabelText('Request changes to the work'));
  fireEvent.changeText(
    view.getByLabelText('Changes needed description'),
    ' Repair the seal '
  );
  return view;
};

it('keeps feedback and request identity after a lost response, then confirms replay', async () => {
  post
    .mockRejectedValueOnce(new Error('Connection interrupted'))
    .mockResolvedValueOnce({ success: true });
  const view = await show();
  fireEvent.press(view.getByLabelText('Submit change request'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Connection interrupted')
  );
  expect(view.getByLabelText('Changes needed description').props.value).toBe(
    ' Repair the seal '
  );
  fireEvent.press(view.getByLabelText('Submit change request'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Changes Requested',
      expect.any(String),
      expect.any(Array)
    )
  );
  expect(post).toHaveBeenCalledTimes(2);
  expect(post.mock.calls[1]).toEqual(post.mock.calls[0]);
  expect(post.mock.calls[0][1]).toEqual({ comments: 'Repair the seal' });
  expect(post.mock.calls[0][2].headers['Idempotency-Key']).toEqual(
    expect.any(String)
  );
});

it('does not show success when the response omits confirmation', async () => {
  post.mockResolvedValue({});
  const view = await show();
  fireEvent.press(view.getByLabelText('Submit change request'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Unable to confirm the change request. Please retry.'
    )
  );
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Changes needed description').props.value).toBe(
    ' Repair the seal '
  );
});
