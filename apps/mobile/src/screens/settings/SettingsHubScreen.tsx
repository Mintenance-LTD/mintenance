import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
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
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
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
      disabled={!item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={item.icon as 'settings'}
          size={20}
          color={item.destructive ? '#EF4444' : theme.colors.textSecondary}
        />
        <Text style={[styles.rowLabel, item.destructive && styles.destructiveText]}>
          {item.label}
        </Text>
      </View>
      {item.rightElement || (
        item.onPress && (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        )
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingsRow[]) => (
    <View style={styles.section} key={title}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card variant="elevated" padding="none">
        {items.map((item, idx) => renderRow(item, idx === items.length - 1))}
      </Card>
    </View>
  );

  const accountItems: SettingsRow[] = [
    { label: 'Edit Profile', icon: 'person-outline', onPress: () => navigation.navigate('EditProfile') },
    { label: 'Notification Preferences', icon: 'notifications-outline', onPress: () => navigation.navigate('NotificationSettings') },
    { label: 'Payment Methods', icon: 'card-outline', onPress: () => navigation.navigate('PaymentMethods') },
  ];

  if (user?.role === 'homeowner') {
    accountItems.push(
      { label: 'My Properties', icon: 'home-outline', onPress: () => navigation.navigate('Properties') },
      { label: 'Subscription', icon: 'ribbon-outline', onPress: () => navigation.navigate('Subscription') },
      { label: 'Financials', icon: 'wallet-outline', onPress: () => navigation.navigate('Financials') },
    );
  }

  const privacyItems: SettingsRow[] = [
    {
      label: 'Profile Visible',
      icon: 'eye-outline',
      rightElement: (
        <Switch
          value={settings?.privacy?.profileVisible ?? true}
          onValueChange={() => togglePrivacy('profileVisible')}
          trackColor={{ false: '#E2E8F0', true: '#222222' }}
        />
      ),
    },
    {
      label: 'Share Activity Data',
      icon: 'analytics-outline',
      rightElement: (
        <Switch
          value={settings?.privacy?.shareActivityData ?? false}
          onValueChange={() => togglePrivacy('shareActivityData')}
          trackColor={{ false: '#E2E8F0', true: '#222222' }}
        />
      ),
    },
  ];

  const supportItems: SettingsRow[] = [
    { label: 'Help Center', icon: 'help-circle-outline', onPress: () => navigation.navigate('HelpCenter') },
    { label: 'Payment History', icon: 'receipt-outline', onPress: () => navigation.navigate('PaymentHistory') },
    { label: 'Calendar', icon: 'calendar-outline', onPress: () => navigation.navigate('Calendar') },
    { label: 'Reviews', icon: 'star-outline', onPress: () => navigation.navigate('Reviews') },
  ];

  const legalItems: SettingsRow[] = [
    {
      label: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy),
    },
    {
      label: 'Terms & Conditions',
      icon: 'document-text-outline',
      onPress: () => WebBrowser.openBrowserAsync(LEGAL_URLS.termsAndConditions),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" showBack onBack={() => navigation.goBack()} />

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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing[10],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing[2],
    marginLeft: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[3],
  },
  destructiveText: {
    color: '#EF4444',
  },
});

export default SettingsHubScreen;
