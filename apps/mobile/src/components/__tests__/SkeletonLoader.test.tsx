import React from 'react';
import { render } from '@testing-library/react-native';

import {
  SkeletonMessageCard,
  SkeletonDashboard,
  SkeletonButton,
  SkeletonCard,
  SkeletonPostCard,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
} from '../SkeletonLoader';

/**
 * SkeletonLoader exposes two public components — SkeletonMessageCard and
 * SkeletonDashboard — which compose the file's internal primitives:
 *   Skeleton (animated shimmer placeholder + useEffect loop + cleanup),
 *   SkeletonText (renders N lines, last line at 80% width),
 *   SkeletonAvatar, and SkeletonStatCard.
 *
 * Each Skeleton placeholder renders as an Animated.View. Under the repo's
 * react-native manual mock, Animated.View is the host string 'Animated.View',
 * so we can count the rendered placeholders precisely via findAllByType.
 *
 * The internal SkeletonButton / SkeletonCard / SkeletonPostCard components are
 * neither exported nor referenced by any exported component — they are dead
 * code in this file and therefore unreachable from a black-box test.
 */

const ANIMATED_VIEW = 'Animated.View';

const countSkeletons = (root: ReturnType<typeof render>['root']): number =>
  root.findAllByType(ANIMATED_VIEW as never).length;

describe('SkeletonLoader', () => {
  describe('SkeletonMessageCard', () => {
    it('renders without crashing', () => {
      expect(() => render(<SkeletonMessageCard />)).not.toThrow();
    });

    it('renders the expected number of shimmer placeholders', () => {
      // Avatar (1 Skeleton) + name (1) + time (1) + 2 message lines (1 each)
      // SkeletonAvatar => 1 Skeleton, plus 4 inline Skeletons = 5 total.
      const { root } = render(<SkeletonMessageCard />);
      expect(countSkeletons(root)).toBe(5);
    });

    it('every placeholder carries a positive height style', () => {
      const { root } = render(<SkeletonMessageCard />);
      const placeholders = root.findAllByType(ANIMATED_VIEW as never);
      for (const node of placeholders) {
        const flat = ([] as unknown[]).concat(node.props.style).filter(Boolean);
        const heights = flat
          .map((s) => (s as { height?: number })?.height)
          .filter((h): h is number => typeof h === 'number');
        expect(heights.some((h) => h > 0)).toBe(true);
      }
    });
  });

  describe('SkeletonDashboard', () => {
    it('renders without crashing', () => {
      expect(() => render(<SkeletonDashboard />)).not.toThrow();
    });

    it('renders four stat cards plus a section header and a 2-line text block', () => {
      // 4 SkeletonStatCard, each = 2 Skeleton + 1 SkeletonAvatar(=1 Skeleton)
      //   => 4 * 3 = 12 placeholders.
      // Section: 1 header Skeleton + SkeletonText(lines=2) => 2 placeholders.
      // Total = 12 + 1 + 2 = 15.
      const { root } = render(<SkeletonDashboard />);
      expect(countSkeletons(root)).toBe(15);
    });

    it('exercises the SkeletonText last-line (80%) width branch', () => {
      // SkeletonText(lines=2) -> first line width '100%', last line width '80%'.
      const { root } = render(<SkeletonDashboard />);
      const placeholders = root.findAllByType(ANIMATED_VIEW as never);
      const widths = placeholders.flatMap((node) =>
        ([] as unknown[])
          .concat(node.props.style)
          .filter(Boolean)
          .map((s) => (s as { width?: unknown })?.width)
      );
      // Both the index===lines-1 (true) and index!==lines-1 (false) branches
      // of SkeletonText must have executed.
      expect(widths).toContain('80%');
      expect(widths).toContain('100%');
    });
  });

  describe('Skeleton primitive behaviour (via exports)', () => {
    it('mounts and unmounts cleanly, exercising the shimmer effect + cleanup', () => {
      const utils = render(<SkeletonDashboard />);
      // Unmount triggers the useEffect cleanup (animation.stop()) on every
      // Skeleton instance.
      expect(() => utils.unmount()).not.toThrow();
    });

    it('applies an interpolated opacity to each placeholder', () => {
      const { root } = render(<SkeletonMessageCard />);
      const placeholders = root.findAllByType(ANIMATED_VIEW as never);
      // Each Skeleton sets opacity from shimmerAnimation.interpolate(...).
      const withOpacity = placeholders.filter((node) =>
        ([] as unknown[])
          .concat(node.props.style)
          .filter(Boolean)
          .some((s) => (s as { opacity?: unknown })?.opacity !== undefined)
      );
      expect(withOpacity.length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonButton', () => {
    it('renders a single shimmer placeholder', () => {
      const { root } = render(<SkeletonButton />);
      expect(countSkeletons(root)).toBe(1);
    });
  });

  describe('SkeletonCard', () => {
    it('renders without crashing', () => {
      expect(() => render(<SkeletonCard />)).not.toThrow();
    });

    it('renders the expected number of shimmer placeholders', () => {
      // Header: SkeletonAvatar(1) + name(1) + subtitle(1) = 3
      // Body: SkeletonText(lines=3) = 3
      // Actions: 3 action chips = 3
      // Total = 9.
      const { root } = render(<SkeletonCard />);
      expect(countSkeletons(root)).toBe(9);
    });
  });

  describe('SkeletonPostCard', () => {
    it('renders without crashing', () => {
      expect(() => render(<SkeletonPostCard />)).not.toThrow();
    });

    it('renders the expected number of shimmer placeholders', () => {
      // Header: SkeletonAvatar(1) + name(1) + subtitle(1) = 3
      // Content: SkeletonText(lines=2) = 2
      // Hashtags: 3
      // Engagement row: 4
      // Total = 12.
      const { root } = render(<SkeletonPostCard />);
      expect(countSkeletons(root)).toBe(12);
    });
  });

  describe('primitive default props (default-arg branches)', () => {
    it('Skeleton renders with all defaults (width 100%, height 20, radius 8)', () => {
      const { root } = render(<Skeleton />);
      const [node] = root.findAllByType(ANIMATED_VIEW as never);
      const flat = ([] as unknown[])
        .concat(node.props.style)
        .filter(Boolean) as Array<Record<string, unknown>>;
      const merged = Object.assign({}, ...flat);
      expect(merged.width).toBe('100%');
      expect(merged.height).toBe(20);
      expect(merged.borderRadius).toBe(8);
    });

    it('Skeleton honours explicit width/height/borderRadius', () => {
      const { root } = render(
        <Skeleton width={120} height={40} borderRadius={4} />
      );
      const [node] = root.findAllByType(ANIMATED_VIEW as never);
      const merged = Object.assign(
        {},
        ...(([] as unknown[]).concat(node.props.style).filter(Boolean) as Array<
          Record<string, unknown>
        >)
      );
      expect(merged.width).toBe(120);
      expect(merged.height).toBe(40);
      expect(merged.borderRadius).toBe(4);
    });

    it('SkeletonText renders a single line by default', () => {
      const { root } = render(<SkeletonText />);
      // lines defaults to 1 -> one Skeleton placeholder.
      expect(countSkeletons(root)).toBe(1);
    });

    it('SkeletonText renders the requested number of lines', () => {
      const { root } = render(<SkeletonText lines={4} />);
      expect(countSkeletons(root)).toBe(4);
    });

    it('SkeletonAvatar renders a circular placeholder with default size', () => {
      const { root } = render(<SkeletonAvatar />);
      const [node] = root.findAllByType(ANIMATED_VIEW as never);
      const merged = Object.assign(
        {},
        ...(([] as unknown[]).concat(node.props.style).filter(Boolean) as Array<
          Record<string, unknown>
        >)
      );
      // size defaults to 50 -> width/height 50, borderRadius 25.
      expect(merged.width).toBe(50);
      expect(merged.height).toBe(50);
      expect(merged.borderRadius).toBe(25);
    });

    it('SkeletonAvatar honours an explicit size', () => {
      const { root } = render(<SkeletonAvatar size={30} />);
      const [node] = root.findAllByType(ANIMATED_VIEW as never);
      const merged = Object.assign(
        {},
        ...(([] as unknown[]).concat(node.props.style).filter(Boolean) as Array<
          Record<string, unknown>
        >)
      );
      expect(merged.width).toBe(30);
      expect(merged.borderRadius).toBe(15);
    });
  });

  it('is stable across multiple renders (re-mount safety)', () => {
    for (let i = 0; i < 3; i += 1) {
      const utils = render(<SkeletonDashboard />);
      expect(utils.root.findAllByType(ANIMATED_VIEW as never).length).toBe(15);
      utils.unmount();
    }
  });
});
