import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';

interface QuickActionsProps {
  onStartVideoCapture: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onStartVideoCapture,
}) => {
  return (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.primaryAction]}
        onPress={onStartVideoCapture}
      >
        <Icon name="videocam" size={24} color={theme.colors.textInverse} />
        <Text style={styles.primaryActionText}>Start Video Capture</Text>
      </TouchableOpacity>

      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="save" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryActionText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="share" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TipsCard: React.FC = () => {
  return (
    <View style={styles.tipsCard}>
      <Icon name="lightbulb-outline" size={20} color={theme.colors.accent} />
      <View style={styles.tipsContent}>
        <Text style={styles.tipsTitle}>Pro Tip</Text>
        <Text style={styles.tipsText}>
          For best results, record video in good lighting and move slowly to capture
          all areas. The AI needs clear footage to detect damage accurately.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActions: {
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing[3],
  },
  primaryAction: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing[3],
  },
  primaryActionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[3],
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  secondaryActionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing[3],
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  tipsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
