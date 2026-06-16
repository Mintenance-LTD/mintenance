import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
// supabase import removed — settings now use /api/users/settings endpoint
import { me } from '../../design-system/mint-editorial';
import { TERMS_URL, PRIVACY_URL } from '../../config/legal';

// 2026-06-08: legal URLs are single-sourced from config/legal.ts so the
// Settings and Profile screens can't drift apart again. The previous
// inline constants pointed at mintenance.app (a domain used nowhere else).
const LEGAL_URLS = {
  privacyPolicy: PRIVACY_URL,
  termsAndConditions: TERMS_URL,
} as const;

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    shareActivityData: boolean;
  };
}

interface SettingsRow {
  label: string;
  icon: string;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

export const SettingsHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async (): Promise<UserSettings> => {
      if (!user?.id) throw new Error('Not authenticated');
      try {
        // 2026-06-06 audit: GET /api/users/settings returns the settings
        // object at the top level ({ ...defaults, ...stored }), NOT wrapped
        // in { data }. Reading res.data was always undefined, so saved
        // privacy/notification toggles never displayed — the screen always
        // showed the hardcoded defaults and a disabled "Profile Visible"
        // flipped back on after refetch. Read the response directly.
        const res = await mobileApiClient.get<UserSettings>(
          '/api/users/settings'
        );
        return (
          res || {
            notifications: { email: true, push: true, sms: false },
            privacy: { profileVisible: true, shareActivityData: false },
          }
        );
      } catch {
        return {
          notifications: { email: true, push: true, sms: false },
          privacy: { profileVisible: true, shareActivityData: false },
        };
      }
    },
    enabled: !!user?.id,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const merged = { ...settings, ...patch };
      await mobileApiClient.patch<{ success: boolean }>(
        '/api/users/settings',
        merged
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
    },
  });

  const togglePrivacy = (key: keyof UserSettings['privacy']) => {
    if (!settings) return;
    updateSettingMutation.mutate({
      privacy: { ...settings.privacy, [key]: !settings.privacy[key] },
    });
  };

  const renderRow = (item: SettingsRow, isLast: boolean) => (
    <TouchableOpacity
      key={item.label}
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={item.onPress}
      disabled={!item.onPress && !item.rightElement}
      accessibilityRole='button'
      accessibilityLabel={item.label}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconChip,
            {
              backgroundColor: item.iconBg ?? me.bg2,
            },
          ]}
        >
          <Ionicons
            name={item.icon as 'settings'}
            size={17}
            color={item.destructive ? me.errFg : (item.iconColor ?? me.ink2)}
          />
        </View>
        <Text
          style={[styles.rowLabel, item.destructive && styles.destructiveText]}
        >
          {item.label}
        </Text>
      </View>
      {item.rightElement ||
        (item.onPress && (
          <Ionicons name='chevron-forward' size={14} color={me.ink3} />
        ))}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingsRow[]) => (
    <View style={styles.section} key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, idx) => renderRow(item, idx === items.length - 1))}
      </View>
    </View>
  );

  const securityItems: SettingsRow[] = [
    // Audit step 9 (2026-04-29): collapsed two notification entry
    // points into one. The legacy "Push & Email Settings" route
    // (`NotificationSettings`, backed by
    // `/api/users/notification-preferences` JSONB blob with SMS +
    // category toggles) is unreachable from this hub now — kept in
    // the nav stack for deep-link compatibility but the canonical
    // surface for everyone is `NotificationPreferences`. Once the
    // SMS-toggle UX is migrated into the new screen
    // (user_notification_preferences table needs a column for it
    // first) the legacy route + the plural API can both go away.
    {
      // Granular per-event opt-in surface backed by user_notification_preferences.
      label: 'Notification Preferences',
      icon: 'options-outline',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: () => navigation.navigate('NotificationPreferences'),
    },
    {
      label: 'Accessibility',
      icon: 'accessibility-outline',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: () => navigation.navigate('AccessibilitySettings'),
    },
    {
      label: 'MFA Security',
      icon: 'shield-checkmark-outline',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      onPress: () => navigation.navigate('MFASecurity'),
    },
    {
      label: 'Biometric Sign-In',
      icon: 'finger-print',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: () => navigation.navigate('BiometricSettings'),
    },
    {
      label: 'Payment Methods',
      icon: 'card-outline',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: () => navigation.navigate('PaymentMethods'),
    },
    {
      label: 'Payment History',
      icon: 'receipt-outline',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: () => navigation.navigate('PaymentHistory'),
    },
  ];

  const privacyItems: SettingsRow[] = [
    {
      label: 'Profile Visible',
      icon: 'eye-outline',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      rightElement: (
        <Switch
          value={settings?.privacy?.profileVisible ?? true}
          onValueChange={() => togglePrivacy('profileVisible')}
          trackColor={{
            false: me.line,
            true: me.brand,
          }}
          thumbColor={me.surface}
        />
      ),
    },
    {
      label: 'Share Activity Data',
      icon: 'analytics-outline',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      rightElement: (
        <Switch
          value={settings?.privacy?.shareActivityData ?? false}
          onValueChange={() => togglePrivacy('shareActivityData')}
          trackColor={{
            false: me.line,
            true: me.brand,
          }}
          thumbColor={me.surface}
        />
      ),
    },
  ];

  const legalItems: SettingsRow[] = [
    {
      label: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      iconColor: me.brand,
      iconBg: me.brandSoft,
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy),
    },
    {
      label: 'Terms & Conditions',
      icon: 'document-text-outline',
      iconColor: me.ink2,
      iconBg: me.bg2,
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.termsAndConditions),
    },
  ];

  const dangerItems: SettingsRow[] = [
    {
      label: 'Export My Data',
      icon: 'download-outline',
      iconColor: me.ink2,
      iconBg: me.bg2,
      onPress: () => navigation.navigate('DataExport'),
    },
    {
      label: 'Delete Account',
      icon: 'trash-outline',
      iconColor: me.errFg,
      iconBg: me.errBg,
      onPress: () => navigation.navigate('DeleteAccount'),
      destructive: true,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='dark-content'
      />
      {/* Editorial header — paper bg, mint eyebrow, serif title.
          Replaces the prior mint-gradient hero with 2 decorative
          circles + glassy back button + bold white sans heading. */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            (navigation as unknown as { goBack: () => void }).goBack()
          }
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.heroEyebrow}>Account</Text>
        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroSubtitle}>
          Account, security &amp; preferences
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {renderSection('Account & Security', securityItems)}
        {renderSection('Privacy', privacyItems)}
        {renderSection('Legal', legalItems)}
        {renderSection('Danger Zone', dangerItems)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  // 2026-05-23 editorial header — was a mint-gradient hero with 2
  // decorative circles + glassy back button + bold white sans
  // heading. Now paper bg, mint eyebrow, serif title in ink.
  hero: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: me.bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  heroSubtitle: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 4,
  },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...me.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
  },
  destructiveText: { color: me.errFg },
});
