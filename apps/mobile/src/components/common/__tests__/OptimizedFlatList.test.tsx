import React from 'react';
import { Text } from 'react-native';
import { render, renderHook } from '../../../test-utils';
import { useOptimizedRenderItem } from '../OptimizedFlatList';

describe('useOptimizedRenderItem', () => {
  it('returns a stable memoized ListRenderItem function', () => {
    const renderFn = (item: { label: string }) => <Text>{item.label}</Text>;
    const { result, rerender } = renderHook(
      ({ deps }) => useOptimizedRenderItem(renderFn, deps),
      { initialProps: { deps: [] as React.DependencyList } }
    );

    const first = result.current;
    expect(typeof first).toBe('function');

    // Same deps => same memoized reference
    rerender({ deps: [] });
    expect(result.current).toBe(first);
  });

  it('invokes the provided render function with item and index', () => {
    const renderFn = jest.fn((item: { label: string }) => (
      <Text>{item.label}</Text>
    ));
    const { result } = renderHook(() => useOptimizedRenderItem(renderFn));

    const listRenderItem = result.current;
    listRenderItem!({
      item: { label: 'Alpha' },
      index: 0,
      separators: {} as never,
    });

    expect(renderFn).toHaveBeenCalledWith({ label: 'Alpha' }, 0);
  });

  it('produces an element that renders the item content', () => {
    const renderFn = (item: { label: string }) => <Text>{item.label}</Text>;
    const { result } = renderHook(() => useOptimizedRenderItem(renderFn));

    const element = result.current!({
      item: { label: 'Rendered Label' },
      index: 0,
      separators: {} as never,
    }) as React.ReactElement;

    const { getByText } = render(element);
    expect(getByText('Rendered Label')).toBeTruthy();
  });

  it('handles different items by index', () => {
    const data = [{ label: 'One' }, { label: 'Two' }];
    const renderFn = (item: { label: string }) => <Text>{item.label}</Text>;
    const { result } = renderHook(() => useOptimizedRenderItem(renderFn));

    const listRenderItem = result.current!;
    const elOne = listRenderItem({
      item: data[0],
      index: 0,
      separators: {} as never,
    }) as React.ReactElement;
    const elTwo = listRenderItem({
      item: data[1],
      index: 1,
      separators: {} as never,
    }) as React.ReactElement;

    expect(render(elOne).getByText('One')).toBeTruthy();
    expect(render(elTwo).getByText('Two')).toBeTruthy();
  });
});
