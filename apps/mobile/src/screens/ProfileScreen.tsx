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

import { Button } from '../components/ui/Button';
import { TERMS_URL, PRIVACY_URL } from '../config/legal';
import { ResponsiveContainer } from '../components/responsive';
import { ProfileHeader } from './profile/components/ProfileHeader';
import { HomeownerStats } from './profile/components/HomeownerStats';
import { ContractorPerformance } from './profile/components/ContractorPerformance';
import { ProfileMenuSection } from './profile/components/ProfileMenuSection';
import { ProfileCompleteness } from './profile/components/ProfileCompleteness';
import { useProfileStats } from './profile/hooks/useProfileStats';
import { useContractorVerification } from './profile/hooks/useContractorVerification';
import { NotificationService } from '../services/NotificationService';
import { me } from '../design-system/mint-editorial';
import { goToTab } from '../navigation/hooks';

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { user, signOut } = useAuth();
  const { userStats } = useProfileStats(user);
  const verification = useContractorVerification(user);
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
        iconColor: me.infoFg,
        iconBg: me.infoBg,
        onPress: () => navigation.navigate('EditProfile'),
      },
      {
        label: 'Notifications',
        icon: 'notifications-outline',
        iconColor: me.accent,
        iconBg: me.warnBg,
        badge: unreadNotifications,
        // `Notifications` lives in the Modal stack which is a sibling
        // of the tabs on RootStack. A plain `navigate('Notifications')`
        // from ProfileStack bubbled up to the tabs and stopped there
        // (no route of that name on the tab nav), so the row looked
        // tappable but did nothing. Walk up two parents to RootStack
        // and target the nested `Modal` → `Notifications` path.
        onPress: () => {
          const nav = navigation as unknown as {
            getParent?: () =>
              | {
                  getParent?: () =>
                    | {
                        navigate: (s: string, p: { screen: string }) => void;
                      }
                    | undefined;
                }
              | undefined;
          };
          const rootNav = nav.getParent?.()?.getParent?.();
          rootNav?.navigate('Modal', { screen: 'Notifications' });
        },
      },
      {
        label: 'Payment Methods',
        icon: 'card-outline',
        iconColor: me.brand,
        iconBg: me.brandSoft,
        onPress: () => navigation.navigate('PaymentMethods'),
      },
      {
        label: 'Calendar',
        icon: 'calendar-outline',
        iconColor: me.cat.plumbingFg,
        iconBg: me.cat.plumbingBg,
        onPress: () => navigation.navigate('Calendar'),
      },
      {
        label: 'Reviews',
        icon: 'star-outline',
        iconColor: me.accent,
        iconBg: me.warnBg,
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
        iconColor: me.cat.electricalFg,
        iconBg: me.cat.electricalBg,
        onPress: () => navigation.navigate('Properties'),
      },
      {
        label: 'Documents',
        icon: 'document-outline',
        iconColor: me.ink2,
        iconBg: me.bg2,
        onPress: () => navigation.navigate('Documents'),
      },
      {
        label: 'Subscription',
        icon: 'ribbon-outline',
        iconColor: me.cat.paintingFg,
        iconBg: me.cat.paintingBg,
        onPress: () => navigation.navigate('Subscription'),
      },
      {
        label: 'Financials',
        icon: 'wallet-outline',
        iconColor: me.brand,
        iconBg: me.brandSoft,
        onPress: () => navigation.navigate('Financials'),
      },
      {
        label: 'Escrow Dashboard',
        icon: 'lock-closed-outline',
        iconColor: me.warnFg,
        iconBg: me.warnBg,
        onPress: () => navigation.navigate('EscrowDashboard'),
      },
    ],
    [navigation]
  );

  // NOTE: The contractor "Business Tools" and "Contractor Tools" menus that
  // used to live here were removed 2026-06-05. They were computed but never
  // rendered (dead code), and every target they pointed at — Finance, Invoices,
  // Quotes, Clients, Expenses, Payouts, Escrow, Service Areas, Time Tracking,
  // Reports, Documents — is already reachable via the dedicated Business tab
  // (BusinessHubScreen, opened from the "Business Tools" Quick Access row).
  // Re-adding them here would duplicate that surface.

  const supportMenuItems = useMemo(
    () => [
      {
        label: 'Settings',
        icon: 'settings-outline',
        iconColor: me.ink2,
        iconBg: me.bg2,
        onPress: () => navigation.navigate('SettingsHub'),
      },
      {
        label: 'Help Center',
        icon: 'help-circle-outline',
        iconColor: me.infoFg,
        iconBg: me.infoBg,
        onPress: () => navigation.navigate('HelpCenter'),
      },
      {
        label: 'Contact Us',
        icon: 'mail-outline',
        iconColor: me.brand,
        iconBg: me.brandSoft,
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
        iconColor: me.ink2,
        iconBg: me.bg2,
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
        iconColor: me.ink2,
        iconBg: me.bg2,
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
              identityVerified={verification.identityVerified}
              licenseVerified={verification.licenseVerified}
              paymentMethodLinked={verification.paymentMethodLinked}
              phoneVerified={verification.phoneVerified}
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
              <ProfileMenuSection
                title='Quick Access'
                items={[
                  {
                    label: 'Business Tools',
                    icon: 'briefcase-outline',
                    iconColor: me.brand,
                    iconBg: me.brandSoft,
                    onPress: () => {
                      // BusinessTab is a sibling root tab, not a screen
                      // in the Profile stack. The bare
                      // navigation.navigate('BusinessTab') call worked
                      // by accident (React Navigation falls through to
                      // the root navigator) but skipped any tab-press
                      // listeners and kept the Profile stack on the
                      // back stack — pressing back from BusinessHub
                      // dropped the user back into Settings instead of
                      // the previous tab. Use the typed parent.
                      const parent = (
                        navigation as unknown as {
                          getParent?: () =>
                            | {
                                navigate: (name: string) => void;
                              }
                            | undefined;
                        }
                      ).getParent?.();
                      if (parent) parent.navigate('BusinessTab');
                      else goToTab(navigation, 'BusinessTab');
                    },
                  },
                  {
                    label: 'Verification',
                    icon: 'shield-checkmark-outline',
                    iconColor: me.infoFg,
                    iconBg: me.infoBg,
                    // 2026-05-21: route to the new status dashboard;
                    // the legacy submission form is still reachable from
                    // the dashboard's "+ Add credentials" CTAs.
                    onPress: () => navigation.navigate('VerificationStatus'),
                  },
                  {
                    label: 'Preview public profile',
                    icon: 'eye-outline',
                    iconColor: me.brand,
                    iconBg: me.brandSoft,
                    // Read-only preview of how homeowners see you.
                    // BusinessProfile (below) is the edit surface.
                    onPress: () => navigation.navigate('MyPublicProfile'),
                  },
                  {
                    label: 'Business Profile',
                    icon: 'briefcase-outline',
                    iconColor: me.ink2,
                    iconBg: me.bg2,
                    onPress: () =>
                      // BusinessProfile lives on the same ProfileStack;
                      // typed nav already accepts this without `as never`.
                      navigation.navigate('BusinessProfile'),
                  },
                ]}
              />
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
    backgroundColor: me.bg,
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
