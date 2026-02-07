import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <Icon name="videocam" size={24} color="white" />
        <Text style={styles.primaryActionText}>Start Video Capture</Text>
      </TouchableOpacity>

      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="save" size={20} color="#666" />
          <Text style={styles.secondaryActionText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction}>
          <Icon name="share" size={20} color="#666" />
          <Text style={styles.secondaryActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TipsCard: React.FC = () => {
  return (
    <View style={styles.tipsCard}>
      <Icon name="lightbulb-outline" size={20} color="#FFC107" />
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
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#795548',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
});
