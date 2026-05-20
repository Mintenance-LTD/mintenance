import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface QuickActionsSectionProps {
  onEnableAll: () => void;
  onDisableAll: () => void;
  onResetToDefaults: () => void;
}

const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onEnableAll,
  onDisableAll,
  onResetToDefaults,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Quick Actions</Text>

    <TouchableOpacity style={styles.actionButton} onPress={onEnableAll}>
      <View style={styles.actionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: me.brandSoft }]}>
          <Ionicons name='checkmark-circle' size={18} color={me.brand} />
        </View>
        <Text style={styles.actionText}>Enable All Notifications</Text>
      </View>
      <Ionicons name='chevron-forward' size={16} color={me.ink3} />
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionButton} onPress={onDisableAll}>
      <View style={styles.actionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: me.errBg }]}>
          <Ionicons name='close-circle' size={18} color={me.errFg} />
        </View>
        <Text style={styles.actionText}>Disable All Notifications</Text>
      </View>
      <Ionicons name='chevron-forward' size={16} color={me.ink3} />
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionButton} onPress={onResetToDefaults}>
      <View style={styles.actionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name='refresh' size={18} color='#3B82F6' />
        </View>
        <Text style={styles.actionText}>Reset to Defaults</Text>
      </View>
      <Ionicons name='chevron-forward' size={16} color={me.ink3} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
});

export default QuickActionsSection;
