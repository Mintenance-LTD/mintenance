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
import { NotificationService } from '../services/NotificationService';
import { theme } from '../theme';

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user, signOut } = useAuth();
  const { userStats } = useProfileStats(user);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    NotificationService.getUnreadCount(user.id).then(setUnreadNotifications);
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const accountMenuItems = useMemo(
    () => [
      {
        label: 'Edit Profile',
        icon: 'person-outline',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        onPress: () => navigation.navigate('EditProfile'),
      },
      {
        label: 'Notifications',
        icon: 'notifications-outline',
        iconColor: theme.colors.accent,
        iconBg: theme.colors.accentLight,
        badge: unreadNotifications,
        onPress: () => navigation.navigate('NotificationSettings'),
      },
      {
        label: 'Payment Methods',
        icon: 'card-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => navigation.navigate('PaymentMethods'),
      },
      {
        label: 'Calendar',
        icon: 'calendar-outline',
        iconColor: '#06B6D4',
        iconBg: '#CFFAFE',
        onPress: () => navigation.navigate('Calendar'),
      },
      {
        label: 'Reviews',
        icon: 'star-outline',
        iconColor: theme.colors.accent,
        iconBg: theme.colors.accentLight,
        onPress: () => navigation.navigate('Reviews'),
      },
    ],
    [navigation, unreadNotifications]
  );

  const propertiesMenuItems = useMemo(
    () => [
      {
        label: 'My Properties',
        icon: 'home-outline',
        iconColor: '#8B5CF6',
        iconBg: '#EDE9FE',
        onPress: () => navigation.navigate('Properties'),
      },
      {
        label: 'Documents',
        icon: 'document-outline',
        iconColor: theme.colors.textSecondary,
        iconBg: theme.colors.backgroundSecondary,
        onPress: () => navigation.navigate('Documents'),
      },
      {
        label: 'Subscription',
        icon: 'ribbon-outline',
        iconColor: '#EC4899',
        iconBg: '#FCE7F3',
        onPress: () => navigation.navigate('Subscription'),
      },
      {
        label: 'Financials',
        icon: 'wallet-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => navigation.navigate('Financials'),
      },
      {
        label: 'Escrow Dashboard',
        icon: 'lock-closed-outline',
        iconColor: '#D97706',
        iconBg: '#FEF3C7',
        onPress: () => navigation.navigate('EscrowDashboard'),
      },
    ],
    [navigation]
  );

  const businessMenuItems = useMemo(
    () => [
      {
        label: 'Finance Dashboard',
        icon: 'analytics-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => navigation.navigate('FinanceDashboard'),
      },
      {
        label: 'Invoice Management',
        icon: 'receipt-outline',
        iconColor: '#8B5CF6',
        iconBg: '#EDE9FE',
        onPress: () => navigation.navigate('InvoiceManagement'),
      },
      {
        label: 'Client Management',
        icon: 'people-outline',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        onPress: () => navigation.navigate('CRMDashboard'),
      },
      {
        label: 'Quote Builder',
        icon: 'document-text-outline',
        iconColor: '#EC4899',
        iconBg: '#FCE7F3',
        onPress: () => navigation.navigate('QuoteBuilder'),
      },
      {
        label: 'Payouts',
        icon: 'cash-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => navigation.navigate('Payouts'),
      },
      {
        label: 'Expenses',
        icon: 'receipt-outline',
        iconColor: theme.colors.error,
        iconBg: '#FEE2E2',
        onPress: () => navigation.navigate('Expenses'),
      },
      {
        label: 'Escrow Dashboard',
        icon: 'lock-closed-outline',
        iconColor: '#D97706',
        iconBg: '#FEF3C7',
        onPress: () => navigation.navigate('EscrowDashboard'),
      },
    ],
    [navigation]
  );

  const contractorToolsMenuItems = useMemo(
    () => [
      {
        label: 'Service Areas',
        icon: 'map-outline',
        iconColor: '#06B6D4',
        iconBg: '#CFFAFE',
        onPress: () => navigation.navigate('ServiceAreas'),
      },
      {
        label: 'Certifications',
        icon: 'ribbon-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => navigation.navigate('Certifications'),
      },
      {
        label: 'Documents',
        icon: 'document-outline',
        iconColor: theme.colors.textSecondary,
        iconBg: theme.colors.backgroundSecondary,
        onPress: () => navigation.navigate('Documents'),
      },
      {
        label: 'Time Tracking',
        icon: 'time-outline',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        onPress: () => navigation.navigate('TimeTracking'),
      },
      {
        label: 'Reports & Analytics',
        icon: 'bar-chart-outline',
        iconColor: '#8B5CF6',
        iconBg: '#EDE9FE',
        onPress: () => navigation.navigate('Reporting'),
      },
      {
        label: 'Edit Discovery Card',
        icon: 'card',
        iconColor: theme.colors.accent,
        iconBg: theme.colors.accentLight,
        onPress: () => navigation.navigate('ContractorCardEditor'),
      },
      // Portfolio Gallery: ARCHIVED - portfolio feature removed
    ],
    [navigation]
  );

  const supportMenuItems = useMemo(
    () => [
      {
        label: 'Settings',
        icon: 'settings-outline',
        iconColor: theme.colors.textSecondary,
        iconBg: theme.colors.backgroundSecondary,
        onPress: () => navigation.navigate('SettingsHub'),
      },
      {
        label: 'Help Center',
        icon: 'help-circle-outline',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        onPress: () => navigation.navigate('HelpCenter'),
      },
      {
        label: 'Contact Us',
        icon: 'mail-outline',
        iconColor: theme.colors.primary,
        iconBg: theme.colors.primaryLight,
        onPress: () => {
          Linking.openURL(
            'mailto:support@mintenance.app?subject=Support%20Request'
          ).catch(() =>
            Alert.alert(
              'Contact Us',
              'Unable to open email. Please contact support@mintenance.app'
            )
          );
        },
      },
      {
        label: 'Terms of Service',
        icon: 'document-outline',
        iconColor: theme.colors.textSecondary,
        iconBg: theme.colors.backgroundSecondary,
        onPress: () => {
          Linking.openURL(TERMS_URL).catch(() =>
            Alert.alert(
              'Terms of Service',
              'Unable to open the Terms right now. Please try again later.'
            )
          );
        },
        accessibilityRole: 'link' as const,
        accessibilityLabel: 'Open Terms of Service in browser',
      },
      {
        label: 'Privacy Policy',
        icon: 'shield-checkmark-outline',
        iconColor: theme.colors.textSecondary,
        iconBg: theme.colors.backgroundSecondary,
        onPress: () => {
          Linking.openURL(PRIVACY_URL).catch(() =>
            Alert.alert(
              'Privacy Policy',
              'Unable to open the Privacy Policy right now. Please try again later.'
            )
          );
        },
        accessibilityRole: 'link' as const,
        accessibilityLabel: 'Open Privacy Policy in browser',
      },
    ],
    [navigation]
  );

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />
      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <FadeIn duration={400}>
            <ProfileHeader
              user={user}
              joinDate={userStats.joinDate}
              topInset={insets.top}
            />
          </FadeIn>

          <SlideIn direction='up' distance={15} duration={400} delay={150}>
            <ProfileCompleteness
              user={user}
              completedJobs={userStats.completedJobs}
            />
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
            <ProfileMenuSection title='Account' items={accountMenuItems} />

            {user?.role === 'homeowner' && (
              <ProfileMenuSection
                title='My Properties'
                items={propertiesMenuItems}
              />
            )}

            {user?.role === 'contractor' && (
              <>
                <ProfileMenuSection
                  title='Business & Finance'
                  items={businessMenuItems}
                />
                <ProfileMenuSection
                  title='Contractor Tools'
                  items={contractorToolsMenuItems}
                />
              </>
            )}

            <ProfileMenuSection title='Support' items={supportMenuItems} />
          </FadeIn>

          <View style={styles.signOutContainer}>
            <Button
              variant='secondary'
              title='Sign Out'
              onPress={handleSignOut}
              accessibilityLabel='Sign out of your account'
              accessibilityHint='Double tap to sign out'
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
    backgroundColor: theme.colors.backgroundSecondary,
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
