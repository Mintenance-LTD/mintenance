import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
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
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  compactScoreContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  compactScoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  compactScoreLabel: {
    fontSize: 12,
    color: '#717171',
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCertification: {
    fontSize: 13,
    color: '#717171',
  },
  compactGrade: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 15,
    color: '#717171',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#717171',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  scoreContainer: {
    padding: 16,
  },
  mainScore: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreGrade: {
    fontSize: 13,
    color: '#717171',
    marginTop: 4,
  },
  certificationType: {
    alignItems: 'center',
  },
  certificationIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  certificationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#717171',
    marginBottom: 4,
  },
  breakdownScore: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  breakdownGrade: {
    fontSize: 12,
    color: '#717171',
  },
  gamificationContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentLevel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  nextMilestone: {
    fontSize: 13,
    color: '#717171',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EBEBEB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#222222',
    lineHeight: 18,
  },
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#222222',
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#717171',
  },
  activeTabText: {
    color: '#222222',
  },
  tabContent: {
    minHeight: 200,
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 20,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 12,
    color: '#717171',
  },
  progressContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  comingSoonText: {
    fontSize: 15,
    color: '#222222',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 13,
    color: '#717171',
    textAlign: 'center',
  },
  tipSection: {
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  recalculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
  },
  recalculateText: {
    fontSize: 13,
    color: '#222222',
    marginLeft: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#717171',
  },
});
