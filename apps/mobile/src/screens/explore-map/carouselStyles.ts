/**
 * Styles for the explore-map's bottom job carousel (the snap-scrolling
 * preview cards over the map).
 *
 * Split out of `styles.ts` on 2026-07-20: adding the match ring + AI pill
 * pushed that file past the 500-line pre-commit gate. Exported as a plain
 * object and spread into the single `StyleSheet.create` in `styles.ts`, so
 * every call site keeps using `styles.carouselX` unchanged.
 */
import { Dimensions } from 'react-native';
import { me } from '../../design-system/mint-editorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Width of a single carousel card. Defined here (not in `styles.ts`) so this
 * module has no import cycle back into the barrel that spreads it;
 * `styles.ts` re-exports it, so `import { CARD_WIDTH } from './styles'`
 * keeps working for every existing call site.
 *
 * 2026-07-20 redesign: full-width minus the 16px gutters — one card per
 * page, no neighbour peek (user call: the peek "looks messy"). The page
 * dots under the carousel carry the swipe-for-more hint instead.
 */
export const CARD_WIDTH = SCREEN_WIDTH - 32;

/** Photo header height inside the carousel card. */
export const CARD_PHOTO_HEIGHT = 104;

export const carouselStyles = {
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: me.surface,
    borderRadius: 16,
    // Padding lives on carouselBody now — the photo header must run
    // edge-to-edge under the rounded corners.
    overflow: 'hidden' as const,
    ...me.shadow.pop,
  },
  carouselCardSelected: {
    borderWidth: 2,
    borderColor: me.brand,
  },
  carouselPhoto: {
    width: '100%' as const,
    height: CARD_PHOTO_HEIGHT,
  },
  carouselPhotoPlaceholder: {
    width: '100%' as const,
    height: CARD_PHOTO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom-anchored dark band over the photo: budget left, urgency right.
  carouselPhotoScrim: {
    position: 'absolute',
    top: CARD_PHOTO_HEIGHT - 30,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(20, 24, 22, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  carouselScrimBudget: {
    fontSize: 16,
    fontWeight: '800',
    color: me.onBrand,
    letterSpacing: -0.3,
  },
  carouselUrgencyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  carouselUrgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.onBrand,
  },
  carouselPhotoCountChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  carouselPhotoCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.ink,
  },
  carouselBody: {
    padding: 12,
    paddingTop: 10,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  carouselTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  matchRing: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchRingText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
  },
  carouselMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  carouselMeta: {
    fontSize: 12,
    color: me.ink2,
  },
  carouselAiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: me.infoBg,
  },
  carouselAiText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.infoFg,
  },
  carouselActions: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselBidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingVertical: 8,
  },
  carouselBidText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.onBrand,
  },
  carouselDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: me.bg2,
    borderRadius: 12,
    paddingVertical: 8,
  },
  carouselDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
  },
  // Swipe-for-more indicator under the carousel. Dots for small result
  // sets; the "N of M" label variant takes over past DOT_LIMIT (defined
  // screen-side) because 50 dots is its own kind of messy.
  carouselDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  carouselDot: {
    width: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: me.brand,
  },
  carouselDotsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden' as const,
  },
} as const;
