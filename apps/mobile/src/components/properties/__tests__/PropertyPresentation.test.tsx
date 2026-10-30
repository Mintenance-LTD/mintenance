import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertyViewSwitcher } from '../PropertyViewSwitcher';
import { RoomPhotoAlbums } from '../../../screens/properties/components/RoomPhotoAlbums';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import * as ImagePicker from 'expo-image-picker';

const mockNavigate = jest.fn();
const mockSetView = jest.fn();
const mockPreference = {
  view: 'home',
  enabled: true,
  ready: true,
  saved: true,
  setView: mockSetView,
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../../hooks/usePropertyView', () => ({
  usePropertyView: () => mockPreference,
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-owner', role: 'homeowner' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    postFormData: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

function albums(editable = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RoomPhotoAlbums propertyId='property-one' editable={editable} />
    </QueryClientProvider>
  );
}
const rows = [
  {
    id: 'one',
    room_type: 'kitchen',
    file_name: 'first.png',
    photo_url: 'https://example.invalid/first.png',
    created_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'two',
    room_type: 'kitchen',
    file_name: 'older.png',
    photo_url: 'https://example.invalid/older.png',
    created_at: '2026-09-01T10:00:00Z',
  },
];
beforeEach(() => {
  jest.clearAllMocks();
  mockPreference.view = 'home';
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(mobileApiClient.get)
    .mockImplementation(async (url) =>
      url.includes('feature-access') ? { tier: 'landlord' } : { photos: rows }
    );
});
afterEach(() => jest.restoreAllMocks());
it('switches views and opens the separate plan screen', () => {
  const ui = render(<PropertyViewSwitcher />);
  fireEvent.press(ui.getByLabelText('Your view: My home'));
  fireEvent.press(ui.getByText('Agency'));
  expect(ui.queryByText('Agency')).toBeNull();
  fireEvent.press(ui.getByLabelText('Your view: My home'));
  expect(mockSetView).toHaveBeenCalledWith('agency');
  fireEvent.press(ui.getByText('Plan & features'));
  expect(mockNavigate).toHaveBeenCalledWith('ProfileTab', {
    screen: 'Subscription',
  });
});
it('dismisses the view chooser without changing the preference', () => {
  const ui = render(<PropertyViewSwitcher />);
  fireEvent.press(ui.getByLabelText('Your view: My home'));
  fireEvent.press(ui.getByLabelText('Close Your view'));
  expect(mockSetView).not.toHaveBeenCalled();
  expect(ui.queryByText('Agency')).toBeNull();
});
it('groups upload dates and filters an older album', async () => {
  const ui = albums();
  await ui.findByText('Uploaded 30 October 2026 · 1 photo');
  fireEvent.press(ui.getByLabelText('Upload date (UTC): All dates'));
  fireEvent.press(ui.getByText('Uploaded 1 September 2026'));
  expect(ui.queryByText('Uploaded 30 October 2026 · 1 photo')).toBeNull();
  expect(ui.getByText('Uploaded 1 September 2026 · 1 photo')).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Room: Kitchen'));
  fireEvent.press(ui.getByText('Bathroom'));
  expect(ui.getByText('No photos in this room yet.')).toBeTruthy();
});
it('never fetches paid photos for a free account even with Agency selected', async () => {
  mockPreference.view = 'agency';
  jest.mocked(mobileApiClient.get).mockResolvedValue({ tier: 'free' });
  const ui = albums();
  await ui.findByText(/Room photos require/);
  expect(mobileApiClient.get).toHaveBeenCalledTimes(1);
  expect(ui.queryByText('Take photo')).toBeNull();
});
it('keeps read-only property access read-only', async () => {
  const ui = albums(false);
  await ui.findByText('Uploaded 30 October 2026 · 1 photo');
  expect(ui.queryByText('Take photo')).toBeNull();
  expect(ui.queryByText('Delete photo')).toBeNull();
});
it('surfaces unavailable albums rather than a false empty state', async () => {
  jest.mocked(mobileApiClient.get).mockImplementation(async (url) => {
    if (url.includes('feature-access')) return { tier: 'agency' };
    throw Error('unavailable');
  });
  const ui = albums();
  await ui.findByText('Photos could not be loaded.');
  expect(ui.queryByText('No photos in this room yet.')).toBeNull();
});
it('requests camera permission only on tap and does not upload when denied', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
    granted: false,
  } as ImagePicker.CameraPermissionResponse);
  const ui = albums();
  await ui.findByText('Take photo');
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  fireEvent.press(ui.getByText('Take photo'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Camera permission needed',
      expect.any(String)
    )
  );
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  expect(mobileApiClient.postFormData).not.toHaveBeenCalled();
});
it('uploads one selected photo through the authenticated API without an invented capture date', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///room.jpg',
        mimeType: 'image/jpeg',
        fileName: 'room.jpg',
        fileSize: 512,
        width: 100,
        height: 100,
      },
    ],
  });
  jest.mocked(mobileApiClient.postFormData).mockResolvedValue({ uploaded: 1 });
  const ui = albums();
  await ui.findByText('Choose photo');
  fireEvent.press(ui.getByText('Choose photo'));
  await waitFor(() =>
    expect(mobileApiClient.postFormData).toHaveBeenCalledWith(
      '/api/properties/property-one/room-photos',
      expect.any(FormData),
      25000
    )
  );
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Photo uploaded',
      expect.stringContaining('capture date is not recorded')
    )
  );
});
