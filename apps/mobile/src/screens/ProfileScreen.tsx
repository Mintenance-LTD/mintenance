import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { FadeIn, SlideIn } from '../components/animations/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

import Button from '../components/ui/Button';
import { TERMS_URL, PRIVACY_URL } from '../config/legal';
import { ResponsiveContainer } from '../components/responsive';
import { ProfileHeader } from './profile/components/ProfileHeader';
import { HomeownerStats } from './profile/components/HomeownerStats';
import { ContractorPerformance } from './profile/components/ContractorPerformance';
import { ProfileMenuSection } from './profile/components/ProfileMenuSection';
import { ProfileCompleteness } from './profile/components/ProfileCompleteness';
import { useProfileStats } from './profile/hooks/useProfileStats';
import { supabase } from '../config/supabase';

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
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
      { label: 'Edit Profile', icon: 'person-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('EditProfile') },
      { label: 'Notifications', icon: 'notifications-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', badge: unreadNotifications, onPress: () => navigation.navigate('NotificationSettings') },
      { label: 'Payment Methods', icon: 'card-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('PaymentMethods') },
    ];

    if (user?.role === 'homeowner') {
      items.push(
        { label: 'My Properties', icon: 'home-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => navigation.navigate('Properties') },
        { label: 'Documents', icon: 'document-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Documents') },
        { label: 'Subscription', icon: 'ribbon-outline', iconColor: '#EC4899', iconBg: '#FCE7F3', onPress: () => navigation.navigate('Subscription') },
        { label: 'Financials', icon: 'wallet-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('Financials') },
      );
    }

    items.push(
      { label: 'Calendar', icon: 'calendar-outline', iconColor: '#06B6D4', iconBg: '#CFFAFE', onPress: () => navigation.navigate('Calendar') },
      { label: 'Reviews', icon: 'star-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('Reviews') },
    );

    if (user?.role === 'contractor') {
      items.push(
        { label: 'Finance Dashboard', icon: 'analytics-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('FinanceDashboard') },
        { label: 'Invoice Management', icon: 'receipt-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => navigation.navigate('InvoiceManagement') },
        { label: 'Client Management', icon: 'people-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('CRMDashboard') },
        { label: 'Quote Builder', icon: 'document-text-outline', iconColor: '#EC4899', iconBg: '#FCE7F3', onPress: () => navigation.navigate('QuoteBuilder') },
        { label: 'Service Areas', icon: 'map-outline', iconColor: '#06B6D4', iconBg: '#CFFAFE', onPress: () => navigation.navigate('ServiceAreas') },
        { label: 'Edit Discovery Card', icon: 'card', iconColor: '#F59E0B', iconBg: '#FEF3C7', onPress: () => navigation.navigate('ContractorCardEditor') },
        { label: 'Expenses', icon: 'receipt-outline', iconColor: '#EF4444', iconBg: '#FEE2E2', onPress: () => navigation.navigate('Expenses') },
        { label: 'Documents', icon: 'document-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('Documents') },
        { label: 'Certifications', icon: 'ribbon-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('Certifications') },
        { label: 'Time Tracking', icon: 'time-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('TimeTracking') },
        { label: 'Reports & Analytics', icon: 'bar-chart-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => navigation.navigate('Reporting') },
        { label: 'Payouts', icon: 'cash-outline', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => navigation.navigate('Payouts') },
      );
    }

    return items;
  }, [user?.role, navigation, unreadNotifications]);

  const supportMenuItems = useMemo(() => [
    { label: 'Settings', icon: 'settings-outline', iconColor: '#717171', iconBg: '#F7F7F7', onPress: () => navigation.navigate('SettingsHub') },
    { label: 'Help Center', icon: 'help-circle-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => navigation.navigate('HelpCenter') },
    {
      label: 'Contact Us',
      icon: 'mail-outline',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
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
    <View style={styles.container}>
    <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
    <ResponsiveContainer
      maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
      padding={{ mobile: 0, tablet: 16, desktop: 24 }}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FadeIn duration={400}>
        <ProfileHeader user={user} joinDate={userStats.joinDate} topInset={insets.top} />
        </FadeIn>

        <SlideIn direction="up" distance={15} duration={400} delay={150}>
        <ProfileCompleteness user={user} completedJobs={userStats.completedJobs} />
        </SlideIn>

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

        <FadeIn duration={400} delay={300}>
        <ProfileMenuSection title="Account" items={accountMenuItems} />
        <ProfileMenuSection title="Support" items={supportMenuItems} />
        </FadeIn>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  content: {
    flex: 1,
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 14,
  },
});

export default ProfileScreen;
