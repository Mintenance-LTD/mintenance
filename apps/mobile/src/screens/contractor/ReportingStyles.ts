import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  decorCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    left: -30,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  frostedCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: me.brandSoft,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
    opacity: 0.9,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  heroKpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroKpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'space-between',
    minHeight: 90,
  },
  heroKpiLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroKpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroKpiSublabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  content: { padding: 20, paddingBottom: 40 },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 12,
  },

  // Error
  errorCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: me.surface,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: me.brand,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: me.onBrand,
  },

  // Filters — floating overlapping hero
  filterWrapper: {
    marginTop: -14,
    marginBottom: 20,
    zIndex: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: me.line,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: me.brand,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipTextActive: { color: me.onBrand },

  // KPI
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: me.line,
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 10,
    color: me.ink2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: me.ink,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: me.line,
  },

  // Bar chart
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 24,
  },
  barCol: { alignItems: 'center', gap: 6 },
  bar: { borderRadius: 8 },
  barLabel: {
    fontSize: 10,
    color: me.ink3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '800',
    color: me.ink2,
  },

  // Chart empty
  chartEmpty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  chartEmptyText: { fontSize: 13, color: me.ink3 },

  // Gauge
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  gaugeItem: { alignItems: 'center', gap: 8 },
  gaugeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: { fontSize: 18, fontWeight: '700', color: me.brand },
  gaugeLabel: {
    fontSize: 12,
    color: me.ink2,
    fontWeight: '500',
  },
  gaugeDivider: { width: 1, height: 40, backgroundColor: me.line },

  // Category
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryLabel: { width: 80, fontSize: 13, color: me.ink2 },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: me.line,
    borderRadius: 4,
  },
  categoryFill: {
    height: 8,
    backgroundColor: me.brand,
    borderRadius: 4,
  },
  categoryCount: {
    width: 24,
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'right',
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  ratingLabel: {
    width: 16,
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: me.line,
    borderRadius: 4,
  },
  ratingFill: {
    height: 8,
    backgroundColor: me.accent,
    borderRadius: 4,
  },
  ratingCount: {
    width: 24,
    fontSize: 12,
    color: me.ink3,
    textAlign: 'right',
  },

  // Reviews
  reviewRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
    paddingBottom: 10,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  starRow: { flexDirection: 'row', gap: 1 },
  reviewComment: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 18,
  },

  // Tier badge
  tierBanner: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  tierContent: { zIndex: 1 },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tierTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tierDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    maxWidth: '80%',
  },
  tierWatermark: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    opacity: 0.1,
  },
});
