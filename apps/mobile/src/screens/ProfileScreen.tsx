import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { ThemeModeSelector } from '../components/ui/ThemeToggle/ThemeToggle';
import { TERMS_URL, PRIVACY_URL } from '../config/legal';
import { ResponsiveContainer } from '../components/responsive';
import { ProfileHeader } from './profile/components/ProfileHeader';
import { HomeownerStats } from './profile/components/HomeownerStats';
import { ContractorPerformance } from './profile/components/ContractorPerformance';
import { ProfileMenuSection } from './profile/components/ProfileMenuSection';
import { useProfileStats } from './profile/hooks/useProfileStats';
import { supabase } from '../config/supabase';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user, signOut } = useAuth();
  const { userStats } = useProfileStats(user);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }: { count: number | null }) => setUnreadNotifications(count ?? 0));
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const accountMenuItems = useMemo(() => {
    const items = [
      { label: 'Edit Profile', icon: 'person-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('EditProfile') },
      { label: 'Notifications', icon: 'notifications-outline', iconColor: '#717171', iconBg: '#F7F7F7', badge: unreadNotifications, onPress: () => navigation.navigate('NotificationSettings') },
      { label: 'Payment Methods', icon: 'card-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('PaymentMethods') },
    ];

    if (user?.role === 'homeowner') {
      items.push(
        { label: 'My Properties', icon: 'home-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Properties') },
        { label: 'Subscription', icon: 'ribbon-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Subscription') },
        { label: 'Financials', icon: 'wallet-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Financials') },
      );
    }

    items.push(
      { label: 'Calendar', icon: 'calendar-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Calendar') },
      { label: 'Reviews', icon: 'star-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Reviews') },
    );

    if (user?.role === 'contractor') {
      items.push(
        { label: 'Finance Dashboard', icon: 'analytics-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('FinanceDashboard') },
        { label: 'Invoice Management', icon: 'receipt-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('InvoiceManagement') },
        { label: 'Client Management', icon: 'people-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('CRMDashboard') },
        { label: 'Quote Builder', icon: 'document-text-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('QuoteBuilder') },
        { label: 'Service Areas', icon: 'map-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('ServiceAreas') },
        { label: 'Edit Discovery Card', icon: 'card', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('ContractorCardEditor') },
        { label: 'Expenses', icon: 'receipt-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Expenses') },
        { label: 'Documents', icon: 'document-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Documents') },
        { label: 'Certifications', icon: 'ribbon-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Certifications') },
        { label: 'Time Tracking', icon: 'time-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('TimeTracking') },
        { label: 'Reports & Analytics', icon: 'bar-chart-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Reporting') },
        { label: 'Payouts', icon: 'cash-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Payouts') },
      );
    }

    return items;
  }, [user?.role, navigation, unreadNotifications]);

  const supportMenuItems = useMemo(() => [
    { label: 'Settings', icon: 'settings-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('SettingsHub') },
    { label: 'Help Center', icon: 'help-circle-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('HelpCenter') },
    {
      label: 'Contact Us',
      icon: 'mail-outline',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => {
        Linking.openURL('mailto:support@mintenance.app?subject=Support%20Request').catch(() =>
          Alert.alert('Contact Us', 'Unable to open email. Please contact support@mintenance.app')
        );
      },
    },
    {
      label: 'Terms of Service',
      icon: 'document-outline',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => {
        Linking.openURL(TERMS_URL).catch(() =>
          Alert.alert('Terms of Service', 'Unable to open the Terms right now. Please try again later.')
        );
      },
      accessibilityRole: 'link' as const,
      accessibilityLabel: 'Open Terms of Service in browser',
    },
    {
      label: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      iconColor: '#717171',
      iconBg: '#F7F7F7',
      onPress: () => {
        Linking.openURL(PRIVACY_URL).catch(() =>
          Alert.alert('Privacy Policy', 'Unable to open the Privacy Policy right now. Please try again later.')
        );
      },
      accessibilityRole: 'link' as const,
      accessibilityLabel: 'Open Privacy Policy in browser',
    },
  ], [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
    <ResponsiveContainer
      maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
      padding={{ mobile: 0, tablet: 16, desktop: 24 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHeader user={user} joinDate={userStats.joinDate} />

        {user?.role === 'homeowner' && (
          <HomeownerStats
            totalJobs={userStats.totalJobs}
            completedJobs={userStats.completedJobs}
            activeJobs={userStats.activeJobs}
          />
        )}

        {user?.role === 'contractor' && (
          <ContractorPerformance
            rating={userStats.rating}
            responseTime={userStats.responseTime}
            completedJobs={userStats.completedJobs}
          />
        )}

        <ProfileMenuSection title="Account" items={accountMenuItems} />
        <ProfileMenuSection title="Support" items={supportMenuItems} />

        <ThemeModeSelector style={styles.themeSelector} />

        <View style={styles.signOutContainer}>
          <Button
            variant="secondary"
            title="Sign Out"
            onPress={handleSignOut}
            accessibilityLabel="Sign out of your account"
            accessibilityHint="Double tap to sign out"
            fullWidth
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>
    </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  themeSelector: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    ...theme.shadows.sm,
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 0,
    marginBottom: 0,
  },
});

export default ProfileScreen;
