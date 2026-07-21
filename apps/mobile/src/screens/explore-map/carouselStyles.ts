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
 */
export const CARD_WIDTH = SCREEN_WIDTH * 0.78;

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
    padding: 14,
    ...me.shadow.pop,
  },
  carouselCardSelected: {
    borderWidth: 2,
    borderColor: me.brand,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  carouselBudget: {
    fontSize: 20,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.5,
  },
  carouselCatPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  carouselHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
} as const;
