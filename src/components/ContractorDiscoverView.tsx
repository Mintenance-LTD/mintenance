import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '../types';
import { theme } from '../theme';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;

interface Props {
  contractors: ContractorProfile[];
  onContractorSelect: (contractor: ContractorProfile) => void;
}

const ContractorDiscoverView: React.FC<Props> = ({ contractors, onContractorSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color={theme.colors.ratingGold} />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color={theme.colors.ratingGold} />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color={theme.colors.ratingGold} />
      );
    }

    return stars;
  };

  const renderContractorCard = ({ item: contractor, index }: { item: ContractorProfile; index: number }) => (
    <TouchableOpacity
      style={styles.contractorCard}
      onPress={() => onContractorSelect(contractor)}
      activeOpacity={0.95}
    >
      {/* Header with Photo and Basic Info */}
      <View style={styles.cardHeader}>
        <View style={styles.contractorImageContainer}>
          {contractor.profileImageUrl ? (
            <Image
              source={{ uri: contractor.profileImageUrl }}
              style={styles.contractorImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
            </View>
          )}
          
          {/* Verified Badge */}
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          </View>
        </View>

        <View style={styles.contractorBasicInfo}>
          <Text style={styles.contractorName}>
            {contractor.firstName} {contractor.lastName}
          </Text>
          <Text style={styles.contractorTitle}>
            {contractor.skills[0]?.skillName || 'General Contractor'}
          </Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(contractor.rating || 0)}
            </View>
            <Text style={styles.ratingText}>
              {(contractor.rating || 0).toFixed(1)} ({contractor.totalJobsCompleted} reviews)
            </Text>
          </View>

          {/* Distance and Response Time */}
          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.quickInfoText}>
                {contractor.distance?.toFixed(1)} km away
              </Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.quickInfoText}>&lt; 2h response</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>
              {contractor.rating?.toFixed(1) || '5.0'}
            </Text>
            <Text style={styles.performanceLabel}>Rating</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>
              {contractor.totalJobsCompleted || 0}
            </Text>
            <Text style={styles.performanceLabel}>Jobs Completed</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>98%</Text>
            <Text style={styles.performanceLabel}>Success Rate</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceValue}>&lt; 2h</Text>
            <Text style={styles.performanceLabel}>Avg Response</Text>
          </View>
        </View>
      </View>

      {/* Specialties */}
      {contractor.skills && contractor.skills.length > 0 && (
        <View style={styles.specialtiesSection}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.skillsContainer}>
            {contractor.skills.slice(0, 4).map((skill, skillIndex) => (
              <View key={skillIndex} style={styles.specialtyTag}>
                <Text style={styles.specialtyText}>{skill.skillName}</Text>
              </View>
            ))}
            {contractor.skills.length > 4 && (
              <View style={styles.specialtyTag}>
                <Text style={styles.specialtyText}>+{contractor.skills.length - 4} more</Text>
              </View>
            )}
          </View>
          
          {/* Featured Specialty */}
          <View style={styles.featuredSpecialty}>
            <Ionicons name="flash" size={16} color={theme.colors.warning} />
            <Text style={styles.featuredSpecialtyText}>Emergency Repairs</Text>
          </View>
        </View>
      )}

      {/* About Business */}
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About the Business</Text>
        <Text style={styles.aboutText} numberOfLines={3}>
          {contractor.bio || 
           `Licensed ${contractor.skills[0]?.skillName || 'contractor'} with ${5} years of experience. Specializing in residential and commercial projects with a focus on quality workmanship and customer satisfaction.`
          }
        </Text>
        
        <View style={styles.businessDetails}>
          <View style={styles.businessDetailItem}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
            <Text style={styles.businessDetailText}>Licensed & Insured</Text>
          </View>
          <View style={styles.businessDetailItem}>
            <Ionicons name="calendar" size={16} color={theme.colors.info} />
            <Text style={styles.businessDetailText}>Available 7 days/week</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.messageButton}>
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.info} />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.hireButton}>
          <Ionicons name="checkmark-outline" size={20} color={theme.colors.textInverse} />
          <Text style={styles.hireButtonText}>Hire Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (contractors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={50} color="#ccc" />
        <Text style={styles.emptyTitle}>No contractors found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your filters or expanding your search area.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contractors}
        renderItem={renderContractorCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / (400 + 20));
          setCurrentIndex(index);
        }}
      />
      
      {/* Scroll Indicator */}
      <View style={styles.scrollIndicator}>
        <Text style={styles.scrollText}>
          {Math.min(currentIndex + 1, contractors.length)} of {contractors.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  contractorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: CARD_WIDTH,
  },
  separator: {
    height: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  contractorImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  contractorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 2,
  },
  contractorBasicInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  contractorTitle: {
    fontSize: 16,
    color: theme.colors.info,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickInfoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  performanceSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.info,
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  specialtiesSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 14,
    color: theme.colors.info,
    fontWeight: '500',
  },
  featuredSpecialty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  featuredSpecialtyText: {
    fontSize: 14,
    color: theme.colors.warning,
    fontWeight: '600',
    marginLeft: 6,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  businessDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  businessDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessDetailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.info,
  },
  messageButtonText: {
    color: theme.colors.info,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  hireButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.info,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  hireButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ContractorDiscoverView;
