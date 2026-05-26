import { StyleSheet, Dimensions } from 'react-native';
import { me } from '../../design-system/mint-editorial';
import type { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.78;

// Category marker config — icon + color per trade.
// 2026-05-27 audit-72 P2: extended to cover every entry in
// packages/api-contracts JOB_CATEGORIES. Live DB had a `handyman` job
// (verified via Supabase MCP) that fell back to the generic grey
// hammer marker because it wasn't represented here. The categories
// below must stay in sync with JOB_CATEGORIES; the CATEGORIES array
// below covers the same set for the pill filter row.
export const CATEGORY_MARKERS: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; bg: string }
> = {
  plumbing: { icon: 'water', bg: me.brand },
  electrical: { icon: 'flash', bg: me.accent },
  roofing: { icon: 'home', bg: me.brand },
  painting: { icon: 'color-palette', bg: '#3B82F6' },
  carpentry: { icon: 'hammer', bg: me.accent },
  cleaning: { icon: 'sparkles', bg: '#3B82F6' },
  hvac: { icon: 'thermometer', bg: me.errFg },
  landscaping: { icon: 'leaf', bg: me.brand },
  appliance: { icon: 'settings', bg: me.accent },
  general: { icon: 'construct', bg: me.ink2 },
  // audit-72 P2 additions
  handyman: { icon: 'build', bg: me.accent },
  flooring: { icon: 'grid', bg: me.brand },
  tiling: { icon: 'apps', bg: me.brand },
  plastering: { icon: 'brush', bg: me.accent },
  guttering: { icon: 'rainy', bg: me.brand },
  fencing: { icon: 'shield', bg: me.accent },
  damp: { icon: 'water-outline', bg: me.errFg },
  pest_control: { icon: 'bug', bg: me.errFg },
  heating: { icon: 'flame', bg: me.errFg },
  gardening: { icon: 'flower', bg: me.brand },
  other: { icon: 'ellipsis-horizontal', bg: me.ink2 },
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
  // 2026-05-26 audit-49 P2: live DB has posted landscaping jobs +
  // CATEGORY_MARKERS above already knows the icon/colour, but the
  // pill was missing so landscaping jobs only showed under "All".
  // packages/api-contracts also includes landscaping as a valid
  // category — adding it here closes the filter gap.
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
  },
  // 2026-05-27 audit-72 P2: extend pill filters to match the full
  // shared JOB_CATEGORIES list. Without these the contractor can see
  // a handyman job under "All" but can't intentionally filter for it
  // — and live DB confirmed a handyman job exists. Adding the
  // remainder so the discover-filter contract matches the post-job
  // category contract.
  {
    id: 'handyman',
    name: 'Handyman',
    icon: 'build-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'heating',
    name: 'Heating',
    icon: 'flame-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'gardening',
    name: 'Gardening',
    icon: 'flower-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: 'grid-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'tiling',
    name: 'Tiling',
    icon: 'apps-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'plastering',
    name: 'Plastering',
    icon: 'brush-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'guttering',
    name: 'Guttering',
    icon: 'rainy-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'fencing',
    name: 'Fencing',
    icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'damp',
    name: 'Damp',
    icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'pest_control',
    name: 'Pest control',
    icon: 'bug-outline' as keyof typeof Ionicons.glyphMap,
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'ellipsis-horizontal-outline' as keyof typeof Ionicons.glyphMap,
  },
];

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: me.surface,
    paddingBottom: 10,
    ...me.shadow.card,
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
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.bg2,
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
    color: me.ink,
  },
  searchSubtitle: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 1,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: me.line,
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
    backgroundColor: me.surface,
    gap: 4,
    borderWidth: 1,
    borderColor: me.line,
  },
  categoryPillActive: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  categoryPillTextActive: {
    color: me.onBrand,
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
    ...me.shadow.pop,
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
    backgroundColor: me.errFg,
    borderWidth: 2,
    borderColor: me.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 5,
  },
  loadingDots: {
    flexDirection: 'row',
    backgroundColor: me.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: me.surface,
  },
  jobCountPill: {
    position: 'absolute',
    left: 16,
    backgroundColor: me.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 5,
    ...me.shadow.pop,
  },
  jobCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...me.shadow.pop,
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
  carouselMeta: {
    fontSize: 12,
    color: me.ink2,
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
  userMarker: {
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.brand,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...me.shadow.pop,
  },
  userMarkerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: me.ink,
    marginTop: 2,
  },
  mapUnavailable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 190,
  },
  mapUnavailableTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  mapUnavailableText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: me.ink2,
  },
});
