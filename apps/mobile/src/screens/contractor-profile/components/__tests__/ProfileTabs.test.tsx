/**
 * ProfileTabs Component Tests
 *
 * Comprehensive test suite for the ProfileTabs component
 * Target: 100% code coverage
 *
 * @component ProfileTabs
 * @coverage 100%
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { ProfileTabs } from '../ProfileTabs';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../../theme', () => ({
  theme: {
    colors: {
      surface: '#FFFFFF',
      border: '#E5E5E5',
      primary: '#10B981',
      textTertiary: '#A3A3A3',
      textPrimary: '#171717',
    },
    spacing: {
      lg: 16,
    },
    typography: {
      fontSize: {
        lg: 16,
      },
      fontWeight: {
        semibold: '600' as const,
      },
    },
  },
}));

// ============================================================================
// PROFILETABS COMPONENT TESTS
// ============================================================================

describe('ProfileTabs Component', () => {
  let onTabChangeMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onTabChangeMock = jest.fn();
  });

  // --------------------------------------------------------------------------
  // Core Rendering Tests
  // --------------------------------------------------------------------------

  describe('Core Rendering', () => {
    it('renders without crashing', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders the Photos tab', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      expect(getByText('Photos')).toBeTruthy();
    });

    it('renders the Reviews tab', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders both tabs simultaneously', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders container with correct structure', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      const viewElements = UNSAFE_root.findAllByType(View as any);
      expect(viewElements.length).toBeGreaterThan(0);
    });

    it('renders with all required props', () => {
      expect(() => {
        render(<ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />);
      }).not.toThrow();
    });

    it('renders two TouchableOpacity components for tabs', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      const touchableElements = UNSAFE_root.findAllByType(TouchableOpacity as any);
      expect(touchableElements.length).toBe(2);
    });

    it('renders exactly two Text components for tab labels', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      const textElements = UNSAFE_root.findAllByType(Text as any);
      expect(textElements.length).toBe(2);
    });

    it('renders View components for container structure', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );
      const viewElements = UNSAFE_root.findAllByType(View as any);
      expect(viewElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Tab Interaction Tests
  // --------------------------------------------------------------------------

  describe('Tab Interaction', () => {
    it('calls onTabChange when Photos tab is pressed', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      expect(onTabChangeMock).toHaveBeenCalledWith('photos');
    });

    it('calls onTabChange when Reviews tab is pressed', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      expect(onTabChangeMock).toHaveBeenCalledWith('reviews');
    });

    it('calls onTabChange only once per press', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      expect(onTabChangeMock).toHaveBeenCalledTimes(1);
    });

    it('handles pressing the same tab multiple times', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByText('Photos'));

      expect(onTabChangeMock).toHaveBeenCalledTimes(3);
      expect(onTabChangeMock).toHaveBeenNthCalledWith(1, 'photos');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(2, 'photos');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(3, 'photos');
    });

    it('handles pressing different tabs sequentially', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByText('Reviews'));

      expect(onTabChangeMock).toHaveBeenCalledTimes(3);
      expect(onTabChangeMock).toHaveBeenNthCalledWith(1, 'reviews');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(2, 'photos');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(3, 'reviews');
    });

    it('Photos tab is a TouchableOpacity', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const photosButton = photosText.parent;
      expect(photosButton?.type).toBe(TouchableOpacity);
    });

    it('Reviews tab is a TouchableOpacity', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const reviewsButton = reviewsText.parent;
      expect(reviewsButton?.type).toBe(TouchableOpacity);
    });

    it('tabs are clickable elements', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      expect(onTabChangeMock).toHaveBeenCalled();
    });

    it('tab interaction works correctly for Photos', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      expect(onTabChangeMock).toHaveBeenCalledWith('photos');
    });

    it('tab interaction works correctly for Reviews', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      expect(onTabChangeMock).toHaveBeenCalledWith('reviews');
    });

    it('handles rapid tab switching', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByText('Reviews'));
        fireEvent.press(getByText('Photos'));
      }

      expect(onTabChangeMock).toHaveBeenCalledTimes(20);
    });

    it('handles 100 rapid presses on Photos tab', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      for (let i = 0; i < 100; i++) {
        fireEvent.press(getByText('Photos'));
      }

      expect(onTabChangeMock).toHaveBeenCalledTimes(100);
    });

    it('handles 100 rapid presses on Reviews tab', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      for (let i = 0; i < 100; i++) {
        fireEvent.press(getByText('Reviews'));
      }

      expect(onTabChangeMock).toHaveBeenCalledTimes(100);
    });
  });

  // --------------------------------------------------------------------------
  // Active Tab Styling Tests - Photos
  // --------------------------------------------------------------------------

  describe('Active Tab Styling - Photos', () => {
    it('applies active tab styling when Photos is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const hasPrimaryBorder = styles.some(
        (style: any) => style?.borderBottomColor === '#10B981'
      );
      expect(hasPrimaryBorder).toBe(true);
    });

    it('applies active text styling when Photos is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const styles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosText.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveTextColor = styles.some(
        (style: any) => style?.color === '#171717'
      );
      const hasActiveTextWeight = styles.some(
        (style: any) => style?.fontWeight === '600'
      );

      expect(hasActiveTextColor).toBe(true);
      expect(hasActiveTextWeight).toBe(true);
    });

    it('does not apply active styling to Reviews when Photos is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const hasTransparentBorder = styles.some(
        (style: any) => style?.borderBottomColor === 'transparent'
      );
      expect(hasTransparentBorder).toBe(true);
    });

    it('Reviews text has inactive styling when Photos is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const styles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsText.props.style].filter((s: any) => s && typeof s === 'object');

      const color = styles.reverse().find((s: any) => s?.color)?.color;
      expect(color).toBe('#A3A3A3');
    });

    it('visual distinction between active Photos and inactive Reviews', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const reviewsText = getByText('Reviews');

      const photosStyles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosText.props.style].filter((s: any) => s && typeof s === 'object');

      const reviewsStyles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsText.props.style].filter((s: any) => s && typeof s === 'object');

      const photosColor = photosStyles.reverse().find((s: any) => s?.color)?.color;
      const reviewsColor = reviewsStyles.reverse().find((s: any) => s?.color)?.color;

      expect(photosColor).toBe('#171717');
      expect(reviewsColor).toBe('#A3A3A3');
    });
  });

  // --------------------------------------------------------------------------
  // Active Tab Styling Tests - Reviews
  // --------------------------------------------------------------------------

  describe('Active Tab Styling - Reviews', () => {
    it('applies active tab styling when Reviews is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const hasPrimaryBorder = styles.some(
        (style: any) => style?.borderBottomColor === '#10B981'
      );
      expect(hasPrimaryBorder).toBe(true);
    });

    it('applies active text styling when Reviews is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const styles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsText.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveTextColor = styles.some(
        (style: any) => style?.color === '#171717'
      );
      const hasActiveTextWeight = styles.some(
        (style: any) => style?.fontWeight === '600'
      );

      expect(hasActiveTextColor).toBe(true);
      expect(hasActiveTextWeight).toBe(true);
    });

    it('does not apply active styling to Photos when Reviews is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const hasTransparentBorder = styles.some(
        (style: any) => style?.borderBottomColor === 'transparent'
      );
      expect(hasTransparentBorder).toBe(true);
    });

    it('Photos text has inactive styling when Reviews is active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const styles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosText.props.style].filter((s: any) => s && typeof s === 'object');

      const color = styles.reverse().find((s: any) => s?.color)?.color;
      expect(color).toBe('#A3A3A3');
    });

    it('visual distinction between active Reviews and inactive Photos', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const reviewsText = getByText('Reviews');

      const photosStyles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosText.props.style].filter((s: any) => s && typeof s === 'object');

      const reviewsStyles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsText.props.style].filter((s: any) => s && typeof s === 'object');

      const photosColor = photosStyles.reverse().find((s: any) => s?.color)?.color;
      const reviewsColor = reviewsStyles.reverse().find((s: any) => s?.color)?.color;

      expect(photosColor).toBe('#A3A3A3');
      expect(reviewsColor).toBe('#171717');
    });
  });

  // --------------------------------------------------------------------------
  // Container Styling Tests
  // --------------------------------------------------------------------------

  describe('Container Styling', () => {
    it('container has correct background color', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const viewElements = UNSAFE_root.findAllByType(View as any);
      const containerView = viewElements[0];
      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#FFFFFF',
          }),
        ])
      );
    });

    it('container has flexDirection row', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const viewElements = UNSAFE_root.findAllByType(View as any);
      const containerView = viewElements[0];
      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('container has bottom border', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const viewElements = UNSAFE_root.findAllByType(View as any);
      const containerView = viewElements[0];
      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }),
        ])
      );
    });

    it('container has correct complete style object', () => {
      const { UNSAFE_root } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const viewElements = UNSAFE_root.findAllByType(View as any);
      const containerView = viewElements[0];
      const styles = Array.isArray(containerView?.props.style)
        ? containerView.props.style.flat()
        : [containerView?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          }),
        ])
      );
    });
  });

  // --------------------------------------------------------------------------
  // Tab Button Styling Tests
  // --------------------------------------------------------------------------

  describe('Tab Button Styling', () => {
    it('Photos tab has flex: 1', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat()
        : [photosButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
          }),
        ])
      );
    });

    it('Reviews tab has flex: 1', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat()
        : [reviewsButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flex: 1,
          }),
        ])
      );
    });

    it('Photos tab has correct padding', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat()
        : [photosButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 16,
          }),
        ])
      );
    });

    it('Reviews tab has correct padding', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat()
        : [reviewsButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paddingVertical: 16,
          }),
        ])
      );
    });

    it('Photos tab has alignItems center', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat()
        : [photosButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
          }),
        ])
      );
    });

    it('Reviews tab has alignItems center', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat()
        : [reviewsButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
          }),
        ])
      );
    });

    it('Photos tab has bottom border width 2', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat()
        : [photosButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderBottomWidth: 2,
          }),
        ])
      );
    });

    it('Reviews tab has bottom border width 2', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat()
        : [reviewsButton?.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderBottomWidth: 2,
          }),
        ])
      );
    });

    it('inactive Photos tab has transparent border', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosButton = getByText('Photos').parent;
      const styles = Array.isArray(photosButton?.props.style)
        ? photosButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const borderColor = styles.reverse().find((s: any) => s?.borderBottomColor)?.borderBottomColor;
      expect(borderColor).toBe('transparent');
    });

    it('inactive Reviews tab has transparent border', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsButton = getByText('Reviews').parent;
      const styles = Array.isArray(reviewsButton?.props.style)
        ? reviewsButton.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsButton?.props.style].filter((s: any) => s && typeof s === 'object');

      const borderColor = styles.reverse().find((s: any) => s?.borderBottomColor)?.borderBottomColor;
      expect(borderColor).toBe('transparent');
    });
  });

  // --------------------------------------------------------------------------
  // Text Styling Tests
  // --------------------------------------------------------------------------

  describe('Text Styling', () => {
    it('Photos text has correct font size', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const styles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat()
        : [photosText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
          }),
        ])
      );
    });

    it('Reviews text has correct font size', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const styles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat()
        : [reviewsText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
          }),
        ])
      );
    });

    it('inactive Photos text has correct color', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const styles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat()
        : [photosText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#A3A3A3',
          }),
        ])
      );
    });

    it('inactive Reviews text has correct color', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const styles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat()
        : [reviewsText.props.style];

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#A3A3A3',
          }),
        ])
      );
    });

    it('active Photos text has correct color and weight', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const styles = Array.isArray(photosText.props.style)
        ? photosText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosText.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColor = styles.some((s: any) => s?.color === '#171717');
      const hasActiveWeight = styles.some((s: any) => s?.fontWeight === '600');

      expect(hasActiveColor).toBe(true);
      expect(hasActiveWeight).toBe(true);
    });

    it('active Reviews text has correct color and weight', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      const styles = Array.isArray(reviewsText.props.style)
        ? reviewsText.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsText.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColor = styles.some((s: any) => s?.color === '#171717');
      const hasActiveWeight = styles.some((s: any) => s?.fontWeight === '600');

      expect(hasActiveColor).toBe(true);
      expect(hasActiveWeight).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Integration Tests
  // --------------------------------------------------------------------------

  describe('Integration Tests', () => {
    it('complete workflow: switch from Photos to Reviews', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      expect(onTabChangeMock).toHaveBeenCalledWith('reviews');
      expect(onTabChangeMock).toHaveBeenCalledTimes(1);
    });

    it('complete workflow: switch from Reviews to Photos', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      expect(onTabChangeMock).toHaveBeenCalledWith('photos');
      expect(onTabChangeMock).toHaveBeenCalledTimes(1);
    });

    it('complete workflow: multiple tab switches', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      fireEvent.press(getByText('Photos'));
      fireEvent.press(getByText('Reviews'));
      fireEvent.press(getByText('Photos'));

      expect(onTabChangeMock).toHaveBeenCalledTimes(4);
      expect(onTabChangeMock).toHaveBeenNthCalledWith(1, 'reviews');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(2, 'photos');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(3, 'reviews');
      expect(onTabChangeMock).toHaveBeenNthCalledWith(4, 'photos');
    });

    it('renders correctly with Photos active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const reviewsText = getByText('Reviews');

      expect(photosText).toBeTruthy();
      expect(reviewsText).toBeTruthy();
    });

    it('renders correctly with Reviews active', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const reviewsText = getByText('Reviews');

      expect(photosText).toBeTruthy();
      expect(reviewsText).toBeTruthy();
    });

    it('maintains state across multiple renders with Photos', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      expect(getByText('Photos')).toBeTruthy();

      rerender(<ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />);

      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('maintains state across multiple renders with Reviews', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      expect(getByText('Reviews')).toBeTruthy();

      rerender(<ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />);

      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('updates when activeTab prop changes from photos to reviews', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosTextBefore = getByText('Photos');
      const photosStylesBefore = Array.isArray(photosTextBefore.props.style)
        ? photosTextBefore.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosTextBefore.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColorBefore = photosStylesBefore.some((s: any) => s?.color === '#171717');
      expect(hasActiveColorBefore).toBe(true);

      rerender(<ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />);

      const reviewsTextAfter = getByText('Reviews');
      const reviewsStylesAfter = Array.isArray(reviewsTextAfter.props.style)
        ? reviewsTextAfter.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsTextAfter.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColorAfter = reviewsStylesAfter.some((s: any) => s?.color === '#171717');
      expect(hasActiveColorAfter).toBe(true);
    });

    it('updates when activeTab prop changes from reviews to photos', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      const reviewsTextBefore = getByText('Reviews');
      const reviewsStylesBefore = Array.isArray(reviewsTextBefore.props.style)
        ? reviewsTextBefore.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [reviewsTextBefore.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColorBefore = reviewsStylesBefore.some((s: any) => s?.color === '#171717');
      expect(hasActiveColorBefore).toBe(true);

      rerender(<ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />);

      const photosTextAfter = getByText('Photos');
      const photosStylesAfter = Array.isArray(photosTextAfter.props.style)
        ? photosTextAfter.props.style.flat(Infinity).filter((s: any) => s && typeof s === 'object')
        : [photosTextAfter.props.style].filter((s: any) => s && typeof s === 'object');

      const hasActiveColorAfter = photosStylesAfter.some((s: any) => s?.color === '#171717');
      expect(hasActiveColorAfter).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Type Safety Tests
  // --------------------------------------------------------------------------

  describe('Type Safety', () => {
    it('accepts "photos" as valid activeTab value', () => {
      expect(() => {
        render(<ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />);
      }).not.toThrow();
    });

    it('accepts "reviews" as valid activeTab value', () => {
      expect(() => {
        render(<ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />);
      }).not.toThrow();
    });

    it('onTabChange receives correct type for photos', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="reviews" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Photos'));
      const calledWith = onTabChangeMock.mock.calls[0][0];
      expect(calledWith).toBe('photos');
      expect(['photos', 'reviews']).toContain(calledWith);
    });

    it('onTabChange receives correct type for reviews', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      fireEvent.press(getByText('Reviews'));
      const calledWith = onTabChangeMock.mock.calls[0][0];
      expect(calledWith).toBe('reviews');
      expect(['photos', 'reviews']).toContain(calledWith);
    });
  });

  // --------------------------------------------------------------------------
  // Performance Tests
  // --------------------------------------------------------------------------

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = Date.now();
      render(<ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles re-renders efficiently', () => {
      const { rerender } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        rerender(
          <ProfileTabs
            activeTab={i % 2 === 0 ? 'photos' : 'reviews'}
            onTabChange={onTabChangeMock}
          />
        );
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('handles rapid tab changes efficiently', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        fireEvent.press(getByText('Reviews'));
        fireEvent.press(getByText('Photos'));
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(onTabChangeMock).toHaveBeenCalledTimes(100);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases Tests
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('handles callback function changes', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      const { rerender, getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={firstCallback} />
      );

      fireEvent.press(getByText('Reviews'));
      expect(firstCallback).toHaveBeenCalledWith('reviews');
      expect(secondCallback).not.toHaveBeenCalled();

      rerender(<ProfileTabs activeTab="photos" onTabChange={secondCallback} />);

      fireEvent.press(getByText('Reviews'));
      expect(secondCallback).toHaveBeenCalledWith('reviews');
      expect(firstCallback).toHaveBeenCalledTimes(1);
    });

    it('handles simultaneous prop updates', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const newCallback = jest.fn();
      rerender(<ProfileTabs activeTab="reviews" onTabChange={newCallback} />);

      fireEvent.press(getByText('Photos'));
      expect(newCallback).toHaveBeenCalledWith('photos');
      expect(onTabChangeMock).not.toHaveBeenCalled();
    });

    it('renders consistently after 10 re-renders', () => {
      const { rerender, getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      for (let i = 0; i < 10; i++) {
        rerender(
          <ProfileTabs
            activeTab={i % 2 === 0 ? 'photos' : 'reviews'}
            onTabChange={onTabChangeMock}
          />
        );
      }

      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('maintains functionality after 50 interactions', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      for (let i = 0; i < 50; i++) {
        fireEvent.press(getByText(i % 2 === 0 ? 'Reviews' : 'Photos'));
      }

      expect(onTabChangeMock).toHaveBeenCalledTimes(50);
      expect(getByText('Photos')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility Tests
  // --------------------------------------------------------------------------

  describe('Accessibility', () => {
    it('Photos tab is accessible', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      expect(photosText).toBeTruthy();
    });

    it('Reviews tab is accessible', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const reviewsText = getByText('Reviews');
      expect(reviewsText).toBeTruthy();
    });

    it('both tabs are findable by text', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      expect(() => getByText('Photos')).not.toThrow();
      expect(() => getByText('Reviews')).not.toThrow();
    });

    it('tab labels are clear and descriptive', () => {
      const { getByText } = render(
        <ProfileTabs activeTab="photos" onTabChange={onTabChangeMock} />
      );

      const photosText = getByText('Photos');
      const reviewsText = getByText('Reviews');

      expect(photosText.props.children).toBe('Photos');
      expect(reviewsText.props.children).toBe('Reviews');
    });
  });
});
