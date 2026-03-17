import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from '../photoReviewStyles';

interface PhotoReviewControlsProps {
  showChangesForm: boolean;
  changesComment: string;
  submitting: boolean;
  onShowChangesForm: () => void;
  onCancelChanges: () => void;
  onChangesCommentChange: (text: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}

export const PhotoReviewControls: React.FC<PhotoReviewControlsProps> = ({
  showChangesForm,
  changesComment,
  submitting,
  onShowChangesForm,
  onCancelChanges,
  onChangesCommentChange,
  onApprove,
  onRequestChanges,
}) => {
  if (showChangesForm) {
    return (
      <View style={styles.changesForm}>
        <Text style={styles.changesLabel}>What changes are needed?</Text>
        <TextInput
          style={styles.changesInput}
          value={changesComment}
          onChangeText={onChangesCommentChange}
          placeholder='Describe what needs to be fixed or improved...'
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical='top'
          accessibilityLabel='Changes needed description'
        />
        <View style={styles.changesActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancelChanges}
            accessibilityRole='button'
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !changesComment.trim() && styles.buttonDisabled,
            ]}
            onPress={onRequestChanges}
            disabled={!changesComment.trim() || submitting}
            accessibilityRole='button'
            accessibilityLabel='Submit change request'
          >
            {submitting ? (
              <ActivityIndicator
                size='small'
                color={theme.colors.textInverse}
              />
            ) : (
              <Text style={styles.submitButtonText}>Send to Contractor</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.requestChangesButton}
        onPress={onShowChangesForm}
        disabled={submitting}
        accessibilityRole='button'
        accessibilityLabel='Request changes to the work'
      >
        <Ionicons
          name='create-outline'
          size={20}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.requestChangesText}>Request Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.approveButton}
        onPress={onApprove}
        disabled={submitting}
        accessibilityRole='button'
        accessibilityLabel='Approve the completed work'
      >
        {submitting ? (
          <ActivityIndicator size='small' color={theme.colors.textInverse} />
        ) : (
          <>
            <Ionicons
              name='checkmark-circle'
              size={20}
              color={theme.colors.textInverse}
            />
            <Text style={styles.approveButtonText}>Approve Work</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
