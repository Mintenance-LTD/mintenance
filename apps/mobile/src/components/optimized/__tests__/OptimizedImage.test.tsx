import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { OptimizedImage } from '../OptimizedImage';

/**
 * OptimizedImage Component Tests
 *
 * Maximizes branch coverage across:
 * - source variants: number (local), string, object w/ valid URL, object w/ invalid URL (catch),
 *   object without .uri (fall-through)
 * - quality map (low/medium/high) applied to URL searchParams
 * - expo placeholder: blurhash present vs absent
 * - lifecycle handlers: onLoadStart / onLoad / onError / onLoadEnd (with and without callbacks)
 * - placeholder -> loading -> loaded -> error state transitions
 * - overlay renderers: default + custom (loadingComponent, errorComponent)
 * - custom placeholder: string variant, ReactNode variant, none
 * - accessibilityLabel truthy/falsy (accessible flag), testID present/absent for nested testIDs
 *
 * expo-image is mocked (apps/mobile/__mocks__/expo-image.js) to forward onLoad/onError/etc as
 * RN Image props, so fireEvent(node, 'load') invokes the component's handlers.
 */

const URI = 'https://cdn.example.com/photo.jpg';

describe('OptimizedImage', () => {
  it('exports a memoized component', () => {
    expect(OptimizedImage).toBeDefined();
    expect(OptimizedImage.$$typeof).toBeDefined();
    expect(OptimizedImage.displayName).toBe('OptimizedImage');
  });

  // ==========================================================================
  // SOURCE VARIANTS (optimizedSource useMemo branches)
  // ==========================================================================

  describe('source variants', () => {
    it('renders a local number source unchanged', () => {
      const { getByTestId } = render(
        <OptimizedImage source={42} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source).toBe(42);
    });

    it('wraps a string source into { uri }', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source).toEqual({ uri: URI });
    });

    it('appends quality query param for an object source with a valid URL', () => {
      const { getByTestId } = render(
        <OptimizedImage source={{ uri: URI }} quality='high' testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source.uri).toContain('quality=95');
    });

    it('falls back to original source for an object with an invalid URL (catch branch)', () => {
      const bad = { uri: 'not a valid url ::::' };
      const { getByTestId } = render(
        <OptimizedImage source={bad} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source).toBe(bad);
    });

    it('returns the source untouched for an object without a uri (fall-through branch)', () => {
      const empty = {} as unknown as { uri: string };
      const { getByTestId } = render(
        <OptimizedImage source={empty} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source).toBe(empty);
    });
  });

  // ==========================================================================
  // QUALITY MAP BRANCHES
  // ==========================================================================

  describe('quality map', () => {
    it.each([
      ['low', '60'],
      ['medium', '80'],
      ['high', '95'],
    ] as const)('maps quality=%s to %s', (quality, expected) => {
      const { getByTestId } = render(
        <OptimizedImage source={{ uri: URI }} quality={quality} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.source.uri).toContain(`quality=${expected}`);
    });

    it('defaults to medium quality when quality prop is omitted', () => {
      const { getByTestId } = render(
        <OptimizedImage source={{ uri: URI }} testID='img' />
      );
      expect(getByTestId('img-image').props.source.uri).toContain('quality=80');
    });
  });

  // ==========================================================================
  // EXPO PLACEHOLDER (blurhash useMemo branches)
  // ==========================================================================

  describe('expo placeholder / blurhash', () => {
    it('passes a blurhash placeholder when blurhash provided', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} blurhash='LKO2?U%2Tw=w]~RB' testID='img' />
      );
      expect(getByTestId('img-image').props.placeholder).toEqual({
        blurhash: 'LKO2?U%2Tw=w]~RB',
      });
    });

    it('passes undefined placeholder when no blurhash', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(getByTestId('img-image').props.placeholder).toBeUndefined();
    });
  });

  // ==========================================================================
  // PROP FORWARDING / DEFAULTS
  // ==========================================================================

  describe('prop forwarding and defaults', () => {
    it('forwards explicit visual + perf props to expo Image', () => {
      const { getByTestId } = render(
        <OptimizedImage
          source={URI}
          testID='img'
          contentFit='contain'
          placeholderContentFit='contain'
          blurRadius={5}
          cachePolicy='disk'
          priority='high'
          recyclingKey='rk-1'
          accessibilityLabel='A nice photo'
        />
      );
      const image = getByTestId('img-image');
      expect(image.props.contentFit).toBe('contain');
      expect(image.props.placeholderContentFit).toBe('contain');
      expect(image.props.blurRadius).toBe(5);
      expect(image.props.cachePolicy).toBe('disk');
      expect(image.props.priority).toBe('high');
      expect(image.props.recyclingKey).toBe('rk-1');
      expect(image.props.accessibilityLabel).toBe('A nice photo');
    });

    it('applies default contentFit/cachePolicy/priority/transition', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      const image = getByTestId('img-image');
      expect(image.props.contentFit).toBe('cover');
      expect(image.props.placeholderContentFit).toBe('cover');
      expect(image.props.cachePolicy).toBe('memory-disk');
      expect(image.props.priority).toBe('normal');
      expect(image.props.transition).toEqual({
        duration: 300,
        effect: 'cross-dissolve',
      });
    });

    it('uses a custom transition when provided', () => {
      const custom = { duration: 100, effect: 'flip-from-top' as const };
      const { getByTestId } = render(
        <OptimizedImage source={URI} transition={custom} testID='img' />
      );
      expect(getByTestId('img-image').props.transition).toEqual(custom);
    });

    it('sets accessible=true when accessibilityLabel provided', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' accessibilityLabel='Hi' />
      );
      expect(getByTestId('img').props.accessible).toBe(true);
    });

    it('sets accessible=false when no accessibilityLabel', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(getByTestId('img').props.accessible).toBe(false);
    });

    it('omits nested testIDs when no testID provided', () => {
      const { queryByTestId } = render(<OptimizedImage source={URI} />);
      expect(queryByTestId('img-image')).toBeNull();
    });

    it('renders default loading + error overlays with undefined testIDs when no testID provided', () => {
      // No testID -> exercises the `testID ? ... : undefined` falsy side in the
      // loading-overlay, loading-indicator and error-overlay testID ternaries.
      // We grab the (un-testID'd) expo Image via the rendered tree root.
      const { root, getByText } = render(<OptimizedImage source={URI} />);
      const findImage = () =>
        root.findAll(
          (n) =>
            typeof n.props?.onLoadStart === 'function' &&
            typeof n.props?.onError === 'function'
        )[0];

      // loading overlay (default) with undefined testID — assert no crash
      fireEvent(findImage(), 'loadStart');
      expect(findImage()).toBeTruthy();

      // error overlay (default) with undefined testID
      fireEvent(findImage(), 'error');
      expect(getByText('Failed to load image')).toBeTruthy();
    });

    it('renders a string placeholder with an undefined testID when no testID provided', () => {
      // Exercises the placeholder-overlay `testID ? ... : undefined` falsy branch.
      const { getByText } = render(
        <OptimizedImage source={URI} placeholder='No-ID Placeholder' />
      );
      expect(getByText('No-ID Placeholder')).toBeTruthy();
    });
  });

  // ==========================================================================
  // STATE TRANSITIONS + OVERLAYS
  // ==========================================================================

  describe('loading overlay', () => {
    it('shows default loading overlay on loadStart and fires onLoadStart', () => {
      const onLoadStart = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <OptimizedImage source={URI} testID='img' onLoadStart={onLoadStart} />
      );
      // not loading initially
      expect(queryByTestId('img-loading')).toBeNull();

      fireEvent(getByTestId('img-image'), 'loadStart');

      expect(onLoadStart).toHaveBeenCalledTimes(1);
      expect(getByTestId('img-loading')).toBeTruthy();
      expect(getByTestId('img-loading-indicator')).toBeTruthy();
    });

    it('does not throw when onLoadStart callback is omitted', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(() =>
        fireEvent(getByTestId('img-image'), 'loadStart')
      ).not.toThrow();
      expect(getByTestId('img-loading')).toBeTruthy();
    });

    it('renders a custom loadingComponent instead of the default', () => {
      const { getByTestId, queryByTestId } = render(
        <OptimizedImage
          source={URI}
          testID='img'
          loadingComponent={<Text testID='custom-loading'>wait</Text>}
        />
      );
      fireEvent(getByTestId('img-image'), 'loadStart');
      expect(getByTestId('custom-loading')).toBeTruthy();
      // default overlay testID should not be present
      expect(queryByTestId('img-loading')).toBeNull();
    });

    it('clears loading overlay on loadEnd (handleLoadEnd prev-spread branch)', () => {
      const onLoadEnd = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <OptimizedImage source={URI} testID='img' onLoadEnd={onLoadEnd} />
      );
      fireEvent(getByTestId('img-image'), 'loadStart');
      expect(getByTestId('img-loading')).toBeTruthy();

      fireEvent(getByTestId('img-image'), 'loadEnd');
      expect(onLoadEnd).toHaveBeenCalledTimes(1);
      expect(queryByTestId('img-loading')).toBeNull();
    });

    it('does not throw when onLoadEnd callback is omitted', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      fireEvent(getByTestId('img-image'), 'loadStart');
      expect(() =>
        fireEvent(getByTestId('img-image'), 'loadEnd')
      ).not.toThrow();
    });
  });

  describe('loaded state', () => {
    it('hides loading overlay once the image has loaded and fires onLoad', () => {
      const onLoad = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <OptimizedImage source={URI} testID='img' onLoad={onLoad} />
      );
      fireEvent(getByTestId('img-image'), 'loadStart');
      expect(getByTestId('img-loading')).toBeTruthy();

      fireEvent(getByTestId('img-image'), 'load');

      expect(onLoad).toHaveBeenCalledTimes(1);
      // loaded => loading overlay suppressed (loading false + loaded true)
      expect(queryByTestId('img-loading')).toBeNull();
    });

    it('does not throw when onLoad callback is omitted', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(() => fireEvent(getByTestId('img-image'), 'load')).not.toThrow();
    });
  });

  describe('error overlay', () => {
    it('shows default error overlay on error, hides image, fires onError', () => {
      const onError = jest.fn();
      const { getByTestId, queryByTestId, getByText } = render(
        <OptimizedImage source={URI} testID='img' onError={onError} />
      );
      expect(getByTestId('img-image')).toBeTruthy();

      fireEvent(getByTestId('img-image'), 'error', { source: 'boom' });

      expect(onError).toHaveBeenCalledWith({ source: 'boom' });
      expect(getByTestId('img-error')).toBeTruthy();
      expect(getByText('Failed to load image')).toBeTruthy();
      // image is unmounted when error is true (!imageState.error guard)
      expect(queryByTestId('img-image')).toBeNull();
    });

    it('does not throw when onError callback is omitted', () => {
      const { getByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(() => fireEvent(getByTestId('img-image'), 'error')).not.toThrow();
      expect(getByTestId('img-error')).toBeTruthy();
    });

    it('renders a custom errorComponent instead of the default', () => {
      const { getByTestId, queryByTestId } = render(
        <OptimizedImage
          source={URI}
          testID='img'
          errorComponent={<Text testID='custom-error'>nope</Text>}
        />
      );
      fireEvent(getByTestId('img-image'), 'error');
      expect(getByTestId('custom-error')).toBeTruthy();
      expect(queryByTestId('img-error')).toBeNull();
    });
  });

  // ==========================================================================
  // CUSTOM PLACEHOLDER (renderCustomPlaceholder branches)
  // ==========================================================================

  describe('custom placeholder', () => {
    it('renders a string placeholder before any load activity', () => {
      const { getByTestId, getByText } = render(
        <OptimizedImage source={URI} testID='img' placeholder='Mint' />
      );
      expect(getByTestId('img-placeholder')).toBeTruthy();
      expect(getByText('Mint')).toBeTruthy();
    });

    it('renders a ReactNode placeholder before any load activity', () => {
      const { getByTestId } = render(
        <OptimizedImage
          source={URI}
          testID='img'
          placeholder={<View testID='node-placeholder' />}
        />
      );
      expect(getByTestId('node-placeholder')).toBeTruthy();
    });

    it('renders nothing when placeholder is not provided', () => {
      const { queryByTestId } = render(
        <OptimizedImage source={URI} testID='img' />
      );
      expect(queryByTestId('img-placeholder')).toBeNull();
    });

    it('hides the custom placeholder once loading begins', () => {
      const { getByTestId, queryByText } = render(
        <OptimizedImage source={URI} testID='img' placeholder='Mint' />
      );
      expect(queryByText('Mint')).toBeTruthy();
      fireEvent(getByTestId('img-image'), 'loadStart');
      expect(queryByText('Mint')).toBeNull();
    });

    it('hides the custom placeholder once loaded', () => {
      const { getByTestId, queryByText } = render(
        <OptimizedImage source={URI} testID='img' placeholder='Mint' />
      );
      fireEvent(getByTestId('img-image'), 'loadStart');
      fireEvent(getByTestId('img-image'), 'load');
      expect(queryByText('Mint')).toBeNull();
    });

    it('hides the custom placeholder once errored', () => {
      const { getByTestId, queryByText } = render(
        <OptimizedImage source={URI} testID='img' placeholder='Mint' />
      );
      fireEvent(getByTestId('img-image'), 'error');
      expect(queryByText('Mint')).toBeNull();
    });
  });

  // ==========================================================================
  // FULL LIFECYCLE
  // ==========================================================================

  it('transitions placeholder -> loading -> loaded across a full happy path', () => {
    const onLoadStart = jest.fn();
    const onLoad = jest.fn();
    const onLoadEnd = jest.fn();
    const { getByTestId, queryByTestId, queryByText } = render(
      <OptimizedImage
        source={{ uri: URI }}
        testID='img'
        placeholder='P'
        onLoadStart={onLoadStart}
        onLoad={onLoad}
        onLoadEnd={onLoadEnd}
      />
    );

    // initial: custom placeholder visible
    expect(queryByText('P')).toBeTruthy();

    // loading
    fireEvent(getByTestId('img-image'), 'loadStart');
    expect(getByTestId('img-loading')).toBeTruthy();
    expect(queryByText('P')).toBeNull();

    // loaded
    fireEvent(getByTestId('img-image'), 'load');
    fireEvent(getByTestId('img-image'), 'loadEnd');
    expect(queryByTestId('img-loading')).toBeNull();
    expect(queryByTestId('img-error')).toBeNull();

    expect(onLoadStart).toHaveBeenCalledTimes(1);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoadEnd).toHaveBeenCalledTimes(1);
  });
});
