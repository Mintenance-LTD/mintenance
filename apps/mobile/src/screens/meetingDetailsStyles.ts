import { StyleSheet } from 'react-native';
import { me } from '../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: me.bg2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: me.ink2,
  },
  header: {
    backgroundColor: me.surface,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingInfo: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...me.shadow.card,
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
    color: me.ink,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.onBrand,
  },
  meetingTime: {
    fontSize: 14,
    color: me.ink2,
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
    color: me.ink,
  },
  participantRole: {
    fontSize: 13,
    color: me.ink2,
  },
  notesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    paddingTop: 14,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  mapSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
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
    backgroundColor: me.brand,
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
    ...me.shadow.card,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
    marginLeft: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: me.ink2,
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
    backgroundColor: me.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    ...me.shadow.card,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink,
    marginTop: 6,
  },
  travelTrackingSection: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...me.shadow.card,
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
    backgroundColor: me.ink,
  },
  arrivedButton: {
    backgroundColor: me.brand,
    flex: 1,
    marginRight: 6,
  },
  stopTravelButton: {
    backgroundColor: me.errFg,
    flex: 1,
    marginLeft: 6,
  },
  travelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.onBrand,
  },
  trackingActiveContainer: {
    gap: 12,
  },
  etaDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.bg2,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  etaText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  trackingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: me.errFg,
    textAlign: 'center',
  },
  updatesSection: {
    marginBottom: 14,
  },
  updateItem: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    ...me.shadow.card,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: me.bg2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateMessage: {
    fontSize: 14,
    color: me.ink,
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: me.ink3,
  },
});
