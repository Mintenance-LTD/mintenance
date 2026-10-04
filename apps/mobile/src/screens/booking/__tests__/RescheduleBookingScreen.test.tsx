import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RescheduleBookingScreen } from '../RescheduleBookingScreen';

const mockPatch = jest.fn();
const mockInvalidate = jest.fn();
const mockError = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { patch: (...args: unknown[]) => mockPatch(...args) },
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('../../../lib/queryClient', () => ({
  queryKeys: { jobs: { all: ['jobs'] } },
}));
jest.mock('../../../components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: mockError }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 4, 11, 0));
  mockPatch.mockResolvedValue({ success: true });
});
afterEach(() => jest.useRealTimers());

function screen() {
  return render(
    <RescheduleBookingScreen
      navigation={{ goBack: jest.fn() } as never}
      route={{ params: { bookingId: 'job' } } as never}
    />
  );
}

it('allows choosing today, including Sunday, and submits a future time', async () => {
  const view = screen();
  fireEvent.press(view.getByText('Date'));
  const picker = view.UNSAFE_getByType(DateTimePicker);
  expect(picker.props.minimumDate).toEqual(new Date(2026, 9, 4));
  fireEvent(picker, 'onChange', {}, new Date(2026, 9, 4));
  fireEvent.press(view.getByText('Confirm Reschedule'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith('/api/bookings/job/reschedule', {
      newDateTime: new Date(2026, 9, 4, 12, 0).toISOString(),
    })
  );
  expect(mockInvalidate).toHaveBeenCalledWith({
    queryKey: ['contractor-schedule'],
  });
});

it('rejects a time earlier today without sending a reschedule', () => {
  const view = screen();
  fireEvent.press(view.getByText('Time'));
  fireEvent(
    view.UNSAFE_getByType(DateTimePicker),
    'onChange',
    {},
    new Date(2026, 9, 4, 9, 0)
  );
  fireEvent.press(view.getByText('Confirm Reschedule'));
  expect(mockPatch).not.toHaveBeenCalled();
  expect(mockError).toHaveBeenCalledWith(
    'Choose a future time',
    expect.any(String)
  );
});
