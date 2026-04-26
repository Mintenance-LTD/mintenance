import { StyleSheet, Platform, Dimensions } from 'react-native';
import { theme } from '../../theme';
import type { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.78;

// Category marker config — icon + color per trade
export const CATEGORY_MARKERS: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; bg: string }
> = {
  plumbing: { icon: 'water', bg: theme.colors.primary },
  electrical: { icon: 'flash', bg: theme.colors.accent },
  roofing: { icon: 'home', bg: theme.colors.primary },
  painting: { icon: 'color-palette', bg: '#3B82F6' },
  carpentry: { icon: 'hammer', bg: theme.colors.accent },
  cleaning: { icon: 'sparkles', bg: '#3B82F6' },
  hvac: { icon: 'thermometer', bg: theme.colors.error },
  landscaping: { icon: 'leaf', bg: theme.colors.primary },
  appliance: { icon: 'settings', bg: theme.colors.accent },
  general: { icon: 'construct', bg: theme.colors.textSecondary },
};

// Category tabs
export const CATEGORIES = [
  {
    id: null,
    name: 'All',
    icon: 'grid-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'flash-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'appliance',
    name: 'Appliances',
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'snow-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: 'hammer-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
  },
];

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
  },
  searchTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  searchSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryRow: {
    maxHeight: 38,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: theme.colors.textInverse,
  },
  markerWrapper: {
    alignItems: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  urgentDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 5,
  },
  loadingDots: {
    flexDirection: 'row',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  jobCountPill: {
    position: 'absolute',
    left: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  jobCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  carouselCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
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
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  carouselMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 10,
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
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
  },
  carouselBidText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  carouselDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 8,
  },
  carouselDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  userMarker: {
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  userMarkerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  mapUnavailable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mapUnavailableTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mapUnavailableText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
});
