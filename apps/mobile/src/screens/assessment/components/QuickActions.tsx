import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface QuickActionsProps {
  onStartVideoCapture: () => void;
}



export const TipsCard: React.FC = () => {
  return (
    <View style={styles.tipsCard}>
      <View style={styles.tipsIconWrap}>
        <Icon name='lightbulb' size={18} color='#FBBF24' />
      </View>
      <View style={styles.tipsContent}>
        <Text style={styles.tipsTitle}>Pro Tip</Text>
        <Text style={styles.tipsText}>
          For best results, record video in good lighting and move slowly to
          capture all areas. The AI needs clear footage to detect damage
          accurately.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActions: {
    marginBottom: 16,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.ink,
    borderRadius: 24,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 10,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: me.line,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  tipsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 19,
  },
});
