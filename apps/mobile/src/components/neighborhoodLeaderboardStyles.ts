import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 15,
    color: '#717171',
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
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
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
    color: '#717171',
    marginTop: 8,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  neighborhoodTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  neighborhoodName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
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
    color: '#222222',
  },
  statLabel: {
    fontSize: 12,
    color: '#717171',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#222222',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#717171',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#222222',
  },
  content: {
    padding: 8,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
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
    borderLeftColor: '#222222',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 40,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#717171',
  },
  topThreeRank: {
    color: '#222222',
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
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
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
    color: '#717171',
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
    backgroundColor: '#F7F7F7',
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
    color: '#222222',
    fontWeight: '500',
  },
  moreSpecialties: {
    fontSize: 12,
    color: '#717171',
    fontStyle: 'italic',
  },
  endorsementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  endorsementCount: {
    fontSize: 12,
    color: '#222222',
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
    color: '#222222',
    flex: 1,
    marginRight: 8,
  },
  successMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successDate: {
    fontSize: 12,
    color: '#717171',
    marginLeft: 4,
  },
  successParties: {
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: '#717171',
  },
  homeownerName: {
    fontWeight: '500',
    color: '#222222',
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
    color: '#717171',
    marginLeft: 4,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: '#717171',
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
    color: '#222222',
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
    color: '#222222',
    marginBottom: 4,
  },
  championType: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 4,
  },
  championScore: {
    fontSize: 12,
    color: '#717171',
    fontWeight: '500',
  },
  badgeLevelIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLevelText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
