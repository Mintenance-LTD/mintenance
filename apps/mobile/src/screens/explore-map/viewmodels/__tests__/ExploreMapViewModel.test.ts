import { renderHook, act } from '@testing-library/react-native';
import { useExploreMapViewModel } from '../ExploreMapViewModel';

describe('ExploreMapViewModel', () => {
  it('should initialize with defaults', () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.jobs).toBeDefined();
    expect(result.current.loading).toBe(true);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    act(() => {
      result.current.handleSearch('electric');
    });
    expect(result.current.searchQuery).toBe('electric');
  });

  it('should select and deselect a category', () => {
    const { result } = renderHook(() => useExploreMapViewModel());
    act(() => {
      result.current.handleCategorySelect('plumbing');
    });
    expect(result.current.selectedCategory).toBe('plumbing');

    act(() => {
      result.current.handleCategorySelect(null);
    });
    expect(result.current.selectedCategory).toBeNull();
  });
});
