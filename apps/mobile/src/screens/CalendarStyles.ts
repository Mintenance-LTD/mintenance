/**
 * CalendarStyles — Mint Editorial paper-toned palette.
 * Pre-redesign this file shipped a green-gradient hero + decorative
 * circles + 3-color event-dot row. Those are gone — only paper bg,
 * `me.*` tokens, and the timeline rail palette remain.
 */
import { StyleSheet } from 'react-native';
import { me } from '../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderColor: me.line2,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink,
  },
  screenHeader: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 4,
  },
  // Week strip — paper background, no full-bleed.
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink3,
    marginBottom: 8,
  },
  dayNameSelected: {
    color: me.ink,
  },
  dayNumberChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayNumberChipSelected: {
    backgroundColor: me.ink,
  },
  dayNumberChipToday: {
    borderWidth: 1,
    borderColor: me.brand,
  },
  dayNumber: {
    fontFamily: me.font.display,
    fontSize: 18,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  dayNumberSelected: {
    color: me.onBrand,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
    minHeight: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotIdle: {
    backgroundColor: me.brand,
  },
  dotSelected: {
    backgroundColor: me.brand,
  },
  // Day eyebrow above the agenda.
  dayEyebrow: {
    paddingHorizontal: 20,
    marginBottom: 14,
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  // Timeline agenda.
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 60,
  },
  railCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 22,
  },
  railNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: me.line,
    marginTop: 4,
  },
  rowBody: {
    flex: 1,
    paddingBottom: 18,
  },
  rowEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink3,
    marginBottom: 4,
  },
  eventCard: {
    backgroundColor: me.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: me.line2,
    borderRightColor: me.line2,
    borderBottomColor: me.line2,
    ...me.shadow.card,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventMeta: {
    fontSize: 11,
    color: me.ink3,
    flex: 1,
  },
  // Empty / loading / error.
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  stateTitle: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    marginTop: 14,
    letterSpacing: me.displayTracking,
  },
  stateSubtitle: {
    fontSize: 13,
    color: me.ink2,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: me.brand,
  },
  retryButtonText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  browseButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: me.ink,
  },
  browseButtonText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
});
