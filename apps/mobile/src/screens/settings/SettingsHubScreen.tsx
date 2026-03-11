import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

const LEGAL_URLS = {
  privacyPolicy: 'https://mintenance.app/privacy',
  termsAndConditions: 'https://mintenance.app/terms',
} as const;
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';

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
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ settings: UserSettings }>('/api/users/settings');
      return res.settings;
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      return mobileApiClient.put('/api/users/settings', patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
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

  const accountItems: SettingsRow[] = [
    { label: 'Edit Profile', icon: 'person-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('EditProfile') },
    { label: 'Notification Preferences', icon: 'notifications-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('NotificationSettings') },
    { label: 'Payment Methods', icon: 'card-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('PaymentMethods') },
  ];

  if (user?.role === 'homeowner') {
    accountItems.push(
      { label: 'My Properties', icon: 'home-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => navigation.navigate('Properties') },
      { label: 'Subscription', icon: 'ribbon-outline', iconColor: '#EC4899', iconBg: '#FCE7F3', onPress: () => navigation.navigate('Subscription') },
      { label: 'Financials', icon: 'wallet-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('Financials') },
    );
  }

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
          trackColor={{ false: '#EBEBEB', true: '#222222' }}
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
          trackColor={{ false: '#EBEBEB', true: '#222222' }}
          thumbColor="#FFFFFF"
        />
      ),
    },
  ];

  const supportItems: SettingsRow[] = [
    { label: 'Help Center', icon: 'help-circle-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('HelpCenter') },
    { label: 'Payment History', icon: 'receipt-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('PaymentHistory') },
    { label: 'Calendar', icon: 'calendar-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('Calendar') },
    { label: 'Reviews', icon: 'star-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('Reviews') },
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" showBack onBack={() => (navigation as unknown as { goBack: () => void }).goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderSection('Account', accountItems)}
        {renderSection('Privacy', privacyItems)}
        {renderSection('More', supportItems)}
        {renderSection('Legal', legalItems)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
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
    color: '#222222',
  },
  destructiveText: {
    color: '#EF4444',
  },
});

export default SettingsHubScreen;
