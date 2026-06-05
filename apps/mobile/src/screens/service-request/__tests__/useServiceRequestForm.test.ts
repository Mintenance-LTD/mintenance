/**
 * Unit tests for useServiceRequestForm.
 *
 * The hook is plain form business logic. We mock ONLY externals:
 *   - react-navigation useRoute (params)
 *   - @tanstack/react-query useQuery (properties fetch)
 *   - AuthContext-fallback useAuth (jest.config maps the source's
 *     `../../contexts/AuthContext` import to the fallback module)
 *   - expo-image-picker (permissions + launch)
 *   - JobService.createJob / LocationService.getCurrentLocation
 *   - utils/uploadJobPhotos (dynamic import)
 *   - @mintenance/security sanitize
 * validateJobDraft (@mintenance/api-contracts) is intentionally REAL —
 * it is pure logic and the hook's behaviour depends on its output.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { JobService } from '../../../services/JobService';
import { LocationService } from '../../../services/LocationService';
import { useServiceRequestForm } from '../useServiceRequestForm';
import { serviceCategories, type ServiceCategory } from '../types';

// ---------------------------------------------------------------------------
// Mocks (declared before importing the unit under test)
// ---------------------------------------------------------------------------

const mockUseRoute = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockApiGet = jest.fn();
jest.mock('@/utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext-fallback', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../../services/JobService', () => ({
  JobService: { createJob: jest.fn() },
}));

jest.mock('../../../services/LocationService', () => ({
  LocationService: { getCurrentLocation: jest.fn() },
}));

const mockUploadJobPhotos = jest.fn();
jest.mock('../../../utils/uploadJobPhotos', () => ({
  uploadJobPhotos: (...args: unknown[]) => mockUploadJobPhotos(...args),
}));

jest.mock('@mintenance/security', () => ({
  sanitize: {
    text: (v: string) => `text:${v}`,
    jobDescription: (v: string) => `desc:${v}`,
    address: (v: string) => `addr:${v}`,
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const requestCameraPermissionsAsync =
  ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const requestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchCameraAsync = ImagePicker.launchCameraAsync as jest.Mock;
const launchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.Mock;
const createJob = JobService.createJob as jest.Mock;
const getCurrentLocation = LocationService.getCurrentLocation as jest.Mock;
const alertSpy = Alert.alert as unknown as jest.Mock;

const plumbing = serviceCategories.find((c) => c.id === 'plumbing')!;
const electrical = serviceCategories.find((c) => c.id === 'electrical')!;

const VALID_DESC = 'The kitchen tap is leaking badly and needs urgent repair.';

interface SetupOpts {
  user?: { id: string } | null;
  routeParams?: { propertyId?: string; priority?: 'low' | 'medium' | 'high' };
  properties?: unknown[] | undefined;
}

function setup(opts: SetupOpts = {}) {
  const { user = { id: 'user-1' }, routeParams = {}, properties } = opts;
  mockUseAuth.mockReturnValue({ user });
  mockUseRoute.mockReturnValue({ params: routeParams });
  // useQuery only returns the data shape the hook reads.
  mockUseQuery.mockReturnValue({ data: properties });
  const onSuccess = jest.fn();
  const view = renderHook(() => useServiceRequestForm(onSuccess));
  return { ...view, onSuccess };
}

/** Drive the form into a state where validateJobDraft passes. */
function fillValid(result: {
  current: ReturnType<typeof useServiceRequestForm>;
}) {
  act(() => result.current.handleCategorySelect(plumbing));
  act(() => result.current.handleSubcategorySelect('Leaking'));
  act(() => result.current.setTitle('Fix the leaking kitchen tap'));
  act(() => result.current.setDescription(VALID_DESC));
  act(() => result.current.setLocation('10 Downing Street, London'));
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

// ---------------------------------------------------------------------------
// Initial state + route param derivation
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — initial state', () => {
  it('initialises with empty/default values', () => {
    const { result } = setup();
    expect(result.current.selectedCategory).toBeNull();
    expect(result.current.selectedSubcategory).toBe('');
    expect(result.current.title).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.location).toBe('');
    expect(result.current.priority).toBe('medium');
    expect(result.current.photos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedProperty).toBeNull();
  });

  it('seeds priority from route param when present', () => {
    const { result } = setup({ routeParams: { priority: 'high' } });
    expect(result.current.priority).toBe('high');
  });

  it('configures the properties query (enabled when user present) and its queryFn fetches /api/properties', async () => {
    setup();
    const cfg = mockUseQuery.mock.calls[0][0] as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
      enabled: boolean;
    };
    expect(cfg.queryKey).toEqual(['properties', 'user-1']);
    expect(cfg.enabled).toBe(true);

    mockApiGet.mockResolvedValueOnce({ properties: [{ id: 'p1' }] });
    await expect(cfg.queryFn()).resolves.toEqual([{ id: 'p1' }]);
    expect(mockApiGet).toHaveBeenCalledWith('/api/properties');
  });

  it('queryFn returns an empty array when the API omits properties', async () => {
    setup();
    const cfg = mockUseQuery.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };
    mockApiGet.mockResolvedValueOnce({});
    await expect(cfg.queryFn()).resolves.toEqual([]);
  });

  it('disables the query when no user is authenticated', () => {
    setup({ user: null });
    const cfg = mockUseQuery.mock.calls[0][0] as { enabled: boolean };
    expect(cfg.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property pre-fill effects
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — property pre-fill', () => {
  it('pre-fills the property matching the route propertyId param', () => {
    const props = [
      { id: 'p1', address: '1 First St', is_primary: false },
      { id: 'p2', address: '2 Second St', is_primary: true },
    ];
    const { result } = setup({
      routeParams: { propertyId: 'p2' },
      properties: props,
    });
    expect(result.current.selectedProperty).toMatchObject({ id: 'p2' });
    expect(result.current.location).toBe('2 Second St');
  });

  it('auto-selects the primary property when no param is passed', () => {
    const props = [
      { id: 'p1', address: '1 First St', is_primary: false },
      { id: 'p2', address: '2 Second St', is_primary: true },
    ];
    const { result } = setup({ properties: props });
    expect(result.current.selectedProperty).toMatchObject({ id: 'p2' });
    expect(result.current.location).toBe('2 Second St');
  });

  it('falls back to the first property when none is marked primary', () => {
    const props = [
      { id: 'p1', address: '1 First St', is_primary: false },
      { id: 'p2', address: '2 Second St', is_primary: false },
    ];
    const { result } = setup({ properties: props });
    expect(result.current.selectedProperty).toMatchObject({ id: 'p1' });
    expect(result.current.location).toBe('1 First St');
  });

  it('handles a missing route propertyId match without selecting anything', () => {
    const props = [{ id: 'p1', address: '1 First St', is_primary: false }];
    const { result } = setup({
      routeParams: { propertyId: 'nope' },
      properties: props,
    });
    // propertyId set => auto-primary effect is gated off; no match => null
    expect(result.current.selectedProperty).toBeNull();
  });

  it('uses empty string when the selected property has no address', () => {
    const props = [{ id: 'p1', is_primary: true }];
    const { result } = setup({ properties: props });
    expect(result.current.selectedProperty).toMatchObject({ id: 'p1' });
    expect(result.current.location).toBe('');
  });

  it('does nothing when properties list is empty', () => {
    const { result } = setup({ properties: [] });
    expect(result.current.selectedProperty).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Category / subcategory selection
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — category selection', () => {
  it('sets category, resets subcategory and seeds a title', () => {
    const { result } = setup();
    act(() => result.current.handleSubcategorySelect('Leaking'));
    act(() => result.current.handleCategorySelect(plumbing));
    expect(result.current.selectedCategory).toEqual(plumbing);
    expect(result.current.selectedSubcategory).toBe('');
    expect(result.current.title).toBe('Plumbing Service Request');
  });

  it('refreshes location from the selected property on category select', () => {
    const props = [{ id: 'p1', address: 'Primary Addr', is_primary: true }];
    const { result } = setup({ properties: props });
    act(() => result.current.setLocation('something else'));
    act(() => result.current.handleCategorySelect(electrical));
    expect(result.current.location).toBe('Primary Addr');
  });

  it('builds the subcategory title when a category is already chosen', () => {
    const { result } = setup();
    act(() => result.current.handleCategorySelect(plumbing));
    act(() => result.current.handleSubcategorySelect('Blocked Drain'));
    expect(result.current.selectedSubcategory).toBe('Blocked Drain');
    expect(result.current.title).toBe('Blocked Drain - Plumbing');
  });

  it('sets subcategory without a title when no category is selected', () => {
    const { result } = setup();
    act(() => result.current.handleSubcategorySelect('Orphan'));
    expect(result.current.selectedSubcategory).toBe('Orphan');
    expect(result.current.title).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Photo picking: permissions
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — image picker permissions', () => {
  it('alerts and aborts when permissions are denied', async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Permissions Required',
      expect.stringContaining('camera and photo library'),
      [{ text: 'OK' }]
    );
    expect(launchCameraAsync).not.toHaveBeenCalled();
  });

  it('alerts when only the library permission is denied', async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Permissions Required',
      expect.any(String),
      [{ text: 'OK' }]
    );
  });
});

// ---------------------------------------------------------------------------
// Photo picking: iOS ActionSheet branch
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — image picker (iOS ActionSheet)', () => {
  let showActionSheet: jest.Mock;

  beforeEach(() => {
    Platform.OS = 'ios';
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    // ActionSheetIOS is not in the RN mock; attach a controllable stub.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require('react-native');
    showActionSheet = jest.fn();
    RN.ActionSheetIOS = { showActionSheetWithOptions: showActionSheet };
  });

  it('takes a photo when "Take Photo" (index 1) is chosen', async () => {
    launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://camera.jpg' }],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const cb = showActionSheet.mock.calls[0][1];
    await act(async () => {
      await cb(1);
    });
    expect(launchCameraAsync).toHaveBeenCalled();
    expect(result.current.photos).toEqual(['file://camera.jpg']);
  });

  it('opens the library when "Choose from Library" (index 2) is chosen', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://lib.jpg' }],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const cb = showActionSheet.mock.calls[0][1];
    await act(async () => {
      await cb(2);
    });
    expect(launchImageLibraryAsync).toHaveBeenCalled();
    expect(result.current.photos).toEqual(['file://lib.jpg']);
  });

  it('does nothing when Cancel (index 0) is chosen', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const cb = showActionSheet.mock.calls[0][1];
    await act(async () => {
      await cb(0);
    });
    expect(launchCameraAsync).not.toHaveBeenCalled();
    expect(launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Photo picking: Android Alert branch + camera/library outcomes
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — image picker (Android Alert)', () => {
  beforeEach(() => {
    Platform.OS = 'android';
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
  });

  it('adds a camera photo (Alert auto-presses the first/cancel button — no-op)', async () => {
    // The RN Alert mock auto-presses the FIRST button (Cancel, no onPress),
    // so this exercises the Android branch wiring without launching.
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Select Photo',
      'Choose how you want to add a photo',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Take Photo' }),
        expect.objectContaining({ text: 'Choose from Library' }),
      ])
    );
  });

  it('invokes the Take Photo onPress handler directly and appends the asset', async () => {
    Platform.OS = 'android';
    launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://a.jpg' }],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const takePhoto = buttons.find(
      (b: { text: string }) => b.text === 'Take Photo'
    );
    await act(async () => {
      await takePhoto.onPress();
    });
    expect(result.current.photos).toEqual(['file://a.jpg']);
  });

  it('ignores a cancelled camera result', async () => {
    launchCameraAsync.mockResolvedValue({ canceled: true });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const takePhoto = buttons.find(
      (b: { text: string }) => b.text === 'Take Photo'
    );
    await act(async () => {
      await takePhoto.onPress();
    });
    expect(result.current.photos).toEqual([]);
  });

  it('alerts when the camera throws', async () => {
    launchCameraAsync.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const takePhoto = buttons.find(
      (b: { text: string }) => b.text === 'Take Photo'
    );
    await act(async () => {
      await takePhoto.onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to take photo');
  });

  it('invokes the Choose from Library onPress handler and appends the asset', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://b.jpg' }],
    });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const choose = buttons.find(
      (b: { text: string }) => b.text === 'Choose from Library'
    );
    await act(async () => {
      await choose.onPress();
    });
    expect(result.current.photos).toEqual(['file://b.jpg']);
  });

  it('ignores a cancelled library result', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const choose = buttons.find(
      (b: { text: string }) => b.text === 'Choose from Library'
    );
    await act(async () => {
      await choose.onPress();
    });
    expect(result.current.photos).toEqual([]);
  });

  it('alerts when the library throws', async () => {
    launchImageLibraryAsync.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await act(async () => {
      await result.current.showImagePickerOptions();
    });
    const buttons = alertSpy.mock.calls.find(
      (c) => c[0] === 'Select Photo'
    )![2];
    const choose = buttons.find(
      (b: { text: string }) => b.text === 'Choose from Library'
    );
    await act(async () => {
      await choose.onPress();
    });
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to select photo');
  });
});

// ---------------------------------------------------------------------------
// removePhoto
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — removePhoto', () => {
  it('removes the photo at the given index', async () => {
    Platform.OS = 'android';
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    launchCameraAsync
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'u0' }] })
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'u1' }] });
    const { result } = setup();

    const addOne = async () => {
      await act(async () => {
        await result.current.showImagePickerOptions();
      });
      const buttons = alertSpy.mock.calls
        .filter((c) => c[0] === 'Select Photo')
        .pop()![2];
      const takePhoto = buttons.find(
        (b: { text: string }) => b.text === 'Take Photo'
      );
      await act(async () => {
        await takePhoto.onPress();
      });
    };
    await addOne();
    await addOne();
    expect(result.current.photos).toEqual(['u0', 'u1']);

    act(() => result.current.removePhoto(0));
    expect(result.current.photos).toEqual(['u1']);
  });
});

// ---------------------------------------------------------------------------
// handleSubmit — validation guards
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — handleSubmit guards', () => {
  it('blocks submit when no category/subcategory selected', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Please pick a service category'
    );
    expect(createJob).not.toHaveBeenCalled();
  });

  it('blocks submit when category set but subcategory missing', async () => {
    const { result } = setup();
    act(() => result.current.handleCategorySelect(plumbing));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Please pick a service category'
    );
    expect(createJob).not.toHaveBeenCalled();
  });

  it('blocks submit when the user is not logged in', async () => {
    const { result } = setup({ user: null });
    act(() => result.current.handleCategorySelect(plumbing));
    act(() => result.current.handleSubcategorySelect('Leaking'));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'You must be logged in to request a service'
    );
    expect(createJob).not.toHaveBeenCalled();
  });

  it('surfaces the first validateJobDraft error (short description)', async () => {
    const { result } = setup();
    act(() => result.current.handleCategorySelect(plumbing));
    act(() => result.current.handleSubcategorySelect('Leaking'));
    act(() => result.current.setTitle('Valid title here'));
    act(() => result.current.setDescription('too short'));
    act(() => result.current.setLocation('10 Downing Street'));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Cannot post yet',
      expect.stringContaining('Description must be at least 20 characters')
    );
    expect(createJob).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleSubmit — success paths
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — handleSubmit success', () => {
  it('uploads photos, captures geolocation and creates a sanitized job', async () => {
    mockUploadJobPhotos.mockResolvedValue(['https://cdn/photo1.jpg']);
    getCurrentLocation.mockResolvedValue({ latitude: 51.5, longitude: -0.12 });
    createJob.mockResolvedValue({ id: 'job-1' });

    const propId = '11111111-1111-4111-8111-111111111111';
    const props = [{ id: propId, address: 'Primary Addr', is_primary: true }];
    const { result, onSuccess } = setup({ properties: props });
    act(() => result.current.handleCategorySelect(plumbing));
    act(() => result.current.handleSubcategorySelect('Leaking'));
    act(() => result.current.setTitle('Fix the leaking kitchen tap'));
    act(() => result.current.setDescription(VALID_DESC));
    act(() => result.current.setLocation('10 Downing Street, London'));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUploadJobPhotos).toHaveBeenCalledWith([]);
    expect(createJob).toHaveBeenCalledTimes(1);
    const payload = createJob.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: 'text:Fix the leaking kitchen tap',
      description: `desc:${VALID_DESC}`,
      location: 'addr:10 Downing Street, London',
      homeownerId: 'user-1',
      category: 'plumbing',
      subcategory: 'text:Leaking',
      urgency: 'medium',
      photos: ['https://cdn/photo1.jpg'],
      property_id: propId,
      latitude: 51.5,
      longitude: -0.12,
    });
    // had photos -> no contractor_before_photos opt-in
    expect(payload.requirements).toBeUndefined();
    // success alert auto-fires OK -> onSuccess
    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      expect.stringContaining('posted successfully'),
      expect.any(Array)
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('flips contractor_before_photos when no photos uploaded', async () => {
    mockUploadJobPhotos.mockResolvedValue([]);
    getCurrentLocation.mockResolvedValue(null);
    createJob.mockResolvedValue({ id: 'job-2' });

    const { result } = setup();
    fillValid(result);
    await act(async () => {
      await result.current.handleSubmit();
    });

    const payload = createJob.mock.calls[0][0];
    expect(payload.requirements).toEqual({ contractor_before_photos: true });
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
    // no subcategory sanitize when subcategory falsy? subcategory IS set here
    expect(payload.subcategory).toBe('text:Leaking');
  });

  it('continues without geolocation when LocationService throws', async () => {
    mockUploadJobPhotos.mockResolvedValue(['u']);
    getCurrentLocation.mockRejectedValue(new Error('no gps'));
    createJob.mockResolvedValue({ id: 'job-3' });

    const { result } = setup();
    fillValid(result);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createJob).toHaveBeenCalledTimes(1);
    const payload = createJob.mock.calls[0][0];
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// handleSubmit — error path
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — handleSubmit failure', () => {
  it('alerts with the Error message and clears loading when createJob throws', async () => {
    mockUploadJobPhotos.mockResolvedValue([]);
    getCurrentLocation.mockResolvedValue(null);
    createJob.mockRejectedValue(new Error('server exploded'));

    const { result, onSuccess } = setup();
    fillValid(result);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'server exploded');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('uses a generic message when a non-Error value is thrown', async () => {
    mockUploadJobPhotos.mockResolvedValue([]);
    getCurrentLocation.mockResolvedValue(null);
    createJob.mockRejectedValue('string failure');

    const { result } = setup();
    fillValid(result);
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Failed to post service request'
    );
  });
});

// ---------------------------------------------------------------------------
// Controlled setters expose state
// ---------------------------------------------------------------------------

describe('useServiceRequestForm — controlled setters', () => {
  it('exposes setTitle/setDescription/setLocation/setPriority/setSelectedProperty', () => {
    const { result } = setup();
    act(() => result.current.setTitle('T'));
    act(() => result.current.setDescription('D'));
    act(() => result.current.setLocation('L'));
    act(() => result.current.setPriority('low'));
    act(() =>
      result.current.setSelectedProperty({ id: 'x', address: 'A' } as never)
    );
    expect(result.current.title).toBe('T');
    expect(result.current.description).toBe('D');
    expect(result.current.location).toBe('L');
    expect(result.current.priority).toBe('low');
    expect(result.current.selectedProperty).toMatchObject({ id: 'x' });
  });
});
