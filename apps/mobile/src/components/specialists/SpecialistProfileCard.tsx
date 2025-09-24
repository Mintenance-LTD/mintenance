import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');

interface Specialist {
  id: string;
  name: string;
  title: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  experience: string;
  hourlyRate: number;
  responseTime: string;
  completedProjects: number;
  isOnline: boolean;
  location: string;
  bio: string;
  certifications: string[];
  availability: {
    today: boolean;
    thisWeek: boolean;
    emergency: boolean;
  };
}

interface SpecialistProfileCardProps {
  specialist: Specialist;
  onContact: () => void;
  onBookAppointment: () => void;
  onViewPortfolio: () => void;
  compact?: boolean;
}

export const SpecialistProfileCard: React.FC<SpecialistProfileCardProps> = ({
  specialist,
  onContact,
  onBookAppointment,
  onViewPortfolio,
  compact = false,
}) => {
  if (compact) {
    return (
      <CompactSpecialistCard
        specialist={specialist}
        onContact={onContact}
        onBookAppointment={onBookAppointment}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Avatar and Basic Info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
          {specialist.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.basicInfo}>
          <Text style={styles.name}>{specialist.name}</Text>
          <Text style={styles.title}>{specialist.title}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {specialist.rating}</Text>
            <Text style={styles.reviewText}>({specialist.reviewCount} reviews)</Text>
          </View>
          <Text style={styles.location}>📍 {specialist.location}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.price}>${specialist.hourlyRate}</Text>
          <Text style={styles.priceUnit}>/hour</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <StatItem
          icon="📋"
          value={specialist.completedProjects.toString()}
          label="Projects"
        />
        <StatItem
          icon="⚡"
          value={specialist.responseTime}
          label="Response"
        />
        <StatItem
          icon="🏆"
          value={specialist.experience}
          label="Experience"
        />
      </View>

      {/* Availability Section */}
      <View style={styles.availabilitySection}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.availabilityRow}>
          <AvailabilityBadge
            label="Today"
            available={specialist.availability.today}
          />
          <AvailabilityBadge
            label="This Week"
            available={specialist.availability.thisWeek}
          />
          <AvailabilityBadge
            label="Emergency"
            available={specialist.availability.emergency}
          />
        </View>
      </View>

      {/* Specialties */}
      <View style={styles.specialtiesSection}>
        <Text style={styles.sectionTitle}>Specialties</Text>
        <View style={styles.specialtiesContainer}>
          {specialist.specialties.map((specialty, index) => (
            <View key={index} style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bio */}
      <View style={styles.bioSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bioText} numberOfLines={3}>
          {specialist.bio}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onViewPortfolio}>
          <Text style={styles.secondaryButtonText}>View Portfolio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} onPress={onContact}>
          <Text style={styles.contactButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={onBookAppointment}>
          <Text style={styles.primaryButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Compact version for lists
const CompactSpecialistCard: React.FC<{
  specialist: Specialist;
  onContact: () => void;
  onBookAppointment: () => void;
}> = ({ specialist, onContact, onBookAppointment }) => {
  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactHeader}>
        <View style={styles.compactAvatarContainer}>
          <Image source={{ uri: specialist.avatar }} style={styles.compactAvatar} />
          {specialist.isOnline && <View style={styles.compactOnlineIndicator} />}
        </View>

        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{specialist.name}</Text>
          <Text style={styles.compactTitle}>{specialist.title}</Text>
          <View style={styles.compactMeta}>
            <Text style={styles.compactRating}>⭐ {specialist.rating}</Text>
            <Text style={styles.compactProjects}>
              • {specialist.completedProjects} projects
            </Text>
          </View>
        </View>

        <View style={styles.compactActions}>
          <Text style={styles.compactPrice}>${specialist.hourlyRate}/hr</Text>
          <TouchableOpacity style={styles.compactBookButton} onPress={onBookAppointment}>
            <Text style={styles.compactBookText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Helper Components
const StatItem: React.FC<{ icon: string; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AvailabilityBadge: React.FC<{ label: string; available: boolean }> = ({
  label,
  available,
}) => (
  <View style={[styles.availabilityBadge, available && styles.availableBadge]}>
    <Text style={[styles.availabilityText, available && styles.availableText]}>
      {label}
    </Text>
  </View>
);

// Specialist List Component inspired by the beauty salon's specialist grid
export const SpecialistsList: React.FC<{
  specialists: Specialist[];
  onSpecialistSelect: (specialist: Specialist) => void;
  title?: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}> = ({ specialists, onSpecialistSelect, title = "Top Specialists", showSeeAll, onSeeAll }) => {
  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{title}</Text>
        {showSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {specialists.map((specialist) => (
          <TouchableOpacity
            key={specialist.id}
            style={styles.listCard}
            onPress={() => onSpecialistSelect(specialist)}
          >
            <View style={styles.listAvatarContainer}>
              <Image source={{ uri: specialist.avatar }} style={styles.listAvatar} />
              {specialist.isOnline && <View style={styles.listOnlineIndicator} />}
            </View>
            <Text style={styles.listName}>{specialist.name}</Text>
            <Text style={styles.listTitle}>{specialist.title}</Text>
            <View style={styles.listRating}>
              <Text style={styles.listRatingText}>⭐ {specialist.rating}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.colors.secondary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  basicInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  name: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.secondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  ratingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginRight: theme.spacing.xs,
  },
  reviewText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  location: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  price: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  priceUnit: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  availabilitySection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  availabilityBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  availableBadge: {
    backgroundColor: theme.colors.secondary + '20',
    borderColor: theme.colors.secondary,
  },
  availabilityText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  availableText: {
    color: theme.colors.secondary,
  },
  specialtiesSection: {
    marginBottom: theme.spacing.lg,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  specialtyBadge: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  specialtyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bioSection: {
    marginBottom: theme.spacing.xl,
  },
  bioText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  contactButton: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },

  // Compact Styles
  compactContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.base,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  compactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  compactOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  compactTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRating: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  compactProjects: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  compactActions: {
    alignItems: 'flex-end',
  },
  compactPrice: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  compactBookButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  compactBookText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },

  // List Styles
  listContainer: {
    marginVertical: theme.spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  listTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  listCard: {
    width: 120,
    alignItems: 'center',
    marginLeft: theme.spacing.lg,
    marginRight: theme.spacing.sm,
  },
  listAvatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  listAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  listOnlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  listName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  listRating: {
    marginTop: theme.spacing.xs,
  },
  listRatingText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
});