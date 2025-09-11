import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import Button from '../components/ui/Button';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // Notification settings state
  const [settings, setSettings] = useState({
    // Push Notifications
    pushEnabled: true,
    newJobs: true,
    newBids: true,
    newMessages: true,
    jobUpdates: true,
    paymentUpdates: true,

    // Email Notifications
    emailEnabled: true,
    weeklyDigest: true,
    promotionalEmails: false,
    securityAlerts: true,

    // In-App Settings
    soundEnabled: true,
    vibrationEnabled: true,

    // Marketing
    marketingEmails: false,
    productUpdates: true,
  });

  const updateSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    // TODO: Save settings to backend
    Alert.alert('Success', 'Notification settings updated!');
    navigation.goBack();
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingRow = ({
    icon,
    title,
    description,
    value,
    onToggle,
    disabled = false,
  }: {
    icon: string;
    title: string;
    description?: string;
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon as any}
            size={20}
            color={disabled ? '#C7C7CC' : theme.colors.primary}
          />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: theme.colors.borderLight,
          true: disabled ? theme.colors.textTertiary : theme.colors.success,
        }}
        thumbColor={theme.colors.textInverse}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Button
          variant='secondary'
          title='Save'
          onPress={handleSave}
          style={{ paddingHorizontal: 16, borderRadius: 16 }}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Push Notifications */}
        <Section title='Push Notifications'>
          <SettingRow
            icon='notifications'
            title='Push Notifications'
            description='Allow Mintenance to send you push notifications'
            value={settings.pushEnabled}
            onToggle={() => updateSetting('pushEnabled')}
          />

          <SettingRow
            icon='briefcase'
            title='New Jobs'
            description='Get notified when new jobs matching your skills are posted'
            value={settings.newJobs}
            onToggle={() => updateSetting('newJobs')}
            disabled={!settings.pushEnabled}
          />

          <SettingRow
            icon='pricetag'
            title='New Bids'
            description='Receive notifications when contractors bid on your jobs'
            value={settings.newBids}
            onToggle={() => updateSetting('newBids')}
            disabled={!settings.pushEnabled}
          />

          <SettingRow
            icon='chatbubble'
            title='New Messages'
            description='Get notified about new messages and conversations'
            value={settings.newMessages}
            onToggle={() => updateSetting('newMessages')}
            disabled={!settings.pushEnabled}
          />

          <SettingRow
            icon='refresh'
            title='Job Updates'
            description='Notifications about job status changes and completions'
            value={settings.jobUpdates}
            onToggle={() => updateSetting('jobUpdates')}
            disabled={!settings.pushEnabled}
          />

          <SettingRow
            icon='card'
            title='Payment Updates'
            description='Alerts about payments, invoices, and transactions'
            value={settings.paymentUpdates}
            onToggle={() => updateSetting('paymentUpdates')}
            disabled={!settings.pushEnabled}
          />
        </Section>

        {/* Email Notifications */}
        <Section title='Email Notifications'>
          <SettingRow
            icon='mail'
            title='Email Notifications'
            description='Receive important updates via email'
            value={settings.emailEnabled}
            onToggle={() => updateSetting('emailEnabled')}
          />

          <SettingRow
            icon='calendar'
            title='Weekly Digest'
            description='Get a weekly summary of your activity and opportunities'
            value={settings.weeklyDigest}
            onToggle={() => updateSetting('weeklyDigest')}
            disabled={!settings.emailEnabled}
          />

          <SettingRow
            icon='shield-checkmark'
            title='Security Alerts'
            description='Important security and account notifications'
            value={settings.securityAlerts}
            onToggle={() => updateSetting('securityAlerts')}
            disabled={!settings.emailEnabled}
          />
        </Section>

        {/* Sound & Vibration */}
        <Section title='Sound & Vibration'>
          <SettingRow
            icon='volume-high'
            title='Sound'
            description='Play notification sounds'
            value={settings.soundEnabled}
            onToggle={() => updateSetting('soundEnabled')}
          />

          <SettingRow
            icon='phone-portrait'
            title='Vibration'
            description='Vibrate for notifications'
            value={settings.vibrationEnabled}
            onToggle={() => updateSetting('vibrationEnabled')}
          />
        </Section>

        {/* Marketing & Updates */}
        <Section title='Marketing & Updates'>
          <SettingRow
            icon='megaphone'
            title='Promotional Emails'
            description='Special offers and promotional content'
            value={settings.promotionalEmails}
            onToggle={() => updateSetting('promotionalEmails')}
          />

          <SettingRow
            icon='information-circle'
            title='Product Updates'
            description='Learn about new features and improvements'
            value={settings.productUpdates}
            onToggle={() => updateSetting('productUpdates')}
          />
        </Section>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons
                name='checkmark-circle'
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.actionText}>Enable All Notifications</Text>
            </View>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons
                name='close-circle'
                size={20}
                color={theme.colors.error}
              />
              <Text style={styles.actionText}>Disable All Notifications</Text>
            </View>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name='refresh' size={20} color={theme.colors.primary} />
              <Text style={styles.actionText}>Reset to Defaults</Text>
            </View>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  // save button replaced with shared Button
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  disabledRow: {
    opacity: 0.6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  disabledText: {
    color: theme.colors.textTertiary,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  bottomPadding: {
    height: 32,
  },
});

export default NotificationSettingsScreen;
