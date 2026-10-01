import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useUnsavedChanges } from '../useUnsavedChanges';
let mockHandler: (event: any) => void;
const mockDispatch = jest.fn();
const mockNavigation = {
  addListener: (_: string, handler: typeof mockHandler) => {
    mockHandler = handler;
    return jest.fn();
  },
  dispatch: mockDispatch,
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
it('allows the original navigation action after Discard without prompting again', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  renderHook(() => useUnsavedChanges(true));
  const event = {
    preventDefault: jest.fn(),
    data: { action: { type: 'POP' } },
  };
  act(() => mockHandler(event));
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  const discard = alert.mock.calls[0]?.[2]?.find(
    (button) => button.text === 'Discard'
  );
  act(() => discard?.onPress?.());
  expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
  act(() => mockHandler(event));
  expect(alert).toHaveBeenCalledTimes(1);
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});
