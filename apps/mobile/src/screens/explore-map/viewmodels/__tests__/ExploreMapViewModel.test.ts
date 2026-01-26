import { renderHook, act } from '@testing-library/react-native';
import { useExploreMapViewModel } from '../ExploreMapViewModel';

describe('ExploreMapViewModel', () => {
  it('should initialize with defaults', () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.contractors.length).toBeGreaterThan(0);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    act(() => {
      result.current.handleSearch('electric');
    });
    expect(result.current.searchQuery).toBe('electric');
  });
});
