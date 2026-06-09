import { StyleSheet, Platform } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  hostBadge: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  callTypeContainer: {
    gap: 8,
  },
  callTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  callTypeOptionSelected: {
    backgroundColor: theme.colors.textPrimary,
  },
  callTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  callTypeLabelSelected: {
    color: theme.colors.textInverse,
  },
  quickOptionsContainer: {
    gap: 8,
  },
  quickOption: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  quickOptionSelected: {
    backgroundColor: 'rgba(34, 34, 34, 0.06)',
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
  },
  quickOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  quickOptionLabelSelected: {
    color: theme.colors.textPrimary,
  },
  quickOptionTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quickOptionTimeSelected: {
    color: theme.colors.textPrimary,
  },
  customTimeContainer: {
    gap: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  dateTimeButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  summaryContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 16,
    ...theme.shadows.base,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  summaryDateTime: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  summaryType: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  scheduleButton: {
    backgroundColor: theme.colors.textPrimary,
  },
  scheduleButtonDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
