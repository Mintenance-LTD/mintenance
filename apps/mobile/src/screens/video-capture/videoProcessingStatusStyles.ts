import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...me.shadow.card,
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 6,
  },
  statusDescription: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: me.line,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: me.ink,
  },
  loader: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  errorText: {
    color: me.errFg,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.errFg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
  },
  retryButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '600',
  },
  queueCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  queueStat: {
    alignItems: 'center',
  },
  queueStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
  },
  queueStatLabel: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 4,
  },
  resultsCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  resultsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
  },
  overallAssessment: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assessmentLabel: {
    fontSize: 14,
    color: me.ink2,
  },
  assessmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  // 4-tier severity styles (canonical)
  severity_early: {
    color: me.brand,
  },
  severity_developing: {
    color: '#A16207',
  },
  severity_significant: {
    color: me.accent,
  },
  severity_dangerous: {
    color: me.errFg,
  },
  damageSection: {
    marginBottom: 16,
  },
  damageSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  damageItem: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  damageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  damageType: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    color: me.onBrand,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  damageDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  damageDetailText: {
    fontSize: 12,
    color: me.ink2,
  },
  prioritySection: {
    backgroundColor: me.errBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.errFg,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 14,
    color: me.ink,
    marginLeft: 4,
  },
  metadataSection: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 4,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: me.ink,
  },
  primaryButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: me.surface,
    ...me.shadow.card,
  },
  secondaryButtonText: {
    color: me.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
});
