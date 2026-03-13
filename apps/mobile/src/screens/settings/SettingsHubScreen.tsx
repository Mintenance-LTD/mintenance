import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';

const LEGAL_URLS = {
  privacyPolicy: 'https://mintenance.app/privacy',
  termsAndConditions: 'https://mintenance.app/terms',
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
      const result = await mobileApiClient.get<{ success: boolean; data: UserSettings }>('/api/users/settings');
      return result.data || {
        notifications: { email: true, push: true, sms: false },
        privacy: { profileVisible: true, shareActivityData: false },
      };
    },
    enabled: !!user?.id,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const merged = { ...settings, ...patch };
      await mobileApiClient.patch<{ success: boolean }>('/api/users/settings', merged);
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
      accessibilityRole="button"
      accessibilityLabel={item.label}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconChip, { backgroundColor: item.iconBg ?? '#F7F7F7' }]}>
          <Ionicons
            name={item.icon as 'settings'}
            size={17}
            color={item.destructive ? '#EF4444' : (item.iconColor ?? '#717171')}
          />
        </View>
        <Text style={[styles.rowLabel, item.destructive && styles.destructiveText]}>
          {item.label}
        </Text>
      </View>
      {item.rightElement || (
        item.onPress && (
          <Ionicons name="chevron-forward" size={14} color="#B0B0B0" />
        )
      )}
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
    { label: 'Notification Preferences', icon: 'notifications-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('NotificationSettings') },
    { label: 'MFA Security', icon: 'shield-checkmark-outline', iconColor: '#6366F1', iconBg: '#EEF2FF', onPress: () => navigation.navigate('MFASecurity') },
    { label: 'Payment Methods', icon: 'card-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('PaymentMethods') },
    { label: 'Payment History', icon: 'receipt-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('PaymentHistory') },
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
          trackColor={{ false: '#EBEBEB', true: '#10B981' }}
          thumbColor="#FFFFFF"
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
          trackColor={{ false: '#EBEBEB', true: '#10B981' }}
          thumbColor="#FFFFFF"
        />
      ),
    },
  ];

  const legalItems: SettingsRow[] = [
    {
      label: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy),
    },
    {
      label: 'Terms & Conditions',
      icon: 'document-text-outline',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.termsAndConditions),
    },
  ];

  const dangerItems: SettingsRow[] = [
    { label: 'Export My Data', icon: 'download-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('DataExport') },
    { label: 'Delete Account', icon: 'trash-outline', iconColor: '#EF4444', iconBg: '#FEE2E2', onPress: () => navigation.navigate('DeleteAccount'), destructive: true },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Green gradient hero */}
      <LinearGradient
        colors={['#064E3B', '#059669', '#10B981']}
        style={styles.hero}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={{ height: insets.top + 12 }} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation as unknown as { goBack: () => void }).goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.heroTitle}>Settings</Text>
        <Text style={styles.heroSubtitle}>Account, security & preferences</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderSection('Account & Security', securityItems)}
        {renderSection('Privacy', privacyItems)}
        {renderSection('Legal', legalItems)}
        {renderSection('Danger Zone', dangerItems)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  hero: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4,
  },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#B0B0B0', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 14,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconChip: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#222222' },
  destructiveText: { color: '#EF4444' },
});

export default SettingsHubScreen;
