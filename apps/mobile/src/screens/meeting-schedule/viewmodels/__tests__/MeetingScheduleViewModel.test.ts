/**
 * Unit tests for useMeetingScheduleViewModel.
 * Mocks expo-location, MeetingService, Alert, useAuth, logger. Covers the
 * initializeLocation effect (granted / denied / error), scheduleMeeting
 * (missing-info / success / error) and the simple setters.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockReqPerm = jest.fn();
const mockGetPos = jest.fn();
const mockReverseGeocode = jest.fn();
jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: (...a: unknown[]) => mockReqPerm(...a),
  getCurrentPositionAsync: (...a: unknown[]) => mockGetPos(...a),
  reverseGeocodeAsync: (...a: unknown[]) => mockReverseGeocode(...a),
}));

const mockCreateMeeting = jest.fn();
jest.mock('@/services/MeetingService', () => ({
  __esModule: true,
  MeetingService: {
    createMeeting: (...a: unknown[]) => mockCreateMeeting(...a),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext-fallback', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

import { useMeetingScheduleViewModel } from '../MeetingScheduleViewModel';

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'h1' } });
  mockReqPerm.mockResolvedValue({ status: 'granted' });
  mockGetPos.mockResolvedValue({ coords: { latitude: 51.5, longitude: -0.1 } });
  mockReverseGeocode.mockResolvedValue([
    { streetNumber: '1', street: 'High St', city: 'London' },
  ]);
  mockCreateMeeting.mockResolvedValue({ id: 'm1' });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => alertSpy.mockRestore());

async function ready() {
  const hook = renderHook(() => useMeetingScheduleViewModel('c1', 'j1'));
  await waitFor(() =>
    expect(hook.result.current.locationStatus).not.toBe('loading')
  );
  return hook.result;
}

describe('initializeLocation', () => {
  it('resolves the current location on permission grant', async () => {
    const result = await ready();
    expect(result.current.locationStatus).toBe('success');
    expect(result.current.location).toEqual({
      latitude: 51.5,
      longitude: -0.1,
    });
  });

  it('handles an empty reverse-geocode result', async () => {
    mockReverseGeocode.mockResolvedValue([]);
    const result = await ready();
    expect(result.current.locationStatus).toBe('success');
  });

  it('sets error status + alerts when permission is denied', async () => {
    mockReqPerm.mockResolvedValue({ status: 'denied' });
    const result = await ready();
    expect(result.current.locationStatus).toBe('error');
    expect(alertSpy).toHaveBeenCalledWith(
      'Permission Required',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('sets error status when location lookup throws', async () => {
    mockGetPos.mockRejectedValue(new Error('gps boom'));
    const result = await ready();
    expect(result.current.locationStatus).toBe('error');
    expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String));
  });
});

describe('scheduleMeeting', () => {
  it('alerts when required info is missing (no location)', async () => {
    mockReqPerm.mockResolvedValue({ status: 'denied' }); // -> no location
    const result = await ready();
    await act(async () => {
      await result.current.scheduleMeeting();
    });
    expect(mockCreateMeeting).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('Missing')
    );
  });

  it('creates the meeting and shows success', async () => {
    const result = await ready();
    await act(async () => {
      await result.current.scheduleMeeting();
    });
    expect(mockCreateMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'j1',
        contractorId: 'c1',
        homeownerId: 'h1',
      })
    );
    expect(alertSpy).toHaveBeenCalledWith('Success', expect.any(String));
  });

  it('alerts on a creation failure', async () => {
    mockCreateMeeting.mockRejectedValueOnce(new Error('create boom'));
    const result = await ready();
    await act(async () => {
      await result.current.scheduleMeeting();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('Failed')
    );
  });
});

describe('setters + goBack + meetingTypes', () => {
  it('exposes the three meeting types and updates form fields', async () => {
    const result = await ready();
    expect(result.current.meetingTypes).toHaveLength(3);
    const date = new Date('2026-07-01T10:00:00Z');
    act(() => {
      result.current.setSelectedDate(date);
      result.current.setSelectedTime(date);
      result.current.setShowDatePicker(true);
      result.current.setShowTimePicker(true);
      result.current.setMeetingType('consultation');
      result.current.setDuration(30);
      result.current.setNotes('bring ladder');
      result.current.goBack();
    });
    expect(result.current.meetingType).toBe('consultation');
    expect(result.current.duration).toBe(30);
    expect(result.current.notes).toBe('bring ladder');
    expect(result.current.showDatePicker).toBe(true);
  });
});
