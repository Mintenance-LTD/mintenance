/**
 * ContractRevisionRequest - Homeowner UI for requesting contract revisions
 * Extracted from ContractViewScreen to keep file size manageable.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ContractRevisionRequestProps {
  canReject: boolean;
  showRejectInput: boolean;
  rejectReason: string;
  rejecting: boolean;
  onShowRejectInput: () => void;
  onChangeReason: (text: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const ContractRevisionRequest: React.FC<
  ContractRevisionRequestProps
> = ({
  canReject,
  showRejectInput,
  rejectReason,
  rejecting,
  onShowRejectInput,
  onChangeReason,
  onCancel,
  onSubmit,
}) => {
  if (!canReject) {
    return null;
  }

  if (!showRejectInput) {
    return (
      <View style={styles.revisionSection}>
        <TouchableOpacity
          style={styles.requestChangesButton}
          onPress={onShowRejectInput}
          accessibilityRole='button'
          accessibilityLabel='Request contract revision'
        >
          <Ionicons
            name='create-outline'
            size={18}
            color={theme.colors.accent}
          />
          <Text style={styles.requestChangesText}>
            Request Contract Revision
          </Text>
        </TouchableOpacity>
        <Text style={styles.revisionInfoText}>
          The contractor will be notified to update the contract terms. This
          does not cancel the job.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.rejectCard}>
      <Text style={styles.rejectCardTitle}>What changes are needed?</Text>
      <TextInput
        style={styles.rejectInput}
        placeholder='Describe what needs to be changed (e.g., dates, amounts, terms)...'
        placeholderTextColor={theme.colors.textTertiary}
        multiline
        numberOfLines={3}
        value={rejectReason}
        onChangeText={onChangeReason}
        textAlignVertical='top'
        accessibilityLabel='Describe contract changes needed'
        accessibilityHint='Explain what terms or dates need to be updated'
      />
      <Text style={styles.revisionInfoText}>
        The contractor will be notified to update the contract terms. This does
        not cancel the job.
      </Text>
      <View style={styles.rejectActions}>
        <TouchableOpacity style={styles.rejectCancelButton} onPress={onCancel}>
          <Text style={styles.rejectCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectSubmitButton, rejecting && { opacity: 0.5 }]}
          onPress={onSubmit}
          disabled={rejecting}
        >
          {rejecting ? (
            <ActivityIndicator color={theme.colors.textInverse} size='small' />
          ) : (
            <Text style={styles.rejectSubmitText}>Send Revision Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  revisionSection: {
    marginBottom: 20,
  },
  requestChangesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.colors.accentLight,
  },
  requestChangesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  revisionInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rejectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  rejectCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  rejectInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minHeight: 80,
    marginBottom: 12,
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rejectCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rejectCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  rejectSubmitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    minWidth: 110,
    alignItems: 'center',
  },
  rejectSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
