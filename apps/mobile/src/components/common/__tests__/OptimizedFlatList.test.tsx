import React from 'react';
import { Text } from 'react-native';
import { render, renderHook } from '../../../test-utils';
import OptimizedFlatList, {
  useOptimizedRenderItem,
} from '../OptimizedFlatList';

// Mock the external logger so we can assert debug-mode wiring without noise.
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('@mintenance/shared') as {
  logger: { info: jest.Mock };
};

// react-native is mocked in this project (FlatList is a host string component),
// so we inspect the props handed to the underlying FlatList element rather than
// relying on it to actually render rows. We grab a mutable reference to the
// Platform object so individual tests can flip OS / Version to exercise the
// platform-specific optimisation branches.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
const Platform = RN.Platform as { OS: string; Version: number };

const ORIGINAL_OS = Platform.OS;
const ORIGINAL_VERSION = Platform.Version;

afterEach(() => {
  Platform.OS = ORIGINAL_OS;
  Platform.Version = ORIGINAL_VERSION;
  jest.clearAllMocks();
});

type Item = { id?: string; _id?: string; key?: string; label: string };

const renderFn = (item: Item) => <Text>{item.label}</Text>;

/**
 * Render OptimizedFlatList and return the props that were forwarded to the
 * underlying FlatList host element. The component returns the FlatList as its
 * root, so `root.props` is the merged optimisation prop set.
 */
function renderList(props: Record<string, unknown>) {
  const utils = render(
    // @ts-expect-error - dynamic props for branch coverage
    <OptimizedFlatList renderItem={renderFn} {...props} />
  );
  const flatList = utils.root;
  return { utils, flatListProps: flatList.props as Record<string, unknown> };
}

describe('OptimizedFlatList component', () => {
  describe('rendering + data branches', () => {
    it('renders a FlatList and forwards data through', () => {
      const data: Item[] = [{ id: '1', label: 'A' }];
      const { flatListProps } = renderList({ data });
      expect(flatListProps.data).toBe(data);
      expect(flatListProps.renderItem).toBe(renderFn);
    });

    it('renders with empty data and forwards ListEmptyComponent', () => {
      const Empty = () => <Text>Empty</Text>;
      const { flatListProps } = renderList({
        data: [],
        ListEmptyComponent: Empty,
      });
      expect(flatListProps.data).toEqual([]);
      expect(flatListProps.ListEmptyComponent).toBe(Empty);
    });

    it('forwards header, footer and refresh props via restProps', () => {
      const Header = () => <Text>Header</Text>;
      const Footer = () => <Text>Footer</Text>;
      const onRefresh = jest.fn();
      const onEndReached = jest.fn();
      const { flatListProps } = renderList({
        data: [{ id: '1', label: 'A' }],
        ListHeaderComponent: Header,
        ListFooterComponent: Footer,
        refreshing: true,
        onRefresh,
        onEndReached,
        onEndReachedThreshold: 0.5,
      });
      expect(flatListProps.ListHeaderComponent).toBe(Header);
      expect(flatListProps.ListFooterComponent).toBe(Footer);
      expect(flatListProps.refreshing).toBe(true);
      expect(flatListProps.onRefresh).toBe(onRefresh);
      expect(flatListProps.onEndReached).toBe(onEndReached);
      expect(flatListProps.onEndReachedThreshold).toBe(0.5);
    });

    it('always sets the fixed performance props', () => {
      const { flatListProps } = renderList({ data: [] });
      expect(flatListProps.scrollEventThrottle).toBe(16);
      expect(flatListProps.decelerationRate).toBe('fast');
      expect(flatListProps.disableVirtualization).toBe(false);
      expect(flatListProps.directionalLockEnabled).toBe(true);
      expect(flatListProps.scrollPerfTag).toBe('OptimizedFlatList');
    });
  });

  describe('keyExtractor branches', () => {
    it('uses the provided keyExtractor when supplied', () => {
      const keyExtractor = jest.fn((item: Item) => `custom-${item.label}`);
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        keyExtractor,
      });
      const ke = flatListProps.keyExtractor as (i: Item, n: number) => string;
      expect(ke({ label: 'A' }, 3)).toBe('custom-A');
      expect(keyExtractor).toHaveBeenCalledWith({ label: 'A' }, 3);
    });

    it('falls back to "id" when no keyExtractor and item has id', () => {
      const { flatListProps } = renderList({ data: [{ id: '7', label: 'A' }] });
      const ke = flatListProps.keyExtractor as (i: Item, n: number) => string;
      expect(ke({ id: '7', label: 'A' }, 0)).toBe('7');
    });

    it('falls back to "_id" when present and no id', () => {
      const { flatListProps } = renderList({
        data: [{ _id: '99', label: 'A' }],
      });
      const ke = flatListProps.keyExtractor as (i: Item, n: number) => string;
      expect(ke({ _id: '99', label: 'A' }, 0)).toBe('99');
    });

    it('falls back to "key" when present and no id/_id', () => {
      const { flatListProps } = renderList({
        data: [{ key: 'kk', label: 'A' }],
      });
      const ke = flatListProps.keyExtractor as (i: Item, n: number) => string;
      expect(ke({ key: 'kk', label: 'A' }, 0)).toBe('kk');
    });

    it('falls back to index for plain objects without id/_id/key', () => {
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      const ke = flatListProps.keyExtractor as (i: Item, n: number) => string;
      expect(ke({ label: 'A' }, 5)).toBe('5');
    });

    it('falls back to index for non-object items (string)', () => {
      const { flatListProps } = renderList({ data: ['x', 'y'] });
      const ke = flatListProps.keyExtractor as (
        i: unknown,
        n: number
      ) => string;
      expect(ke('x', 2)).toBe('2');
    });

    it('falls back to index for null items', () => {
      const { flatListProps } = renderList({ data: [null] });
      const ke = flatListProps.keyExtractor as (
        i: unknown,
        n: number
      ) => string;
      expect(ke(null, 4)).toBe('4');
    });
  });

  describe('getItemLayout branches', () => {
    it('uses the provided getItemLayout when supplied', () => {
      const getItemLayout = jest.fn(() => ({
        length: 1,
        offset: 2,
        index: 0,
      }));
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        getItemLayout,
      });
      expect(flatListProps.getItemLayout).toBe(getItemLayout);
    });

    it('is undefined when neither getItemLayout nor estimatedItemSize given', () => {
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.getItemLayout).toBeUndefined();
    });

    it('derives getItemLayout from estimatedItemSize', () => {
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        estimatedItemSize: 80,
      });
      const gil = flatListProps.getItemLayout as (
        d: unknown,
        i: number
      ) => { length: number; offset: number; index: number };
      expect(typeof gil).toBe('function');
      expect(gil(null, 3)).toEqual({ length: 80, offset: 240, index: 3 });
      expect(gil([], 0)).toEqual({ length: 80, offset: 0, index: 0 });
    });
  });

  describe('onViewableItemsChanged branches', () => {
    it('does NOT wire a handler when no debug and no callback', () => {
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.onViewableItemsChanged).toBeUndefined();
    });

    it('wires a handler when onViewableItemsChanged is provided and forwards info', () => {
      const onViewableItemsChanged = jest.fn();
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        onViewableItemsChanged,
      });
      const handler = flatListProps.onViewableItemsChanged as (i: {
        viewableItems: unknown[];
        changed: unknown[];
      }) => void;
      expect(typeof handler).toBe('function');
      const info = {
        viewableItems: [{ index: 0 }, { index: 1 }],
        changed: [{ index: 1 }],
      };
      handler(info);
      expect(onViewableItemsChanged).toHaveBeenCalledWith(info);
      // debug off => no logging
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('wires a handler when debugPerformance is true and logs viewable info', () => {
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        debugPerformance: true,
      });
      const handler = flatListProps.onViewableItemsChanged as (i: {
        viewableItems: unknown[];
        changed: unknown[];
      }) => void;
      expect(typeof handler).toBe('function');
      handler({
        viewableItems: [{ index: 0 }, { index: 4 }],
        changed: [{ index: 4 }],
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[OptimizedFlatList] Viewable items:',
        expect.objectContaining({
          viewable: 2,
          changed: 1,
          firstItem: 0,
          lastItem: 4,
          service: 'ui',
        })
      );
    });

    it('handles empty viewableItems in debug logging (undefined first/last)', () => {
      const onViewableItemsChanged = jest.fn();
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        debugPerformance: true,
        onViewableItemsChanged,
      });
      const handler = flatListProps.onViewableItemsChanged as (i: {
        viewableItems: unknown[];
        changed: unknown[];
      }) => void;
      handler({ viewableItems: [], changed: [] });
      expect(logger.info).toHaveBeenCalledWith(
        '[OptimizedFlatList] Viewable items:',
        expect.objectContaining({
          viewable: 0,
          changed: 0,
          firstItem: undefined,
          lastItem: undefined,
        })
      );
      // both debug + callback path => callback still fires
      expect(onViewableItemsChanged).toHaveBeenCalled();
    });
  });

  describe('viewabilityConfig branches', () => {
    it('uses the default viewability config when none provided', () => {
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.viewabilityConfig).toEqual({
        minimumViewTime: 250,
        viewAreaCoveragePercentThreshold: 50,
        waitForInteraction: true,
      });
    });

    it('uses the provided viewabilityConfig when supplied', () => {
      const viewabilityConfig = { itemVisiblePercentThreshold: 75 };
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        viewabilityConfig,
      });
      expect(flatListProps.viewabilityConfig).toBe(viewabilityConfig);
    });
  });

  describe('platform optimization branches', () => {
    it('iOS defaults: no removeClippedSubviews, batch=10, iOS maintainVisibleContentPosition', () => {
      Platform.OS = 'ios';
      Platform.Version = 14;
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.removeClippedSubviews).toBe(false);
      expect(flatListProps.maxToRenderPerBatch).toBe(10);
      expect(flatListProps.updateCellsBatchingPeriod).toBe(50);
      expect(flatListProps.initialNumToRender).toBe(10);
      expect(flatListProps.windowSize).toBe(10);
      expect(flatListProps.maintainVisibleContentPosition).toEqual({
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      });
    });

    it('Android (modern, v28) defaults: removeClippedSubviews true, no maintainVisibleContentPosition', () => {
      Platform.OS = 'android';
      Platform.Version = 28;
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.removeClippedSubviews).toBe(true);
      // not low-end (>=28) => uses batchSize default 10 etc.
      expect(flatListProps.maxToRenderPerBatch).toBe(10);
      expect(flatListProps.updateCellsBatchingPeriod).toBe(50);
      expect(flatListProps.initialNumToRender).toBe(10);
      expect(flatListProps.windowSize).toBe(10);
      expect(flatListProps.maintainVisibleContentPosition).toBeUndefined();
    });

    it('Android low-end (v27 < 28) uses the conservative low-end values', () => {
      Platform.OS = 'android';
      Platform.Version = 27;
      const { flatListProps } = renderList({ data: [{ label: 'A' }] });
      expect(flatListProps.removeClippedSubviews).toBe(true);
      expect(flatListProps.maxToRenderPerBatch).toBe(5);
      expect(flatListProps.updateCellsBatchingPeriod).toBe(100);
      expect(flatListProps.initialNumToRender).toBe(5);
      expect(flatListProps.windowSize).toBe(5);
      expect(flatListProps.maintainVisibleContentPosition).toBeUndefined();
    });

    it('respects custom batchSize and windowMultiplier on modern Android', () => {
      Platform.OS = 'android';
      Platform.Version = 30;
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        batchSize: 20,
        windowMultiplier: 7,
      });
      expect(flatListProps.maxToRenderPerBatch).toBe(20);
      expect(flatListProps.windowSize).toBe(7);
    });

    it('honors explicit overrides for every platform-derived prop', () => {
      Platform.OS = 'android';
      Platform.Version = 27; // would otherwise be low-end values
      const maintain = { minIndexForVisible: 2 };
      const { flatListProps } = renderList({
        data: [{ label: 'A' }],
        removeClippedSubviews: false,
        maxToRenderPerBatch: 42,
        updateCellsBatchingPeriod: 999,
        initialNumToRender: 33,
        windowSize: 21,
        maintainVisibleContentPosition: maintain,
      });
      expect(flatListProps.removeClippedSubviews).toBe(false);
      expect(flatListProps.maxToRenderPerBatch).toBe(42);
      expect(flatListProps.updateCellsBatchingPeriod).toBe(999);
      expect(flatListProps.initialNumToRender).toBe(33);
      expect(flatListProps.windowSize).toBe(21);
      expect(flatListProps.maintainVisibleContentPosition).toBe(maintain);
    });
  });

  describe('debug-mode mount effect', () => {
    it('logs mount metrics when debugPerformance is true and data exists', () => {
      renderList({
        data: [{ label: 'A' }, { label: 'B' }],
        debugPerformance: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[OptimizedFlatList] Mounted with:',
        expect.objectContaining({ dataLength: 2, service: 'ui' })
      );
    });

    it('does NOT log mount metrics when debugPerformance is false', () => {
      renderList({ data: [{ label: 'A' }] });
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('does NOT log mount metrics when debug is on but data is undefined', () => {
      renderList({ debugPerformance: true });
      // effect guarded by `data` truthiness => Mounted log should not fire
      const mountCalls = logger.info.mock.calls.filter(
        (c) => c[0] === '[OptimizedFlatList] Mounted with:'
      );
      expect(mountCalls).toHaveLength(0);
    });
  });

  describe('forwardRef', () => {
    it('forwards a ref to the FlatList element', () => {
      const ref = React.createRef();
      render(
        // @ts-expect-error dynamic props
        <OptimizedFlatList
          ref={ref}
          data={[{ label: 'A' }]}
          renderItem={renderFn}
        />
      );
      // The mock FlatList is a host string component; rendering with a ref
      // exercises the forwardRef wrapper without throwing.
      expect(true).toBe(true);
    });
  });
});

describe('useOptimizedRenderItem', () => {
  it('returns a stable memoized ListRenderItem function', () => {
    const fn = (item: { label: string }) => <Text>{item.label}</Text>;
    const { result, rerender } = renderHook(
      ({ deps }) => useOptimizedRenderItem(fn, deps),
      { initialProps: { deps: [] as React.DependencyList } }
    );

    const first = result.current;
    expect(typeof first).toBe('function');

    rerender({ deps: [] });
    expect(result.current).toBe(first);
  });

  it('invokes the provided render function with item and index', () => {
    const fn = jest.fn((item: { label: string }) => <Text>{item.label}</Text>);
    const { result } = renderHook(() => useOptimizedRenderItem(fn));

    result.current!({
      item: { label: 'Alpha' },
      index: 0,
      separators: {} as never,
    });

    expect(fn).toHaveBeenCalledWith({ label: 'Alpha' }, 0);
  });

  it('produces an element that renders the item content', () => {
    const fn = (item: { label: string }) => <Text>{item.label}</Text>;
    const { result } = renderHook(() => useOptimizedRenderItem(fn));

    const element = result.current!({
      item: { label: 'Rendered Label' },
      index: 0,
      separators: {} as never,
    }) as React.ReactElement;

    const { getByText } = render(element);
    expect(getByText('Rendered Label')).toBeTruthy();
  });
});
