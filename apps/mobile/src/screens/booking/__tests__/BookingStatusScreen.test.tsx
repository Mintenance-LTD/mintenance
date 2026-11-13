import React from 'react';
import { Alert, Pressable as MockPressable, Text as MockText, View as MockView } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BookingStatusScreen, type Booking } from '../BookingStatusScreen';

let mockUser: { id: string; role: 'homeowner' } | null;
const mockLoad = jest.fn();
const mockCancel = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../components/shared', () => ({ MintScreenBackBar: () => null }));
jest.mock('../BookingService', () => ({ BookingService: jest.fn().mockImplementation(() => ({
  loadUserBookings: mockLoad,
  cancelBooking: mockCancel,
})) }));
jest.mock('../BookingLoading', () => ({ BookingLoading: () => null }));
jest.mock('../BookingTabs', () => ({ BookingTabs: () => null }));
jest.mock('../BookingList', () => ({ BookingList: ({ bookings, onCancel }: {
  bookings: Booking[]; onCancel: (booking: Booking) => void;
}) => <MockView>{bookings.map(booking => <MockView key={booking.id}>
  <MockText>{booking.serviceName}</MockText>
  <MockPressable onPress={() => onCancel(booking)}><MockText>{`Cancel ${booking.id}`}</MockText></MockPressable>
</MockView>)}</MockView> }));
jest.mock('../CancellationModal', () => ({ CancellationModal: ({ visible, onConfirm }: {
  visible: boolean; onConfirm: (reason: string) => Promise<void>;
}) => visible ? <MockPressable onPress={() => { void onConfirm('Schedule change'); }}><MockText>Confirm cancellation</MockText></MockPressable> : null }));

const booking: Booking = {
  id: 'booking-1', contractorName: 'Contractor', serviceName: 'Kitchen repair',
  address: 'Test address', serviceId: 'job-1', date: '2026-11-13', time: '10:00',
  status: 'upcoming', amount: 120, canCancel: true, canReschedule: true, estimatedDuration: '1 hour',
};
const navigation = { navigate: jest.fn() } as unknown as React.ComponentProps<typeof BookingStatusScreen>['navigation'];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('BookingStatusScreen request and cancellation safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'homeowner-1', role: 'homeowner' };
    mockLoad.mockResolvedValue([booking]);
    mockCancel.mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('restores an upcoming booking and offers retry when cancellation fails', async () => {
    const pending = deferred<void>();
    mockCancel.mockReturnValue(pending.promise);
    const screen = render(<BookingStatusScreen navigation={navigation} />);
    fireEvent.press(await screen.findByText('Cancel booking-1'));
    fireEvent.press(screen.getByText('Confirm cancellation'));
    expect(screen.queryByText('Kitchen repair')).toBeNull();
    await act(async () => pending.reject(new Error('Network unavailable')));
    expect(screen.getByText('Kitchen repair')).toBeTruthy();
    expect(screen.getByText('Confirm cancellation')).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith('Unable to cancel booking', expect.any(String));
    mockCancel.mockResolvedValue(undefined);
    fireEvent.press(screen.getByText('Confirm cancellation'));
    await waitFor(() => expect(screen.queryByText('Confirm cancellation')).toBeNull());
    expect(screen.queryByText('Kitchen repair')).toBeNull();
  });

  it('submits only one cancellation while the request is pending', async () => {
    const pending = deferred<void>();
    mockCancel.mockReturnValue(pending.promise);
    const screen = render(<BookingStatusScreen navigation={navigation} />);
    fireEvent.press(await screen.findByText('Cancel booking-1'));
    fireEvent.press(screen.getByText('Confirm cancellation'));
    fireEvent.press(screen.getByText('Confirm cancellation'));
    expect(mockCancel).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
    expect(screen.queryByText('Confirm cancellation')).toBeNull();
  });

  it('ignores a previous account response and clears bookings on sign-out', async () => {
    const pending = deferred<Booking[]>();
    mockLoad.mockReturnValueOnce(pending.promise);
    const screen = render(<BookingStatusScreen navigation={navigation} />);
    mockUser = { id: 'homeowner-2', role: 'homeowner' };
    mockLoad.mockResolvedValue([{ ...booking, id: 'booking-2', serviceName: 'Current repair' }]);
    screen.rerender(<BookingStatusScreen navigation={navigation} />);
    expect(await screen.findByText('Current repair')).toBeTruthy();
    await act(async () => pending.resolve([booking]));
    expect(screen.queryByText('Kitchen repair')).toBeNull();
    expect(screen.getByText('Current repair')).toBeTruthy();
    mockUser = null;
    screen.rerender(<BookingStatusScreen navigation={navigation} />);
    expect(screen.queryByText('Current repair')).toBeNull();
  });

  it('ignores a cancellation failure after leaving and returning to an account', async () => {
    const pending = deferred<void>();
    mockCancel.mockReturnValue(pending.promise);
    const screen = render(<BookingStatusScreen navigation={navigation} />);
    fireEvent.press(await screen.findByText('Cancel booking-1'));
    fireEvent.press(screen.getByText('Confirm cancellation'));
    mockUser = null;
    screen.rerender(<BookingStatusScreen navigation={navigation} />);
    mockUser = { id: 'homeowner-1', role: 'homeowner' };
    mockLoad.mockResolvedValue([]);
    screen.rerender(<BookingStatusScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('No upcoming bookings yet. Browse services to get started.')).toBeTruthy());
    await act(async () => pending.reject(new Error('Late failure')));
    expect(screen.queryByText('Kitchen repair')).toBeNull();
    expect(screen.queryByText('Confirm cancellation')).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
