import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

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
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Ionicons
            name='checkmark-circle'
            size={18}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.actionText}>Enable All Notifications</Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={16}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionButton} onPress={onDisableAll}>
      <View style={styles.actionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name='close-circle' size={18} color={theme.colors.error} />
        </View>
        <Text style={styles.actionText}>Disable All Notifications</Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={16}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>

    <TouchableOpacity style={styles.actionButton} onPress={onResetToDefaults}>
      <View style={styles.actionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name='refresh' size={18} color='#3B82F6' />
        </View>
        <Text style={styles.actionText}>Reset to Defaults</Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={16}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
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
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
  },
});

export default QuickActionsSection;
