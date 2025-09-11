import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { JobService } from '../services/JobService';
import { Job } from '../types';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import Button from '../components/ui/Button';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [userStats, setUserStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    rating: 4.8,
    responseTime: '< 2h',
    joinDate: '',
  });
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let jobs: Job[] = [];

      if (user.role === 'homeowner') {
        jobs = await JobService.getJobsByHomeowner(user.id);
      } else {
        // For contractors, we'd need a method to get their jobs
        // For now, using a placeholder
        jobs = [];
      }

      const stats = {
        totalJobs: jobs.length,
        completedJobs: jobs.filter((job) => job.status === 'completed').length,
        activeJobs: jobs.filter(
          (job) => job.status === 'in_progress' || job.status === 'assigned'
        ).length,
        rating: 4.8, // Would come from reviews
        responseTime: '< 2h',
        joinDate: new Date(user.createdAt || Date.now()).toLocaleDateString(
          'en-US',
          {
            year: 'numeric',
            month: 'long',
          }
        ),
      };

      setUserStats(stats);
    } catch (error) {
      logger.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Text>
              </View>
            )}

            {/* Verification Badges */}
            <View style={styles.verificationBadges}>
              <View style={styles.verifiedBadge}>
                <Ionicons name='checkmark-circle' size={20} color='#4CD964' />
              </View>
              {user?.role === 'contractor' && (
                <View style={styles.licensedBadge}>
                  <Ionicons
                    name='shield-checkmark'
                    size={16}
                    color={theme.colors.info}
                  />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>

          {user?.role === 'contractor' && (
            <View style={styles.contractorTitle}>
              <Ionicons name='hammer' size={16} color='#666' />
              <Text style={styles.contractorTitleText}>
                Professional Contractor
              </Text>
            </View>
          )}

          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.roleBadge,
                user?.role === 'contractor' && styles.contractorBadge,
              ]}
            >
              <Ionicons
                name={user?.role === 'contractor' ? 'construct' : 'home'}
                size={14}
                color={user?.role === 'contractor' ? '#FF6B35' : '#007AFF'}
              />
              <Text
                style={[
                  styles.roleText,
                  user?.role === 'contractor' && styles.contractorRoleText,
                ]}
              >
                {user?.role === 'contractor' ? 'Professional' : 'Homeowner'}
              </Text>
            </View>

            <View style={styles.memberSinceBadge}>
              <Ionicons name='calendar-outline' size={14} color='#666' />
              <Text style={styles.memberSinceText}>
                Since {userStats.joinDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        {user?.role === 'homeowner' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Activity</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.totalJobs}</Text>
                <Text style={styles.statLabel}>Jobs Posted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.completedJobs}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.activeJobs}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          </View>
        )}

        {user?.role === 'contractor' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name='star' size={18} color='#FFD700' />
                  <Text style={styles.performanceValue}>
                    {userStats.rating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.performanceLabel}>Overall Rating</Text>
                <Text style={styles.performanceSubtext}>
                  Based on 127 reviews
                </Text>
              </View>

              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name='checkmark-circle' size={18} color='#34C759' />
                  <Text style={styles.performanceValue}>98%</Text>
                </View>
                <Text style={styles.performanceLabel}>Success Rate</Text>
                <Text style={styles.performanceSubtext}>
                  Jobs completed successfully
                </Text>
              </View>

              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons name='time' size={18} color='#FF9500' />
                  <Text style={styles.performanceValue}>
                    {userStats.responseTime}
                  </Text>
                </View>
                <Text style={styles.performanceLabel}>Response Time</Text>
                <Text style={styles.performanceSubtext}>Average response</Text>
              </View>

              <View style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <Ionicons
                    name='briefcase'
                    size={18}
                    color={theme.colors.info}
                  />
                  <Text style={styles.performanceValue}>85</Text>
                </View>
                <Text style={styles.performanceLabel}>Jobs Done</Text>
                <Text style={styles.performanceSubtext}>Total completed</Text>
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.verificationSection}>
              <Text style={styles.verificationTitle}>Verification Status</Text>
              <View style={styles.verificationItem}>
                <Ionicons name='checkmark-circle' size={20} color='#4CD964' />
                <Text style={styles.verificationText}>Identity Verified</Text>
              </View>
              <View style={styles.verificationItem}>
                <Ionicons name='shield-checkmark' size={20} color='#4CD964' />
                <Text style={styles.verificationText}>Licensed & Insured</Text>
              </View>
              <View style={styles.verificationItem}>
                <Ionicons name='card' size={20} color='#4CD964' />
                <Text style={styles.verificationText}>
                  Payment Method Verified
                </Text>
              </View>
              <View style={styles.verificationItem}>
                <Ionicons name='call' size={20} color='#4CD964' />
                <Text style={styles.verificationText}>
                  Phone Number Verified
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='person-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Edit Profile</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='notifications-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='card-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Payment Methods</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          {user?.role === 'contractor' && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('FinanceDashboard')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons
                      name='analytics-outline'
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.menuText}>Finance Dashboard</Text>
                </View>
                <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('InvoiceManagement')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons
                      name='receipt-outline'
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.menuText}>Invoice Management</Text>
                </View>
                <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('CRMDashboard')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons
                      name='people-outline'
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.menuText}>Client Management</Text>
                </View>
                <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='help-circle-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Help Center</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Contact Us',
                'Email: support@mintenance.com\nPhone: 1-800-MINT-HELP',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='mail-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Contact Us</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Terms of Service',
                'Please visit our website or app store listing to view the full Terms of Service.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='document-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Terms of Service</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Privacy Policy',
                'Please visit our website or app store listing to view the full Privacy Policy.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name='shield-checkmark-outline'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.menuText}>Privacy Policy</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#C7C7CC' />
          </TouchableOpacity>
        </View>

        <Button
          variant='danger'
          title='Sign Out'
          onPress={handleSignOut}
          fullWidth
          style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 50 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Pure white background
  },
  header: {
    backgroundColor: theme.colors.primary, // Dark blue header
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
  profileInfo: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: -16, // Overlap with header
    padding: 24,
    alignItems: 'center',
    borderRadius: 20, // Rounded card
    ...theme.shadows.base,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  verificationBadges: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    flexDirection: 'row',
  },
  verifiedBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    padding: 3,
    marginLeft: 2,
    ...theme.shadows.sm,
  },
  licensedBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginLeft: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  contractorTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contractorTitleText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
  },
  userEmail: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  contractorBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  contractorRoleText: {
    color: theme.colors.secondary,
  },
  memberSinceBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberSinceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20, // Rounded card
    ...theme.shadows.base,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  performanceItem: {
    width: '48%',
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 16,
    borderRadius: 16, // More rounded
    marginRight: '2%',
    marginBottom: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  performanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  verificationSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20, // Rounded card
    ...theme.shadows.base,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginLeft: 16,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: theme.colors.error, // Red sign out button
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 50,
    paddingVertical: 16,
    borderRadius: 20, // Rounded button
    alignItems: 'center',
    ...theme.shadows.base,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});

export default ProfileScreen;
