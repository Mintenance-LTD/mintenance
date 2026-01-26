import { renderHook, act } from '@testing-library/react-native';
import useForm from '../useForm';


// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('useForm', () => {
  const initialValues = { name: '', email: '' };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useForm({ initialValues }));
    expect(result.current).toBeDefined();
    expect(result.current.values).toEqual(initialValues);
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useForm({ initialValues }));

    act(() => {
      result.current.setValues({ name: 'Alex' });
    });

    expect(result.current.values.name).toBe('Alex');
    expect(result.current.isDirty).toBe(true);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useForm({ initialValues }));
    unmount();
    // Verify cleanup
  });
});
