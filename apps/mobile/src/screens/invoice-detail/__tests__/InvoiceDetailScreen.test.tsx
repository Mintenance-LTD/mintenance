import React from 'react';
import { Alert, Text as MockText } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { InvoiceDetailScreen } from '../InvoiceDetailScreen';
import type { Invoice } from '../../../services/contractor-business/types';

let mockUser: { id: string } | null;
const mockGetInvoices = jest.fn();
const mockReminder = jest.fn();
const mockUpdate = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
// Match the real hook: its wrapper object is new on every render.
jest.mock('../../../components/ui/Toast', () => ({ useToast: () => ({ success: mockSuccess, error: mockError }) }));
jest.mock('../../../services/contractor-business', () => ({ FinancialManagementService: {
  getInvoices: (...args: unknown[]) => mockGetInvoices(...args),
  sendInvoiceReminder: (...args: unknown[]) => mockReminder(...args),
  updateInvoiceStatus: (...args: unknown[]) => mockUpdate(...args),
} }));
jest.mock('../../../components/LoadingSpinner', () => ({ LoadingSpinner: () => <MockText>Loading invoice</MockText> }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const invoice: Invoice = {
  id: 'invoice-1', contractor_id: 'account-1', client_id: 'client-1', client_name: 'First client',
  invoice_number: 'INV-1', status: 'sent', subtotal: 100, tax_amount: 20, total_amount: 120,
  due_date: '2026-11-20', issue_date: '2026-11-13', created_at: '2026-11-13', updated_at: '2026-11-13',
  line_items: [{ description: 'Repair', quantity: 2, unit_price: 50 }],
};
const navigation = { navigate: jest.fn(), goBack: jest.fn() } as unknown as React.ComponentProps<typeof InvoiceDetailScreen>['navigation'];
const view = (invoiceId = 'invoice-1') => <InvoiceDetailScreen navigation={navigation} route={{ key: 'invoice', name: 'InvoiceDetail', params: { invoiceId } }} />;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'account-1' };
  mockGetInvoices.mockResolvedValue([invoice]);
  mockReminder.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('loads once despite changing toast wrapper identity and renders API line items', async () => {
  const screen = render(view());
  expect(await screen.findByText('First client')).toBeTruthy();
  screen.rerender(view());
  expect(mockGetInvoices).toHaveBeenCalledTimes(1);
  expect(screen.getByText('2 × £50.00')).toBeTruthy();
});

it('ignores an old invoice response after navigation', async () => {
  const old = deferred<Invoice[]>();
  mockGetInvoices.mockReturnValueOnce(old.promise);
  const screen = render(view());
  mockGetInvoices.mockResolvedValue([{ ...invoice, id: 'invoice-2', client_name: 'Current client' }]);
  screen.rerender(view('invoice-2'));
  expect(await screen.findByText('Current client')).toBeTruthy();
  await act(async () => old.resolve([invoice]));
  expect(screen.queryByText('First client')).toBeNull();
  expect(screen.getByText('Current client')).toBeTruthy();
});

it('reloads on account changes and ignores old failures after signing out', async () => {
  const old = deferred<Invoice[]>();
  mockGetInvoices.mockReturnValueOnce(old.promise);
  const screen = render(view());
  mockUser = { id: 'account-2' };
  mockGetInvoices.mockResolvedValue([{ ...invoice, client_name: 'New account client' }]);
  screen.rerender(view());
  expect(await screen.findByText('New account client')).toBeTruthy();
  expect(mockGetInvoices).toHaveBeenLastCalledWith('account-2');
  mockUser = null;
  screen.rerender(view());
  await act(async () => old.reject(new Error('Old request')));
  expect(screen.queryByText('New account client')).toBeNull();
  expect(screen.getByText('Invoice not found')).toBeTruthy();
  expect(mockError).not.toHaveBeenCalled();
});

it('does not leave signed-out users stuck loading and loads after sign-in', async () => {
  mockUser = null;
  const screen = render(view());
  expect(screen.getByText('Invoice not found')).toBeTruthy();
  expect(mockGetInvoices).not.toHaveBeenCalled();
  mockUser = { id: 'account-1' };
  screen.rerender(view());
  expect(await screen.findByText('First client')).toBeTruthy();
});

it('blocks duplicate reminders, reports failures, and allows retry', async () => {
  const pending = deferred<void>();
  mockReminder.mockReturnValueOnce(pending.promise);
  const screen = render(view());
  fireEvent.press(await screen.findByText('Send Reminder'));
  fireEvent.press(screen.getByText('Send Reminder'));
  expect(mockReminder).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error('Network')));
  expect(mockError).toHaveBeenCalledWith('Failed to send reminder');
  fireEvent.press(screen.getByText('Send Reminder'));
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith('Reminder sent'));
  expect(mockGetInvoices).toHaveBeenCalledTimes(2);
});

it('does not refresh or toast when an action finishes after an account switch', async () => {
  const pending = deferred<void>();
  mockReminder.mockReturnValueOnce(pending.promise);
  const screen = render(view());
  fireEvent.press(await screen.findByText('Send Reminder'));
  mockUser = { id: 'account-2' };
  mockGetInvoices.mockResolvedValue([{ ...invoice, client_name: 'Current client' }]);
  screen.rerender(view());
  expect(await screen.findByText('Current client')).toBeTruthy();
  await act(async () => pending.resolve());
  expect(mockSuccess).not.toHaveBeenCalled();
  expect(mockGetInvoices).toHaveBeenCalledTimes(2);
});

it('rejects a confirmation opened under a previous account, even after returning to it', async () => {
  const screen = render(view());
  fireEvent.press(await screen.findByText('Mark as Paid'));
  const confirm = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  mockUser = null;
  screen.rerender(view());
  mockUser = { id: 'account-1' };
  screen.rerender(view());
  await screen.findByText('First client');
  await act(async () => confirm?.());
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('ignores errors after unmount', async () => {
  const old = deferred<Invoice[]>();
  mockGetInvoices.mockReturnValueOnce(old.promise);
  const screen = render(view());
  screen.unmount();
  await act(async () => old.reject(new Error('Unmounted')));
  expect(mockError).not.toHaveBeenCalled();
});
