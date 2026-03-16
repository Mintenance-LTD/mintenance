import { StyleSheet, Dimensions, Platform } from 'react-native';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  kpiSection: {
    padding: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
    width: isTablet ? '48%' : '100%',
    minHeight: 120,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  healthScoreContainer: {
    padding: 16,
    paddingTop: 0,
  },
  healthScoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  healthScoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthScoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  healthScoreLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  healthScoreBreakdown: {
    flex: 1,
  },
  healthMetric: {
    marginBottom: 8,
  },
  healthMetricLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
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
    padding: 16,
    paddingTop: 0,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  insightMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionItemsSection: {
    padding: 16,
    paddingTop: 0,
  },
  actionItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  actionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  quickActionsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    width: isTablet ? '23%' : '48%',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  businessToolsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: isTablet ? '31%' : '48%',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
    minHeight: 130,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  toolDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  reportButton: {
    backgroundColor: theme.colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 56,
  },
  reportButtonText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
