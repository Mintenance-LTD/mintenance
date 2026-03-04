import { StyleSheet } from 'react-native';
import { theme } from '../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  meetingInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  meetingHeader: {
    marginBottom: 16,
  },
  meetingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  meetingTime: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  participantInfo: {
    marginBottom: 16,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  participantRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 12,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  mapSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  contractorMarker: {
    backgroundColor: theme.colors.success,
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
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  travelTrackingSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  travelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  startTravelButton: {
    backgroundColor: '#222222',
  },
  arrivedButton: {
    backgroundColor: theme.colors.success,
    flex: 1,
    marginRight: 8,
  },
  stopTravelButton: {
    backgroundColor: theme.colors.error,
    flex: 1,
    marginLeft: 8,
  },
  travelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  trackingActiveContainer: {
    gap: 12,
  },
  etaDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  trackingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  updatesSection: {
    marginBottom: 20,
  },
  updateItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
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
    color: theme.colors.textSecondary,
  },
});
