import React from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface AvailabilitySectionProps {
  emailNotifications: boolean; setEmailNotifications: (v: boolean) => void;
  pushNotifications: boolean; setPushNotifications: (v: boolean) => void;
  onChangePassword: () => void;
  onDeleteAccount: () => void;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  emailNotifications, setEmailNotifications, pushNotifications, setPushNotifications,
  onChangePassword, onDeleteAccount,
}) => {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Email Notifications</Text>
            <Text style={styles.switchDescription}>Receive updates about jobs and messages via email</Text>
          </View>
          <Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ false: theme.colors.borderLight, true: theme.colors.success }} thumbColor={theme.colors.textInverse} accessibilityLabel="Email notifications" />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Text style={styles.switchDescription}>Get instant notifications on your device</Text>
          </View>
          <Switch value={pushNotifications} onValueChange={setPushNotifications} trackColor={{ false: theme.colors.borderLight, true: theme.colors.success }} thumbColor={theme.colors.textInverse} accessibilityLabel="Push notifications" />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.actionItem} onPress={onChangePassword} accessibilityRole="button" accessibilityLabel="Change password">
          <View style={styles.actionLeft}>
            <Ionicons name="key-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.actionText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionItem, styles.dangerAction]} onPress={onDeleteAccount} accessibilityRole="button" accessibilityLabel="Delete account">
          <View style={styles.actionLeft}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.actionText, styles.dangerText]}>Delete Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 20 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  switchInfo: { flex: 1, marginRight: 16 },
  switchLabel: { fontSize: 16, fontWeight: "500", color: theme.colors.textPrimary, marginBottom: 4 },
  switchDescription: { fontSize: 14, color: theme.colors.textTertiary },
  actionItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  actionLeft: { flexDirection: "row", alignItems: "center" },
  actionText: { fontSize: 16, color: theme.colors.textPrimary, marginLeft: 12, fontWeight: "500" },
  dangerAction: { borderBottomWidth: 0 },
  dangerText: { color: theme.colors.error },
});