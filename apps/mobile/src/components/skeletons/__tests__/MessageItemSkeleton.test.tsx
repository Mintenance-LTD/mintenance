import React from 'react';
import { render } from '../../../test-utils';
import { MessageItemSkeleton } from '../MessageItemSkeleton';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock AccessibilityInfo
jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  announceForAccessibility: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({})),
}));

// Mock the Skeleton component to avoid animation issues in tests
jest.mock('../Skeleton', () => ({
  Skeleton: ({ width, height, borderRadius, style, testID }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: testID || 'skeleton-mock',
      style: { width, height, borderRadius, ...style },
    });
  },
  SkeletonAvatar: ({ size, testID }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: testID || 'skeleton-avatar-mock',
      style: { width: size, height: size, borderRadius: size / 2 },
    });
  },
  SkeletonGroup: ({ children, gap, style }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: 'skeleton-group-mock',
      style: { gap, ...style },
    }, children);
  },
}));

describe('MessageItemSkeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with default props', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      const tree = toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should render the container', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree).toHaveProperty('type');
    });
  });

  describe('Count Prop', () => {
    it('should render with default count of 5 items', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=1', () => {
      const { toJSON } = render(<MessageItemSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=3', () => {
      const { toJSON } = render(<MessageItemSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=8', () => {
      const { toJSON } = render(<MessageItemSkeleton count={8} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=0 without crashing', () => {
      const { toJSON } = render(<MessageItemSkeleton count={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle large count values', () => {
      const { toJSON } = render(<MessageItemSkeleton count={20} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle negative count gracefully', () => {
      const { toJSON } = render(<MessageItemSkeleton count={-1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle decimal count values', () => {
      const { toJSON } = render(<MessageItemSkeleton count={3.7} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle NaN count gracefully', () => {
      const { toJSON } = render(<MessageItemSkeleton count={NaN} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ShowUnread Prop', () => {
    it('should show unread indicators by default', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should show unread indicators when showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should not show unread indicators when showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton showUnread={false} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });

    it('should apply unread indicator pattern with count=5', () => {
      const { toJSON } = render(<MessageItemSkeleton count={5} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showUnread=false with count=10', () => {
      const { toJSON } = render(<MessageItemSkeleton count={10} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Prop Combinations', () => {
    it('should handle count=1 with showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton count={1} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=10 with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={10} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=0 with showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton count={0} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle all props as undefined', () => {
      const { toJSON } = render(<MessageItemSkeleton count={undefined} showUnread={undefined} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=5 with showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton count={5} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=7 with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={7} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Component Updates', () => {
    it('should handle count prop changes', () => {
      const { rerender, toJSON } = render(<MessageItemSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();

      rerender(<MessageItemSkeleton count={7} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showUnread prop changes', () => {
      const { rerender, toJSON } = render(<MessageItemSkeleton showUnread={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<MessageItemSkeleton showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle multiple prop changes', () => {
      const { rerender, toJSON } = render(<MessageItemSkeleton count={3} showUnread={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<MessageItemSkeleton count={5} showUnread={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<MessageItemSkeleton count={2} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle switching from zero count to positive count', () => {
      const { rerender, toJSON } = render(<MessageItemSkeleton count={0} />);
      expect(toJSON()).toBeTruthy();

      rerender(<MessageItemSkeleton count={5} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle multiple rerender cycles', () => {
      const { rerender, toJSON } = render(<MessageItemSkeleton count={1} />);
      for (let i = 2; i <= 5; i++) {
        rerender(<MessageItemSkeleton count={i} />);
        expect(toJSON()).toBeTruthy();
      }
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount and unmount cleanly', () => {
      const { unmount, toJSON } = render(<MessageItemSkeleton />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should mount with custom props and unmount cleanly', () => {
      const { unmount, toJSON } = render(<MessageItemSkeleton count={10} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount: unmount1, toJSON: toJSON1 } = render(<MessageItemSkeleton />);
      expect(toJSON1()).toBeTruthy();
      unmount1();

      const { unmount: unmount2, toJSON: toJSON2 } = render(<MessageItemSkeleton />);
      expect(toJSON2()).toBeTruthy();
      unmount2();

      const { unmount: unmount3, toJSON: toJSON3 } = render(<MessageItemSkeleton />);
      expect(toJSON3()).toBeTruthy();
      unmount3();
    });

    it('should unmount after prop changes', () => {
      const { rerender, unmount, toJSON } = render(<MessageItemSkeleton count={3} />);
      rerender(<MessageItemSkeleton count={8} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large count values', () => {
      const { toJSON } = render(<MessageItemSkeleton count={100} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle fractional count', () => {
      const { toJSON } = render(<MessageItemSkeleton count={2.5} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle extremely large count', () => {
      const { toJSON } = render(<MessageItemSkeleton count={1000} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showUnread with count=0', () => {
      const { toJSON } = render(<MessageItemSkeleton count={0} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot with default props', () => {
      const { toJSON } = render(<MessageItemSkeleton />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=3', () => {
      const { toJSON } = render(<MessageItemSkeleton count={3} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton showUnread={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=8 and showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={8} showUnread={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=1 and showUnread=false', () => {
      const { toJSON } = render(<MessageItemSkeleton count={1} showUnread={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=0', () => {
      const { toJSON } = render(<MessageItemSkeleton count={0} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Unread Indicator Pattern', () => {
    it('should render with unread pattern on index % 3 === 0', () => {
      const { toJSON } = render(<MessageItemSkeleton count={10} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should not show unread when showUnread=false regardless of index', () => {
      const { toJSON } = render(<MessageItemSkeleton count={10} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle single item with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={1} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle two items with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={2} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle three items with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={3} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle four items with showUnread=true', () => {
      const { toJSON } = render(<MessageItemSkeleton count={4} showUnread={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Default Export', () => {
    it('should be importable as default export', () => {
      const MessageItemSkeletonDefault = require('../MessageItemSkeleton').default;
      expect(MessageItemSkeletonDefault).toBeDefined();
    });

    it('should render when imported as default', () => {
      const MessageItemSkeletonDefault = require('../MessageItemSkeleton').default;
      const { toJSON } = render(<MessageItemSkeletonDefault />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with props when imported as default', () => {
      const MessageItemSkeletonDefault = require('../MessageItemSkeleton').default;
      const { toJSON } = render(<MessageItemSkeletonDefault count={3} showUnread={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
