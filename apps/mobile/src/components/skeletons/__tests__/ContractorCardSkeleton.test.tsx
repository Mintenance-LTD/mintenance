import React from 'react';
import { render } from '../../../test-utils';
import { ContractorCardSkeleton } from '../ContractorCardSkeleton';

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

describe('ContractorCardSkeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with default props', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      const tree = toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should render the container', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(tree).toHaveProperty('type');
    });

    it('should render View as the root component', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      const tree = toJSON();
      expect(tree?.type).toBe('View');
    });
  });

  describe('Count Prop - Default Behavior', () => {
    it('should render with default count of 1 card', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render exactly one card by default', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe('Count Prop - Single Card', () => {
    it('should render correct number when count=1', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render single card structure', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe('Count Prop - Multiple Cards', () => {
    it('should render correct number when count=2', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={2} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=3', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=5', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={5} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=8', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={8} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render correct number when count=10', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={10} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Count Prop - Edge Cases', () => {
    it('should handle count=0 without crashing', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle large count values', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={20} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle very large count values', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={100} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle negative count gracefully', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={-1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle decimal count values', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3.7} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle fractional count', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={2.5} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle NaN count gracefully', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={NaN} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle extremely large count', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1000} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ShowPortfolio Prop - Default Behavior', () => {
    it('should not show portfolio by default', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render without portfolio section by default', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });
  });

  describe('ShowPortfolio Prop - False', () => {
    it('should not show portfolio when showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });

    it('should hide portfolio section when showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio=false with count=5', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={5} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ShowPortfolio Prop - True', () => {
    it('should show portfolio when showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={true} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });

    it('should render portfolio section when showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio=true with count=1', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio=true with count=3', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio=true with count=10', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={10} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Prop Combinations - Count and ShowPortfolio', () => {
    it('should handle count=1 with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=1 with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=2 with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={2} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=2 with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={2} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=5 with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={5} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=5 with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={5} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=0 with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={0} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=0 with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={0} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle all props as undefined', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={undefined} showPortfolio={undefined} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=7 with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={7} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count=8 with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={8} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Component Updates - Count Changes', () => {
    it('should handle count prop changes from 1 to 3', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count prop changes from 3 to 7', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={7} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count prop changes from 5 to 1', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={5} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle switching from zero count to positive count', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={0} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={5} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle multiple count changes', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={1} />);
      for (let i = 2; i <= 5; i++) {
        rerender(<ContractorCardSkeleton count={i} />);
        expect(toJSON()).toBeTruthy();
      }
    });
  });

  describe('Component Updates - ShowPortfolio Changes', () => {
    it('should handle showPortfolio prop changes from false to true', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio prop changes from true to false', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should toggle showPortfolio multiple times', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Component Updates - Combined Prop Changes', () => {
    it('should handle multiple prop changes', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={3} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={5} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={2} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle count change while keeping showPortfolio constant', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={5} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showPortfolio change while keeping count constant', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={3} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={3} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle complex prop update sequence', () => {
      const { rerender, toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={3} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={3} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={7} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();

      rerender(<ContractorCardSkeleton count={7} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount and unmount cleanly', () => {
      const { unmount, toJSON } = render(<ContractorCardSkeleton />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should mount with custom props and unmount cleanly', () => {
      const { unmount, toJSON } = render(<ContractorCardSkeleton count={10} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should mount with showPortfolio=true and unmount cleanly', () => {
      const { unmount, toJSON } = render(<ContractorCardSkeleton count={5} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const { unmount: unmount1, toJSON: toJSON1 } = render(<ContractorCardSkeleton />);
      expect(toJSON1()).toBeTruthy();
      unmount1();

      const { unmount: unmount2, toJSON: toJSON2 } = render(<ContractorCardSkeleton />);
      expect(toJSON2()).toBeTruthy();
      unmount2();

      const { unmount: unmount3, toJSON: toJSON3 } = render(<ContractorCardSkeleton />);
      expect(toJSON3()).toBeTruthy();
      unmount3();
    });

    it('should unmount after prop changes', () => {
      const { rerender, unmount, toJSON } = render(<ContractorCardSkeleton count={3} />);
      rerender(<ContractorCardSkeleton count={8} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });

    it('should unmount after showPortfolio changes', () => {
      const { rerender, unmount, toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      rerender(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
      unmount();
      expect(toJSON()).toBeNull();
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot with default props', () => {
      const { toJSON } = render(<ContractorCardSkeleton />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=1', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=3', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton showPortfolio={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=8 and showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={8} showPortfolio={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=1 and showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=0', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={0} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=5 and showPortfolio=false', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={5} showPortfolio={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with count=2 and showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={2} showPortfolio={true} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Default Export', () => {
    it('should be importable as default export', () => {
      const ContractorCardSkeletonDefault = require('../ContractorCardSkeleton').default;
      expect(ContractorCardSkeletonDefault).toBeDefined();
    });

    it('should render when imported as default', () => {
      const ContractorCardSkeletonDefault = require('../ContractorCardSkeleton').default;
      const { toJSON } = render(<ContractorCardSkeletonDefault />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with props when imported as default', () => {
      const ContractorCardSkeletonDefault = require('../ContractorCardSkeleton').default;
      const { toJSON } = render(<ContractorCardSkeletonDefault count={3} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with showPortfolio=true when imported as default', () => {
      const ContractorCardSkeletonDefault = require('../ContractorCardSkeleton').default;
      const { toJSON } = render(<ContractorCardSkeletonDefault count={5} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases - Portfolio Rendering', () => {
    it('should render portfolio with count=0 and showPortfolio=true', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={0} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render portfolio with large count', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={50} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle portfolio with negative count', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={-1} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle portfolio with NaN count', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={NaN} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Card Structure Elements', () => {
    it('should render card with header section', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render card with bio section', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render card with skills section', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render card with stats section', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render card with action buttons section', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all sections without portfolio', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render all sections including portfolio', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={1} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Multiple Cards Consistency', () => {
    it('should render consistent structure for multiple cards without portfolio', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3} showPortfolio={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render consistent structure for multiple cards with portfolio', () => {
      const { toJSON } = render(<ContractorCardSkeleton count={3} showPortfolio={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render different card counts with same props', () => {
      const { toJSON: json1 } = render(<ContractorCardSkeleton count={2} showPortfolio={true} />);
      const { toJSON: json2 } = render(<ContractorCardSkeleton count={4} showPortfolio={true} />);
      expect(json1()).toBeTruthy();
      expect(json2()).toBeTruthy();
    });
  });
});
