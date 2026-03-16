import { StyleSheet, Platform } from 'react-native';
import { theme } from '../theme';

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.error,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  neighborhoodTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  neighborhoodName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  neighborhoodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.textPrimary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  activeTabText: {
    color: theme.colors.textPrimary,
  },
  content: {
    padding: 8,
  },
  listItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topThreeItem: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.textPrimary,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 40,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  topThreeRank: {
    color: theme.colors.textPrimary,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  contractorMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  specialtyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  specialtyText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  moreSpecialties: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  endorsementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  endorsementCount: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginLeft: 4,
  },
  successContent: {
    flex: 1,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  successMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  successParties: {
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  homeownerName: {
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  successFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  championRank: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 30,
  },
  championPosition: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  championEmoji: {
    fontSize: 20,
  },
  championInfo: {
    flex: 1,
  },
  championName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  championType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  championScore: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  badgeLevelIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLevelText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
});
