/**
 * HomeownerDashboard Component
 *
 * Airbnb-style homeowner dashboard with profile header,
 * stats overview, quick services, and recent jobs.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { JobService } from '../../services/JobService';
import { BidService, Bid as ServiceBid } from '../../services/BidService';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import { theme } from '../../theme';
import { logger } from '../../utils/logger';
import { QuickServices } from './QuickServices';
import { RecentJobs } from './RecentJobs';
import { WelcomeBanner } from './WelcomeBanner';
import { StatsCards } from './StatsCards';
import { BidsReceived } from './BidsReceived';

const appIcon = require('../../../assets/icon.png');

export const HomeownerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<unknown>();

  const [homeownerJobs, setHomeownerJobs] = useState<unknown[]>([]);
  const [recentBids, setRecentBids] = useState<{ id: string; contractorName: string; jobTitle: string; amount: number; status: string; jobId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showUrgencyPicker, setShowUrgencyPicker] = useState(false);
  const [selectedSearchProperty, setSelectedSearchProperty] = useState<Property | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: () => apiClient.get<Property[]>('/api/properties'),
    enabled: !!user,
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const jobs = await JobService.getUserJobs(user.id);
      setHomeownerJobs(jobs || []);

      // Fetch recent bids for homeowner's active jobs
      const activeJobIds = (jobs || [])
        .filter((j: { status?: string }) => j?.status === 'posted' || j?.status === 'assigned')
        .map((j: { id?: string }) => j?.id)
        .filter(Boolean) as string[];

      if (activeJobIds.length > 0) {
        const allBids: ServiceBid[] = [];
        for (const jobId of activeJobIds.slice(0, 5)) {
          try {
            const bids = await BidService.getBidsByJob(jobId, 'pending');
            allBids.push(...bids);
          } catch {
            // Skip individual job bid fetch errors
          }
        }
        setRecentBids(
          allBids.slice(0, 5).map((b) => ({
            id: b.id,
            contractorName: b.contractor
              ? `${b.contractor.first_name} ${b.contractor.last_name}`
              : 'Unknown',
            jobTitle: b.job?.title || 'Untitled job',
            amount: b.amount,
            status: b.status,
            jobId: b.job_id,
          }))
        );
      }
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      try {
        const jobs = await JobService.getUserJobs(user.id);
        setHomeownerJobs(jobs || []);
      } catch {}
    }
    setRefreshing(false);
  };

  const openJobPosting = () => {
    navigation.navigate('JobsTab', { screen: 'JobPosting' });
  };

  const openServiceRequest = () => {
    (navigation as any).navigate('Modal', {
      screen: 'ServiceRequest',
      params: {
        ...(selectedSearchProperty ? { propertyId: selectedSearchProperty.id } : {}),
        ...(selectedUrgency !== 'medium' ? { priority: selectedUrgency } : {}),
      },
    });
  };

  const openJobsList = () => {
    navigation.navigate('JobsTab', { screen: 'JobsList' });
  };

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadDashboardData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.firstName || user?.first_name || 'there';
  const userInitial = userName[0].toUpperCase();

  return (
    <View style={styles.container}>
      {/* Clean top bar - Web dashboard style */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.brandButton}
          onPress={() => navigation.navigate('HomeTab' as never)}
          accessibilityRole="button"
          accessibilityLabel="Mintenance home"
        >
          <Image source={appIcon} style={styles.brandIcon} />
          <Text style={styles.brandText}>Mintenance</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => (navigation as any).navigate('Modal', { screen: 'Notifications' })}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.notificationCircle}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileMenu(true)}
            accessibilityRole="button"
            accessibilityLabel="Open quick menu"
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{userInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile dropdown menu */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setShowProfileMenu(false)}>
          <Pressable style={styles.dropdownMenu}>
            {([
              { label: 'Properties', icon: 'home-outline' as const, color: theme.colors.primary, onPress: () => navigation.navigate('ProfileTab', { screen: 'Properties' }) },
              { label: 'Messages', icon: 'chatbubble-outline' as const, color: '#3B82F6', onPress: () => navigation.navigate('MessagingTab' as never) },
              { label: 'Payments', icon: 'card-outline' as const, color: '#F59E0B', onPress: () => navigation.navigate('ProfileTab', { screen: 'PaymentMethods' }) },
              { label: 'Settings', icon: 'settings-outline' as const, color: '#8B5CF6', onPress: () => navigation.navigate('ProfileTab' as never) },
            ]).map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.dropdownItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={styles.dropdownItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowProfileMenu(false);
                navigation.navigate('ProfileTab' as never);
              }}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.dropdownItemText}>View Profile</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Property picker modal */}
      <Modal
        visible={showPropertyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPropertyPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPropertyPicker(false)}>
          <Pressable style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Property</Text>
            {properties && properties.length > 0 ? (
              <FlatList
                data={properties}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      selectedSearchProperty?.id === item.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedSearchProperty(item);
                      setShowPropertyPicker(false);
                    }}
                  >
                    <Ionicons
                      name="home-outline"
                      size={20}
                      color={selectedSearchProperty?.id === item.id ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={styles.pickerOptionText}>
                      <Text style={styles.pickerOptionTitle}>{item.address_line1}</Text>
                      <Text style={styles.pickerOptionSubtitle}>{item.city}, {item.postcode}</Text>
                    </View>
                    {selectedSearchProperty?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.pickerEmpty}>
                <Ionicons name="home-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={styles.pickerEmptyText}>No properties added yet</Text>
                <TouchableOpacity
                  style={styles.pickerAddButton}
                  onPress={() => {
                    setShowPropertyPicker(false);
                    (navigation as any).navigate('ProfileTab', { screen: 'AddProperty' });
                  }}
                >
                  <Ionicons name="add" size={18} color={theme.colors.textInverse} />
                  <Text style={styles.pickerAddButtonText}>Add Property</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Urgency picker modal */}
      <Modal
        visible={showUrgencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUrgencyPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowUrgencyPicker(false)}>
          <Pressable style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>How urgent is this?</Text>
            {([
              { id: 'low' as const, label: 'Low', desc: 'Can wait a few days', color: '#34C759', icon: 'time-outline' as const },
              { id: 'medium' as const, label: 'Medium', desc: 'This week if possible', color: '#FF9500', icon: 'alert-circle-outline' as const },
              { id: 'high' as const, label: 'Urgent', desc: 'Needs attention ASAP', color: '#FF3B30', icon: 'warning-outline' as const },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.pickerOption,
                  selectedUrgency === opt.id && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedUrgency(opt.id);
                  setShowUrgencyPicker(false);
                }}
              >
                <View style={[styles.urgencyDot, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon} size={18} color="#FFFFFF" />
                </View>
                <View style={styles.pickerOptionText}>
                  <Text style={styles.pickerOptionTitle}>{opt.label}</Text>
                  <Text style={styles.pickerOptionSubtitle}>{opt.desc}</Text>
                </View>
                {selectedUrgency === opt.id && (
                  <Ionicons name="checkmark-circle" size={22} color={opt.color} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='home-scroll-view'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        {/* Welcome greeting + Search */}
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeGreeting}>
            Welcome back, {userName}
          </Text>
        </View>
        <WelcomeBanner
          onWherePress={() => setShowPropertyPicker(true)}
          onUrgencyPress={() => setShowUrgencyPicker(true)}
          onServicePress={openServiceRequest}
          propertyLabel={selectedSearchProperty?.address_line1}
          urgencyLabel={
            selectedUrgency === 'low' ? 'Low' :
            selectedUrgency === 'high' ? 'Urgent' :
            undefined
          }
        />

        <View style={styles.homeownerContent}>
          <StatsCards
            activeJobs={homeownerJobs.filter((j: any) => j?.status === 'in_progress' || j?.status === 'assigned').length}
            completedJobs={homeownerJobs.filter((j: any) => j?.status === 'completed').length}
          />

          <BidsReceived
            bids={recentBids}
            onViewAllPress={openJobsList}
            onReviewPress={(bidId) => {
              const bid = recentBids.find((b) => b.id === bidId);
              if (bid?.jobId) {
                navigation.navigate('JobsTab', { screen: 'BidReview', params: { jobId: bid.jobId } });
              }
            }}
          />

          <QuickServices
            onServicePress={openServiceRequest}
            onBrowseAllPress={openJobPosting}
          />

          <RecentJobs
            jobs={homeownerJobs}
            onViewAllPress={openJobsList}
            onJobPress={(jobId) => navigation.navigate('JobsTab', { screen: 'JobDetails', params: { jobId } })}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E3A5F',
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  welcomeGreeting: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  homeownerContent: {
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
    paddingTop: 20,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  pickerOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pickerOptionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  pickerEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  pickerEmptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  pickerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  pickerAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  urgencyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
