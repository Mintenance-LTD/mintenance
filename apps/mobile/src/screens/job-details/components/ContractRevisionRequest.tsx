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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
          <Ionicons name='create-outline' size={18} color={me.accent} />
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
        placeholderTextColor={me.ink3}
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
            <ActivityIndicator color={me.onBrand} size='small' />
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
    backgroundColor: me.warnBg,
  },
  requestChangesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  revisionInfoText: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rejectCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...me.shadow.card,
  },
  rejectCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 10,
  },
  rejectInput: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: me.ink,
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
    color: me.ink2,
  },
  rejectSubmitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: me.accent,
    minWidth: 110,
    alignItems: 'center',
  },
  rejectSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.onBrand,
  },
});
