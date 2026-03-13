import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
        <Icon name="videocam" size={24} color="#FFFFFF" />
        <Text style={styles.primaryActionText}>Start Video Capture</Text>
      </TouchableOpacity>

      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="save" size={20} color="#717171" />
          <Text style={styles.secondaryActionText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="share" size={20} color="#717171" />
          <Text style={styles.secondaryActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TipsCard: React.FC = () => {
  return (
    <View style={styles.tipsCard}>
      <Icon name="lightbulb-outline" size={20} color="#F59E0B" />
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
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    paddingVertical: 16,
    gap: 10,
  },
  primaryAction: {
    backgroundColor: '#222222',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#717171',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 18,
  },
});
