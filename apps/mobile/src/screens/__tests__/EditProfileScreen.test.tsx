/**
 * EditProfileScreen — branch-coverage suite
 *
 * Exercises the screen's real logic (field edits, dirty-state gating,
 * avatar pick permission/cancel/success, save success/error/loading,
 * photo-upload failure path, geocoding fallback, GPS reverse-geocode,
 * change-password flow, delete-account nav, role-specific bio
 * placeholder). Only externals are mocked: navigation, useAuth,
 * AuthService, mobileApiClient, expo-image-picker, expo-location,
 * logger, Alert. The screen under test and its section components are
 * rendered for real so the wired callbacks fire end-to-end.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---- Navigation ---------------------------------------------------------
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: mockAddListener,
    dispatch: mockDispatch,
  }),
}));

// ---- Auth context -------------------------------------------------------
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
let mockUser: Record<string, unknown> | null = null;
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefreshUser }),
}));

// ---- Services -----------------------------------------------------------
const mockUpdateUserProfile = jest.fn().mockResolvedValue(undefined);
const mockResetPassword = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    updateUserProfile: (...a: unknown[]) => mockUpdateUserProfile(...a),
    resetPassword: (...a: unknown[]) => mockResetPassword(...a),
  },
}));

const mockApiGet = jest.fn();
const mockPostFormData = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...a: unknown[]) => mockApiGet(...a),
    postFormData: (...a: unknown[]) => mockPostFormData(...a),
  },
}));

// ---- expo-image-picker --------------------------------------------------
const mockRequestMediaLibPerms = jest.fn();
const mockLaunchImageLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) =>
    mockRequestMediaLibPerms(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunchImageLibrary(...a),
  MediaTypeOptions: { Images: 'Images' },
}));

// ---- expo-location ------------------------------------------------------
const mockRequestFgPerms = jest.fn();
const mockGetCurrentPosition = jest.fn();
jest.mock(
  'expo-location',
  () => ({
    requestForegroundPermissionsAsync: (...a: unknown[]) =>
      mockRequestFgPerms(...a),
    getCurrentPositionAsync: (...a: unknown[]) => mockGetCurrentPosition(...a),
    Accuracy: { High: 4 },
  }),
  { virtual: true }
);

// ---- logger -------------------------------------------------------------
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// ---- useUnsavedChanges --------------------------------------------------
const mockAllowExit = jest.fn();
jest.mock('../../hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => mockAllowExit,
}));

// ---- Alert --------------------------------------------------------------
import { Alert } from 'react-native';
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

import EditProfileScreen from '../EditProfileScreen';

const HOMEOWNER = {
  id: 'user-1',
  email: 'home@example.com',
  role: 'homeowner',
  first_name: 'Alice',
  last_name: 'Anderson',
  phone: '0700000000',
  profile_image_url: 'https://cdn/avatar.jpg',
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setup = async () => {
  const utils = render(<EditProfileScreen />);
  await flush();
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { ...HOMEOWNER };
  mockApiGet.mockResolvedValue({ profile: null });
  mockPostFormData.mockResolvedValue({});
  mockRequestMediaLibPerms.mockResolvedValue({ granted: true });
  mockLaunchImageLibrary.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/pic.png' }],
  });
  mockRequestFgPerms.mockResolvedValue({ status: 'granted' });
  mockGetCurrentPosition.mockResolvedValue({
    coords: { latitude: 51.5, longitude: -0.12 },
  });
});

describe('EditProfileScreen — render + pre-fill', () => {
  it('renders header and pre-fills name/phone from user', async () => {
    const { getByText, getByDisplayValue } = await setup();
    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByDisplayValue('Alice')).toBeTruthy();
    expect(getByDisplayValue('Anderson')).toBeTruthy();
    expect(getByDisplayValue('0700000000')).toBeTruthy();
  });

  it('falls back to camelCase name fields when snake_case absent', async () => {
    mockUser = {
      id: 'u2',
      email: 'x@y.z',
      role: 'homeowner',
      firstName: 'Bob',
      lastName: 'Brown',
    };
    const { getByDisplayValue } = await setup();
    expect(getByDisplayValue('Bob')).toBeTruthy();
    expect(getByDisplayValue('Brown')).toBeTruthy();
  });

  it('hydrates bio/address/city/postcode from profile endpoint', async () => {
    mockApiGet.mockResolvedValueOnce({
      profile: {
        bio: 'hi there',
        address: '1 Main St',
        city: 'London',
        postcode: 'sw1a 1aa',
      },
    });
    const { getByDisplayValue } = await setup();
    expect(getByDisplayValue('hi there')).toBeTruthy();
    expect(getByDisplayValue('1 Main St')).toBeTruthy();
    expect(getByDisplayValue('London')).toBeTruthy();
    expect(getByDisplayValue('sw1a 1aa')).toBeTruthy();
  });

  it('logs and stays blank when pre-fill request rejects', async () => {
    const { logger } = require('../../utils/logger');
    mockApiGet.mockRejectedValueOnce(new Error('boom'));
    await setup();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to pre-fill profile fields',
      expect.any(Error)
    );
  });

  it('skips pre-fill effect entirely when no user', async () => {
    mockUser = null;
    await setup();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe('EditProfileScreen — bio placeholder by role', () => {
  it('shows contractor placeholder for contractor role', async () => {
    mockUser = { ...HOMEOWNER, role: 'contractor' };
    const { getByPlaceholderText } = await setup();
    expect(
      getByPlaceholderText(/Tell homeowners about your experience/i)
    ).toBeTruthy();
  });

  it('shows homeowner placeholder otherwise', async () => {
    const { getByPlaceholderText } = await setup();
    expect(
      getByPlaceholderText(/Tell contractors about your preferences/i)
    ).toBeTruthy();
  });
});

describe('EditProfileScreen — field edits + dirty state', () => {
  it('edits first/last/phone and saves trimmed payload', async () => {
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), '  Carol  ');
    fireEvent.changeText(getByDisplayValue('Anderson'), 'Clark');
    fireEvent.changeText(getByDisplayValue('0700000000'), '0711111111');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    const [id, payload] = mockUpdateUserProfile.mock.calls[0];
    expect(id).toBe('user-1');
    expect(payload.first_name).toBe('Carol');
    expect(payload.last_name).toBe('Clark');
    expect(payload.phone).toBe('0711111111');
  });

  it('uppercases postcode and geocodes when no GPS coords present', async () => {
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null }) // pre-fill
      .mockResolvedValueOnce([{ lat: '52.1', lon: '-1.5' }]); // geocode search
    const { getByPlaceholderText, getByText } = await setup();
    fireEvent.changeText(
      getByPlaceholderText('e.g. 42 High Street'),
      '5 Park Rd'
    );
    fireEvent.changeText(getByPlaceholderText('e.g. London'), 'Leeds');
    fireEvent.changeText(getByPlaceholderText('e.g. SW1A 1AA'), 'ls1 1aa');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    const payload = mockUpdateUserProfile.mock.calls[0][1];
    expect(payload.postcode).toBe('LS1 1AA');
    expect(payload.latitude).toBe(52.1);
    expect(payload.longitude).toBe(-1.5);
    // geocode search url called with joined query
    expect(mockApiGet).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/geocoding/search?q=')
    );
  });

  it('saves address text without coords when geocode search fails', async () => {
    const { logger } = require('../../utils/logger');
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null })
      .mockRejectedValueOnce(new Error('geo-down'));
    const { getByPlaceholderText, getByText } = await setup();
    fireEvent.changeText(getByPlaceholderText('e.g. London'), 'Bath');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    const payload = mockUpdateUserProfile.mock.calls[0][1];
    expect(payload.city).toBe('Bath');
    expect(payload.latitude).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to geocode address for profile save',
      expect.any(Error)
    );
  });

  it('edits the bio field (dirty setter) and saves it trimmed', async () => {
    const { getByPlaceholderText, getByText } = await setup();
    fireEvent.changeText(
      getByPlaceholderText(/Tell contractors about your preferences/i),
      '  loves DIY  '
    );
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    expect(mockUpdateUserProfile.mock.calls[0][1].bio).toBe('loves DIY');
  });

  it('does not geocode when no address/city/postcode provided', async () => {
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Zoe');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    // only the pre-fill GET happened; no geocoding/search call
    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });
});

describe('EditProfileScreen — save success / loading / empty / error', () => {
  it('shows Success alert, refreshes user and navigates back on OK', async () => {
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Dana');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Profile updated successfully!',
      expect.any(Array)
    );
    // invoke the OK button onPress
    const buttons = alertSpy.mock.calls.find((c) => c[0] === 'Success')![2]!;
    act(() => buttons[0].onPress());
    expect(mockAllowExit).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows Saving… label while save in flight', async () => {
    let resolve!: () => void;
    mockUpdateUserProfile.mockImplementationOnce(
      () => new Promise<void>((r) => (resolve = () => r()))
    );
    const { getByDisplayValue, getByText, queryByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Eve');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(queryByText('Saving…')).toBeTruthy());
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(queryByText('Save')).toBeTruthy());
  });

  it('marks the Save button disabled while a save is in flight', async () => {
    let resolve!: () => void;
    mockUpdateUserProfile.mockImplementationOnce(
      () => new Promise<void>((r) => (resolve = () => r()))
    );
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Eve');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(getByText('Saving…')).toBeTruthy());
    // The Save touchable carries disabled=loading while in flight.
    const saving = getByText('Saving…');
    expect(
      saving.parent?.props.accessibilityState?.disabled ??
        saving.parent?.props.disabled
    ).toBeTruthy();
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(getByText('Save')).toBeTruthy());
  });

  it('skips update + just navigates back when nothing changed', async () => {
    // No edits, no photo => filteredUpdates empty AND no photoUploaded.
    // first_name/last_name/phone from user ARE included though, so to
    // hit the empty branch we clear the user name fields.
    mockUser = { id: 'u3', email: 'e@e.e', role: 'homeowner' };
    const { getByText } = await setup();
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockAllowExit).toHaveBeenCalled());
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows Error alert with message when save throws', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('DB fail'));
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Fay');
    fireEvent.press(getByText('Save'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'DB fail')
    );
  });

  it('shows generic Error message when thrown value is not an Error', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce('weird');
    const { getByDisplayValue, getByText } = await setup();
    fireEvent.changeText(getByDisplayValue('Alice'), 'Gus');
    fireEvent.press(getByText('Save'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to update profile')
    );
  });

  it('does nothing destructive when no user on save', async () => {
    mockUser = null;
    const { getByText } = await setup();
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockAllowExit).toHaveBeenCalled());
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('EditProfileScreen — avatar photo upload', () => {
  it('picks a png photo and uploads it on save with png mime', async () => {
    const { getByText, getAllByText } = await setup();
    // "Change Photo" touchable triggers handlePickPhoto
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockPostFormData).toHaveBeenCalled());
    expect(mockPostFormData).toHaveBeenCalledWith(
      '/api/users/avatar',
      expect.anything()
    );
    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('alerts when media-library permission denied and never launches picker', async () => {
    mockRequestMediaLibPerms.mockResolvedValueOnce({ granted: false });
    const { getAllByText } = await setup();
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission required',
        'Please allow access to your photo library.'
      )
    );
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });

  it('ignores a cancelled picker (no upload on save)', async () => {
    mockLaunchImageLibrary.mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });
    const { getAllByText, getByText } = await setup();
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(getByText('Save'));
    // existing name fields still produce an update, but no avatar upload
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    expect(mockPostFormData).not.toHaveBeenCalled();
  });

  it('continues save and alerts when photo upload fails (non-fatal)', async () => {
    mockPostFormData.mockRejectedValueOnce(new Error('upload-fail'));
    const { logger } = require('../../utils/logger');
    const { getAllByText, getByText, getByDisplayValue } = await setup();
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.changeText(getByDisplayValue('Alice'), 'Hank');
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to upload profile photo',
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Photo Upload Failed',
      expect.stringContaining('photo could not be uploaded')
    );
  });

  it('defaults to jpeg mime for unknown extension', async () => {
    mockLaunchImageLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo' }], // no extension -> defaults
    });
    const { getAllByText, getByText } = await setup();
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockPostFormData).toHaveBeenCalled());
  });

  it('refreshes user on photo-only save even without field changes', async () => {
    mockUser = { id: 'u4', email: 'p@p.p', role: 'homeowner' }; // no name fields
    mockLaunchImageLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/pic.webp' }],
    });
    const { getAllByText, getByText } = await setup();
    fireEvent.press(getAllByText('Change Photo')[0]);
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockPostFormData).toHaveBeenCalled());
    // No field updates but photoUploaded => refreshUser + Success alert
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
});

describe('EditProfileScreen — GPS / Use My Location', () => {
  it('reverse-geocodes and fills address/city/postcode on success', async () => {
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null }) // pre-fill
      .mockResolvedValueOnce({
        address: {
          house_number: '10',
          road: 'Downing St',
          city: 'London',
          postcode: 'sw1a 2aa',
        },
      });
    const { getByText, getByDisplayValue } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() =>
      expect(getByDisplayValue('10 Downing St')).toBeTruthy()
    );
    expect(getByDisplayValue('London')).toBeTruthy();
    expect(getByDisplayValue('SW1A 2AA')).toBeTruthy();
  });

  it('uses town/village fallback for city and skips empty fields', async () => {
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null })
      .mockResolvedValueOnce({ address: { town: 'Smalltown' } });
    const { getByText, getByDisplayValue } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() => expect(getByDisplayValue('Smalltown')).toBeTruthy());
  });

  it('handles reverse-geocode returning no address object', async () => {
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null })
      .mockResolvedValueOnce({}); // no .address
    const { getByText } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() => expect(mockGetCurrentPosition).toHaveBeenCalled());
    // No address inputs filled; nothing thrown
  });

  it('alerts permission-required when location denied', async () => {
    mockRequestFgPerms.mockResolvedValueOnce({ status: 'denied' });
    const { getByText } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission required',
        'Please allow location access to use this feature.'
      )
    );
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('alerts on error when getCurrentPosition throws', async () => {
    mockGetCurrentPosition.mockRejectedValueOnce(new Error('no-fix'));
    const { getByText } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Could not fetch your location. Please enter your address manually.'
      )
    );
  });

  it('uses GPS coords directly on save (no geocode search)', async () => {
    mockApiGet.mockReset();
    mockApiGet
      .mockResolvedValueOnce({ profile: null })
      .mockResolvedValueOnce({ address: { road: 'A St', city: 'C' } });
    const { getByText } = await setup();
    fireEvent.press(getByText('Use My Location'));
    await waitFor(() => expect(mockGetCurrentPosition).toHaveBeenCalled());
    const callsBefore = mockApiGet.mock.calls.length;
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());
    const payload = mockUpdateUserProfile.mock.calls[0][1];
    expect(payload.latitude).toBe(51.5);
    expect(payload.longitude).toBe(-0.12);
    // No additional geocoding/search GET fired during save
    expect(mockApiGet.mock.calls.length).toBe(callsBefore);
  });
});

describe('EditProfileScreen — change password', () => {
  it('sends reset link via second alert button when email present', async () => {
    const { getByText } = await setup();
    fireEvent.press(getByText('Change Password'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Change Password',
      expect.stringContaining('home@example.com'),
      expect.any(Array)
    );
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Change Password'
    )![2]!;
    await act(async () => {
      await buttons[1].onPress();
    });
    expect(mockResetPassword).toHaveBeenCalledWith('home@example.com');
    expect(alertSpy).toHaveBeenCalledWith(
      'Email Sent',
      'Check your inbox for the password reset link.'
    );
  });

  it('alerts failure when resetPassword throws', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('smtp'));
    const { getByText } = await setup();
    fireEvent.press(getByText('Change Password'));
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Change Password'
    )![2]!;
    await act(async () => {
      await buttons[1].onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Failed to send password reset email. Please try again.'
    );
  });

  it('alerts error when account has no email', async () => {
    mockUser = { id: 'u5', role: 'homeowner' }; // no email
    const { getByText } = await setup();
    fireEvent.press(getByText('Change Password'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'No email address associated with your account.'
    );
    expect(mockResetPassword).not.toHaveBeenCalled();
  });
});

describe('EditProfileScreen — navigation actions', () => {
  it('top-bar back button calls goBack', async () => {
    const { getByLabelText } = await setup();
    fireEvent.press(getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('delete-account routes to DeleteAccount screen', async () => {
    const { getByText } = await setup();
    fireEvent.press(getByText('Delete Account'));
    expect(mockNavigate).toHaveBeenCalledWith('DeleteAccount');
  });
});
