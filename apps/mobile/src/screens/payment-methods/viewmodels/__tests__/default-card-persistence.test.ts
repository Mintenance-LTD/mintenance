import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePaymentMethodsViewModel } from '../PaymentMethodsViewModel';
const mockList = jest.fn();
const mockDefault = jest.fn();
jest.mock('../../../../services/PaymentService', () => ({
  PaymentService: {
    getPaymentMethods: () => mockList(),
    setDefaultPaymentMethod: (id: string) => mockDefault(id),
  },
}));
const methods = ['a', 'b'].map((id) => ({
  id,
  type: 'card',
  isDefault: id === 'a',
  card: { brand: 'visa', last4: '4242', expiryMonth: 1, expiryYear: 2030 },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ methods });
});
it('persists the new default before changing the selected card', async () => {
  let finish!: (value: unknown) => void;
  mockDefault.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const hook = renderHook(() => usePaymentMethodsViewModel());
  await waitFor(() => expect(hook.result.current.selectedMethod).toBe('a'));
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.setDefaultCard('b');
  });
  expect(hook.result.current.selectedMethod).toBe('a');
  expect(hook.result.current.saving).toBe(true);
  await act(async () => {
    finish({ success: true });
    await pending;
  });
  expect(mockDefault).toHaveBeenCalledWith('b');
  expect(hook.result.current.selectedMethod).toBe('b');
  hook.unmount();
});
it('keeps the server default selected after a failed save', async () => {
  mockDefault.mockResolvedValue({ error: 'Synthetic offline' });
  const hook = renderHook(() => usePaymentMethodsViewModel());
  await waitFor(() => expect(hook.result.current.selectedMethod).toBe('a'));
  await act(async () => {
    await expect(hook.result.current.setDefaultCard('b')).rejects.toThrow(
      'Synthetic offline'
    );
  });
  expect(hook.result.current.selectedMethod).toBe('a');
  expect(hook.result.current.saving).toBe(false);
  hook.unmount();
});
