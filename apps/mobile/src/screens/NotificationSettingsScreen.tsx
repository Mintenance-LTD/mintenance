import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/ui/Button';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

interface IconConfig {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const SETTING_ICONS: Record<string, IconConfig> = {
  notifications: { name: 'notifications', color: '#3B82F6', bg: '#DBEAFE' },
  briefcase: { name: 'briefcase', color: theme.colors.primary, bg: theme.colors.primaryLight },
  pricetag: { name: 'pricetag', color: theme.colors.accent, bg: theme.colors.accentLight },
  chatbubble: { name: 'chatbubble', color: '#8B5CF6', bg: '#EDE9FE' },
  refresh: { name: 'refresh', color: '#3B82F6', bg: '#DBEAFE' },
  card: { name: 'card', color: theme.colors.primary, bg: theme.colors.primaryLight },
  mail: { name: 'mail', color: theme.colors.error, bg: '#FEE2E2' },
  calendar: { name: 'calendar', color: theme.colors.accent, bg: theme.colors.accentLight },
  'shield-checkmark': { name: 'shield-checkmark', color: theme.colors.error, bg: '#FEE2E2' },
  'volume-high': { name: 'volume-high', color: '#3B82F6', bg: '#DBEAFE' },
  'phone-portrait': { name: 'phone-portrait', color: '#8B5CF6', bg: '#EDE9FE' },
  megaphone: { name: 'megaphone', color: theme.colors.accent, bg: theme.colors.accentLight },
  'information-circle': { name: 'information-circle', color: '#3B82F6', bg: '#DBEAFE' },
  'moon-outline': { name: 'moon-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  'time-outline': { name: 'time-outline', color: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary },
  'checkmark-circle': { name: 'checkmark-circle', color: theme.colors.primary, bg: theme.colors.primaryLight },
  'close-circle': { name: 'close-circle', color: theme.colors.error, bg: '#FEE2E2' },
};

const NotificationSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

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

    // Quiet Hours
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const formatTime = (timeStr: string) =>
    parseTime(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (user?.id) {
      void loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;
    try {
      const { data: row } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (row) {
        setSettings((prev) => ({ ...prev, ...row }));
      }
    } catch {
      // Use defaults if no saved preferences
    }
  };

  const updateSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEnableAll = () => {
    setSettings((prev) => ({
      ...prev,
      pushEnabled: true,
      newJobs: true,
      newBids: true,
      newMessages: true,
      jobUpdates: true,
      paymentUpdates: true,
      emailEnabled: true,
      weeklyDigest: true,
      securityAlerts: true,
      soundEnabled: true,
      vibrationEnabled: true,
      productUpdates: true,
    }));
  };

  const handleDisableAll = () => {
    setSettings((prev) => ({
      ...prev,
      pushEnabled: false,
      newJobs: false,
      newBids: false,
      newMessages: false,
      jobUpdates: false,
      paymentUpdates: false,
      emailEnabled: false,
      weeklyDigest: false,
      promotionalEmails: false,
      securityAlerts: false,
      soundEnabled: false,
      vibrationEnabled: false,
      marketingEmails: false,
      productUpdates: false,
    }));
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will restore all notification settings to their default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setSettings({
              pushEnabled: true,
              newJobs: true,
              newBids: true,
              newMessages: true,
              jobUpdates: true,
              paymentUpdates: true,
              emailEnabled: true,
              weeklyDigest: true,
              promotionalEmails: false,
              securityAlerts: true,
              soundEnabled: true,
              vibrationEnabled: true,
              marketingEmails: false,
              productUpdates: true,
              quietHoursEnabled: false,
              quietHoursStart: '22:00',
              quietHoursEnd: '07:00',
            });
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save settings');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('user_notification_preferences')
        .upsert({ user_id: user.id, ...settings }, { onConflict: 'user_id' });
      if (err) throw err;
      Alert.alert('Success', 'Notification settings updated!');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
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
  }) => {
    const iconConfig = SETTING_ICONS[icon] || { name: icon as keyof typeof Ionicons.glyphMap, color: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary };
    return (
      <View style={[styles.settingRow, disabled && styles.disabledRow]}>
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
            <Ionicons
              name={iconConfig.name}
              size={18}
              color={disabled ? theme.colors.textTertiary : iconConfig.color}
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
            false: theme.colors.border,
            true: disabled ? theme.colors.textTertiary : theme.colors.primary,
          }}
          thumbColor={theme.colors.surface}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Button
          variant='secondary'
          title={saving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          disabled={saving}
          style={{ paddingHorizontal: 16, borderRadius: 20 }}
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

        {/* Quiet Hours */}
        <Section title='Quiet Hours'>
          <SettingRow
            icon='moon-outline'
            title='Enable Quiet Hours'
            description='Pause notifications during specified hours'
            value={settings.quietHoursEnabled}
            onToggle={() => updateSetting('quietHoursEnabled')}
          />
          {settings.quietHoursEnabled && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowStartPicker(true)}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Ionicons name='time-outline' size={18} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Start Time</Text>
                    <Text style={styles.settingDescription}>{formatTime(settings.quietHoursStart)}</Text>
                  </View>
                </View>
                <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowEndPicker(true)}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Ionicons name='time-outline' size={18} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>End Time</Text>
                    <Text style={styles.settingDescription}>{formatTime(settings.quietHoursEnd)}</Text>
                  </View>
                </View>
                <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </Section>

        {showStartPicker && (
          <DateTimePicker
            value={parseTime(settings.quietHoursStart)}
            mode="time"
            is24Hour
            display="default"
            onChange={(_e, d) => {
              setShowStartPicker(false);
              if (d) {
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                setSettings((prev) => ({ ...prev, quietHoursStart: `${hh}:${mm}` }));
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={parseTime(settings.quietHoursEnd)}
            mode="time"
            is24Hour
            display="default"
            onChange={(_e, d) => {
              setShowEndPicker(false);
              if (d) {
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                setSettings((prev) => ({ ...prev, quietHoursEnd: `${hh}:${mm}` }));
              }
            }}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleEnableAll}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name='checkmark-circle' size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>Enable All Notifications</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDisableAll}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name='close-circle' size={18} color={theme.colors.error} />
              </View>
              <Text style={styles.actionText}>Disable All Notifications</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleResetToDefaults}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name='refresh' size={18} color='#3B82F6' />
              </View>
              <Text style={styles.actionText}>Reset to Defaults</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  disabledText: {
    color: theme.colors.textTertiary,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    lineHeight: 18,
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
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  bottomPadding: {
    height: 32,
  },
});

export default NotificationSettingsScreen;
