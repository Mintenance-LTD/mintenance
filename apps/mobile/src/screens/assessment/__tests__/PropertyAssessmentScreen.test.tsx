import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PropertyAssessmentScreen } from '../PropertyAssessmentScreen';
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-owner' } }),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('../PropertyAssessmentScreen/useAssessmentLocation', () => ({
  useAssessmentLocation: () => null,
}));
jest.mock('../PropertyAssessmentScreen/uploadPhotos', () => ({
  uploadPhotosToStorage: jest.fn(),
}));
jest.mock('../PropertyAssessmentScreen/triggerAIAnalysis', () => ({
  triggerAIAnalysis: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({}));
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const screen = () =>
  render(
    <PropertyAssessmentScreen
      navigation={navigation}
      route={{ params: { propertyId: 'synthetic-property' } }}
    />
  );
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ property_type: 'house', bedrooms: 2 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
async function completeVideo(view: ReturnType<typeof screen>) {
  fireEvent.press(view.getByLabelText('Video Walkthrough, pending'));
  const params = navigation.navigate.mock.calls[0][1];
  await act(async () => params.onComplete('saved-walkthrough'));
}
it('reopens completed property info and switches to notes without leaving the previous form open', async () => {
  const view = screen();
  await waitFor(() =>
    expect(view.getByText('1 of 3 required steps')).toBeTruthy()
  );
  fireEvent.press(view.getByLabelText('Property Information, completed'));
  expect(view.getByText('Save Property Info')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Manual Notes, pending'));
  expect(view.queryByText('Save Property Info')).toBeNull();
  expect(
    view.getByPlaceholderText(
      'Add your observations, context, or notes about the property...'
    )
  ).toBeTruthy();
});
it('allows review without optional photos/notes, but completes it only after a confirmed save', async () => {
  const view = screen();
  await waitFor(() =>
    expect(view.getByText('1 of 3 required steps')).toBeTruthy()
  );
  await completeVideo(view);
  fireEvent.press(view.getByLabelText('Review & Submit, pending'));
  expect(view.getByText('2 of 3 required steps')).toBeTruthy();
  expect(view.getByLabelText('Review & Submit, in progress')).toBeTruthy();
  mockPost.mockResolvedValue({ assessment: { id: 'saved-assessment' } });
  fireEvent.press(view.getByText('Submit Assessment'));
  await waitFor(() =>
    expect(view.getByText('3 of 3 required steps')).toBeTruthy()
  );
  expect(mockPost).toHaveBeenCalledTimes(1);
});
it('does not complete review after an incomplete response and retains the form for recovery', async () => {
  const view = screen();
  await waitFor(() =>
    expect(view.getByText('1 of 3 required steps')).toBeTruthy()
  );
  await completeVideo(view);
  fireEvent.press(view.getByLabelText('Review & Submit, pending'));
  mockPost.mockResolvedValue({});
  fireEvent.press(view.getByText('Submit Assessment'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('could not be confirmed')
    )
  );
  expect(view.getByText('2 of 3 required steps')).toBeTruthy();
});
it('does not overwrite typed property data when a late prefill resolves', async () => {
  let finish!: (value: unknown) => void;
  mockGet.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const view = screen();
  fireEvent.press(view.getByLabelText('Property Information, pending'));
  fireEvent.press(view.getByText('Flat'));
  fireEvent.changeText(view.getByPlaceholderText('e.g. 3'), '4');
  await act(async () => finish({ property_type: 'house', bedrooms: 2 }));
  expect(view.getByPlaceholderText('e.g. 3').props.value).toBe('4');
  expect(view.getByLabelText('Property Information, in progress')).toBeTruthy();
});
