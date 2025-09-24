/**
 * PreviousContractors Component
 * 
 * Displays previously used contractors with ability to message or rehire them.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { UserProfile } from '../../services/UserService';

interface PreviousContractorsProps {
  contractors: UserProfile[];
  onMessagePress: (params: Record<string, unknown>) => void;
  onRehirePress: (params: Record<string, unknown>) => void;
}

export const PreviousContractors: React.FC<PreviousContractorsProps> = ({
  contractors,
  onMessagePress,
  onRehirePress,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Previously Used Contractors
        </Text>
        <Text style={styles.sectionSubtitle}>
          Your trusted professionals
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.contractorsScrollView}
      >
        {contractors.length > 0 ? (
          contractors.map((contractor) => (
            <View key={contractor.id} style={styles.contractorCard}>
              <View style={styles.contractorAvatar}>
                <Text style={styles.contractorAvatarText}>
                  {contractor.firstName
                    ? contractor.firstName.charAt(0).toUpperCase()
                    : 'C'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name='checkmark'
                    size={10}
                    color={theme.colors.textInverse}
                  />
                </View>
              </View>
              <Text style={styles.contractorName}>
                {`${contractor.firstName || ''} ${contractor.lastName || ''}`.trim() ||
                  'Contractor'}
              </Text>
              <Text style={styles.contractorSpecialty}>
                {contractor.skills?.[0]?.skillName ||
                  contractor.bio?.split('.')[0] ||
                  'Professional Contractor'}
              </Text>
              <View style={styles.contractorRating}>
                <Ionicons
                  name='star'
                  size={12}
                  color={theme.colors.ratingGold}
                />
                <Text style={styles.contractorRatingText}>
                  {contractor.reviews?.[0]?.rating?.toFixed(1) || 'New'}
                </Text>
              </View>
              <Text style={styles.contractorReview}>
                {contractor.reviews?.[0]?.comment ||
                  'No reviews yet'}
              </Text>
              <View style={styles.contractorActions}>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() =>
                    onMessagePress({
                      jobId: 'previous-work',
                      jobTitle: 'Previous Work',
                      otherUserId: contractor.id,
                      otherUserName:
                        `${contractor.firstName || ''} ${contractor.lastName || ''}`.trim(),
                    })
                  }
                >
                  <Ionicons
                    name='chatbubble'
                    size={12}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rehireButton}
                  onPress={() =>
                    onRehirePress({
                      preferredContractorId: contractor.id,
                    })
                  }
                >
                  <Text style={styles.rehireButtonText}>Rehire</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          // Show placeholder when no previous contractors
          <View style={styles.contractorCard}>
            <View style={styles.emptyContractorState}>
              <Ionicons
                name='hammer-outline'
                size={32}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyContractorText}>
                No previous contractors yet
              </Text>
              <Text style={styles.emptyContractorSubtext}>
                Complete your first job to see contractors here
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  contractorsScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  contractorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 260,
    ...theme.shadows.base,
  },
  contractorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  contractorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  contractorSpecialty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  contractorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorRatingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  contractorReview: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  contractorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  messageButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  rehireButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rehireButtonText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyContractorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyContractorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyContractorSubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
