import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { TERMS_URL, PRIVACY_URL } from '../config/legal';
import { ResponsiveContainer } from '../components/responsive';
import { ProfileHeader } from './profile/components/ProfileHeader';
import { HomeownerStats } from './profile/components/HomeownerStats';
import { ContractorPerformance } from './profile/components/ContractorPerformance';
import { ProfileMenuSection } from './profile/components/ProfileMenuSection';
import { useProfileStats } from './profile/hooks/useProfileStats';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user, signOut } = useAuth();
  const { userStats } = useProfileStats(user);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const accountMenuItems = useMemo(() => {
    const items = [
      { label: 'Edit Profile', icon: 'person-outline', onPress: () => navigation.navigate('EditProfile') },
      { label: 'Notifications', icon: 'notifications-outline', onPress: () => navigation.navigate('NotificationSettings') },
      { label: 'Payment Methods', icon: 'card-outline', onPress: () => navigation.navigate('PaymentMethods') },
    ];

    if (user?.role === 'homeowner') {
      items.push(
        { label: 'My Properties', icon: 'home-outline', onPress: () => navigation.navigate('Properties') },
      );
    }

    items.push(
      { label: 'Calendar', icon: 'calendar-outline', onPress: () => navigation.navigate('Calendar') },
      { label: 'Reviews', icon: 'star-outline', onPress: () => navigation.navigate('Reviews') },
    );

    if (user?.role === 'contractor') {
      items.push(
        { label: 'Finance Dashboard', icon: 'analytics-outline', onPress: () => navigation.navigate('FinanceDashboard') },
        { label: 'Invoice Management', icon: 'receipt-outline', onPress: () => navigation.navigate('InvoiceManagement') },
        { label: 'Client Management', icon: 'people-outline', onPress: () => navigation.navigate('CRMDashboard') },
        { label: 'Quote Builder', icon: 'document-text-outline', onPress: () => navigation.navigate('QuoteBuilder') },
        { label: 'Service Areas', icon: 'map-outline', onPress: () => navigation.navigate('ServiceAreas') },
        { label: 'Edit Discovery Card', icon: 'card', onPress: () => navigation.navigate('ContractorCardEditor') },
      );
    }

    return items;
  }, [user?.role, navigation]);

  const supportMenuItems = useMemo(() => [
    { label: 'Help Center', icon: 'help-circle-outline', onPress: () => navigation.navigate('HelpCenter') },
    {
      label: 'Contact Us',
      icon: 'mail-outline',
      onPress: () => {
        Alert.alert(
          'Contact Us',
          'Email: support@mintenance.com\nPhone: 1-800-MINT-HELP',
          [{ text: 'OK' }]
        );
      },
    },
    {
      label: 'Terms of Service',
      icon: 'document-outline',
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
    <ResponsiveContainer
      maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
      padding={{ mobile: 0, tablet: 16, desktop: 24 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole='header'>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
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
          />
        )}

        <ProfileMenuSection title='Account' items={accountMenuItems} />
        <ProfileMenuSection title='Support' items={supportMenuItems} />

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  },
});

export default ProfileScreen;
