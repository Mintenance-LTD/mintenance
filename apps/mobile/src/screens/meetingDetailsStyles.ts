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
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#717171',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  meetingHeader: {
    marginBottom: 14,
  },
  meetingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meetingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  meetingTime: {
    fontSize: 14,
    color: '#717171',
  },
  participantInfo: {
    marginBottom: 14,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  participantRole: {
    fontSize: 13,
    color: '#717171',
  },
  notesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    paddingTop: 14,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#717171',
    lineHeight: 20,
  },
  mapSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  contractorMarker: {
    backgroundColor: '#10B981',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  distanceInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222222',
    marginLeft: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#717171',
    marginLeft: 8,
  },
  actionsSection: {
    marginBottom: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
    marginTop: 6,
  },
  travelTrackingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  travelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  startTravelButton: {
    backgroundColor: '#222222',
  },
  arrivedButton: {
    backgroundColor: '#10B981',
    flex: 1,
    marginRight: 6,
  },
  stopTravelButton: {
    backgroundColor: '#EF4444',
    flex: 1,
    marginLeft: 6,
  },
  travelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trackingActiveContainer: {
    gap: 12,
  },
  etaDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  etaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  trackingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  updatesSection: {
    marginBottom: 14,
  },
  updateItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateMessage: {
    fontSize: 14,
    color: '#222222',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#B0B0B0',
  },
});
