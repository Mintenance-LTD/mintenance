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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingInfo: {
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  meetingTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textPrimary,
  },
  participantRole: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  notesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  mapSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textPrimary,
    marginTop: 6,
  },
  travelTrackingSection: {
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.textPrimary,
  },
  arrivedButton: {
    backgroundColor: theme.colors.primary,
    flex: 1,
    marginRight: 6,
  },
  stopTravelButton: {
    backgroundColor: theme.colors.error,
    flex: 1,
    marginLeft: 6,
  },
  travelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  trackingActiveContainer: {
    gap: 12,
  },
  etaDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  etaText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  trackingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
  },
  updatesSection: {
    marginBottom: 14,
  },
  updateItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateMessage: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});
