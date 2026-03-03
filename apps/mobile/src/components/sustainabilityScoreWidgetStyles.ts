import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactScoreContainer: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  compactScoreText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  compactScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCertification: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  compactGrade: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing[2],
  },
  scoreContainer: {
    padding: theme.spacing[4],
  },
  mainScore: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  scoreValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
  },
  scoreGrade: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  certificationType: {
    alignItems: 'center',
  },
  certificationIcon: {
    fontSize: 24,
    marginBottom: theme.spacing[1],
  },
  certificationText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  breakdownScore: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  breakdownGrade: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  gamificationContainer: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  currentLevel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  nextMilestone: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsContainer: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
    paddingLeft: theme.spacing[2],
    borderLeftWidth: 3,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: theme.spacing[2],
  },
  insightText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  tabContent: {
    minHeight: 200,
    padding: theme.spacing[4],
  },
  detailSection: {
    marginBottom: theme.spacing[4],
  },
  detailTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  detailSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  progressContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  comingSoonSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tipSection: {
    marginBottom: theme.spacing[4],
  },
  tipTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  tipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recalculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  recalculateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing[1],
  },
  lastUpdated: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});
