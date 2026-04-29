import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

interface AvailabilitySectionProps {
  onChangePassword: () => void;
  onDeleteAccount: () => void;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  onChangePassword,
  onDeleteAccount,
}) => {
  const navigation = useNavigation();

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <TouchableOpacity
          style={styles.actionItem}
          // Audit step 9 (2026-04-29): point at canonical screen.
          // `NotificationSettings` is the legacy SMS/category-matrix
          // screen; `NotificationPreferences` is the user_notification_
          // preferences-backed canonical surface.
          onPress={() =>
            (navigation as any).navigate('NotificationPreferences')
          }
          accessibilityRole='button'
          accessibilityLabel='Manage notification settings'
        >
          <View style={styles.actionLeft}>
            <Ionicons
              name='notifications-outline'
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.actionInfo}>
              <Text style={styles.actionText}>Manage Notifications</Text>
              <Text style={styles.actionDescription}>
                Push, email, quiet hours, and more
              </Text>
            </View>
          </View>
          <Ionicons
            name='chevron-forward'
            size={16}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onChangePassword}
          accessibilityRole='button'
          accessibilityLabel='Change password'
        >
          <View style={styles.actionLeft}>
            <Ionicons
              name='key-outline'
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.actionText}>Change Password</Text>
          </View>
          <Ionicons
            name='chevron-forward'
            size={16}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionItem, styles.dangerAction]}
          onPress={onDeleteAccount}
          accessibilityRole='button'
          accessibilityLabel='Delete account'
        >
          <View style={styles.actionLeft}>
            <Ionicons
              name='trash-outline'
              size={20}
              color={theme.colors.error}
            />
            <Text style={[styles.actionText, styles.dangerText]}>
              Delete Account
            </Text>
          </View>
          <Ionicons
            name='chevron-forward'
            size={16}
            color={theme.colors.error}
          />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionInfo: { marginLeft: 12, flex: 1 },
  actionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  actionDescription: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginLeft: 12,
    marginTop: 2,
  },
  dangerAction: { borderBottomWidth: 0 },
  dangerText: { color: theme.colors.error },
});
