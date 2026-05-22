import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

type AccountNavProp = NativeStackNavigationProp<ProfileStackParamList>;

// AUDIT_PUNCH_LIST P2 #45 (B3-P2-1) — renamed 2026-05-09 from
// `AvailabilitySection` to `AccountSection`. The original name was
// misleading — this section contains notification preferences,
// change-password, and delete-account actions, none of which are
// "availability". The actual contractor-availability UI lives in
// `ContractorCardEditorScreen/PortfolioSection.tsx` (which is also
// confusingly named — separate cleanup).
interface AccountSectionProps {
  onChangePassword: () => void;
  onDeleteAccount: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  onChangePassword,
  onDeleteAccount,
}) => {
  const navigation = useNavigation<AccountNavProp>();

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
          onPress={() => navigation.navigate('NotificationPreferences')}
          accessibilityRole='button'
          accessibilityLabel='Manage notification settings'
        >
          <View style={styles.actionLeft}>
            <Ionicons name='notifications-outline' size={20} color={me.ink2} />
            <View style={styles.actionInfo}>
              <Text style={styles.actionText}>Manage Notifications</Text>
              <Text style={styles.actionDescription}>
                Push, email, quiet hours, and more
              </Text>
            </View>
          </View>
          <Ionicons name='chevron-forward' size={16} color={me.ink3} />
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
            <Ionicons name='key-outline' size={20} color={me.ink2} />
            <Text style={styles.actionText}>Change Password</Text>
          </View>
          <Ionicons name='chevron-forward' size={16} color={me.ink3} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionItem, styles.dangerAction]}
          onPress={onDeleteAccount}
          accessibilityRole='button'
          accessibilityLabel='Delete account'
        >
          <View style={styles.actionLeft}>
            <Ionicons name='trash-outline' size={20} color={me.errFg} />
            <Text style={[styles.actionText, styles.dangerText]}>
              Delete Account
            </Text>
          </View>
          <Ionicons name='chevron-forward' size={16} color={me.errFg} />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionInfo: { marginLeft: 12, flex: 1 },
  actionText: {
    fontSize: 16,
    color: me.ink,
    marginLeft: 12,
    fontWeight: '500',
  },
  actionDescription: {
    fontSize: 13,
    color: me.ink3,
    marginLeft: 12,
    marginTop: 2,
  },
  dangerAction: { borderBottomWidth: 0 },
  dangerText: { color: me.errFg },
});
