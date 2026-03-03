import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  header: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  kpiSection: {
    padding: theme.spacing[4],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  kpiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    borderLeftWidth: 4,
    ...theme.shadows.base,
    width: isTablet ? '48%' : '100%',
    minHeight: 120,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  kpiTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[2],
  },
  kpiValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700' as const,
    marginBottom: theme.spacing[1],
  },
  kpiSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[2],
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[1],
  },
  healthScoreContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  healthScoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    ...theme.shadows.base,
  },
  healthScoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[4],
  },
  healthScoreValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  healthScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.medium,
  },
  healthScoreBreakdown: {
    flex: 1,
  },
  healthMetric: {
    marginBottom: theme.spacing[2],
  },
  healthMetricLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  healthBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsSection: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  insightIcon: {
    fontSize: 16,
    marginRight: theme.spacing[2],
  },
  insightTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  insightMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionItemsSection: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  actionItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  actionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  actionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  actionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  quickActionsContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  quickActionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    alignItems: 'center',
    width: isTablet ? '23%' : '48%',
    ...theme.shadows.base,
  },
  quickActionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  businessToolsContainer: {
    padding: theme.spacing[4],
    paddingTop: 0,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  toolCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    alignItems: 'center',
    width: isTablet ? '31%' : '48%',
    ...theme.shadows.base,
    minHeight: 130,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  toolDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing[4],
    paddingTop: 0,
    paddingBottom: theme.spacing[6],
  },
  reportButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing[2],
  },
});
