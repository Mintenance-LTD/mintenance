import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 32;

interface ContractorDiscoveryCardProps {
  contractor: {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
    distance: string;
    avatar: string;
    coverImage: string;
    skills: string[];
    isAvailable: boolean;
    responseTime: string;
  };
  onBookAppointment: () => void;
  onViewProfile: () => void;
}

export const ContractorDiscoveryCard: React.FC<ContractorDiscoveryCardProps> = ({
  contractor,
  onBookAppointment,
  onViewProfile,
}) => {
  return (
    <View style={styles.container}>
      {/* Cover Image with Overlay */}
      <View style={styles.coverContainer}>
        <Image source={{ uri: contractor.coverImage }} style={styles.coverImage} />
        <View style={styles.coverOverlay}>
          {contractor.isAvailable && (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>Available Now</Text>
            </View>
          )}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {contractor.rating}</Text>
            <Text style={styles.reviewText}>({contractor.reviewCount} reviews)</Text>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Header with Avatar and Info */}
        <View style={styles.headerSection}>
          <Image source={{ uri: contractor.avatar }} style={styles.avatar} />
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>{contractor.name}</Text>
            <Text style={styles.specialty}>{contractor.specialty}</Text>
            <View style={styles.metaInfo}>
              <Text style={styles.distance}>📍 {contractor.distance}</Text>
              <Text style={styles.responseTime}>⚡ {contractor.responseTime}</Text>
            </View>
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.skillsContainer}>
          {contractor.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {contractor.skills.length > 3 && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillText}>+{contractor.skills.length - 3}</Text>
            </View>
          )}
        </View>

        {/* Price and Actions */}
        <View style={styles.bottomSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>${contractor.hourlyRate}/hr</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.viewProfileButton} onPress={onViewProfile}>
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bookButton} onPress={onBookAppointment}>
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'],
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  coverContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  availabilityText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  ratingContainer: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  ratingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  reviewText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: theme.spacing.md,
    borderWidth: 3,
    borderColor: theme.colors.secondary,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  specialty: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.secondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  distance: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  responseTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  skillBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skillText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  price: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  viewProfileButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  viewProfileText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  bookButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  bookButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
});