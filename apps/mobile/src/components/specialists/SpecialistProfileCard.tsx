import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';

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
            <Text style={styles.listSpecTitle}>{specialist.title}</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  basicInfo: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    color: '#717171',
    fontWeight: '500',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  reviewText: {
    fontSize: 13,
    color: '#717171',
  },
  location: {
    fontSize: 13,
    color: '#717171',
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#717171',
    marginBottom: 6,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },
  priceUnit: {
    fontSize: 13,
    color: '#717171',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginVertical: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#717171',
  },
  availabilitySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 16,
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F7F7F7',
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  availabilityText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
  },
  availableText: {
    color: '#10B981',
  },
  specialtiesSection: {
    marginBottom: 20,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyBadge: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  specialtyText: {
    fontSize: 13,
    color: '#222222',
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 24,
  },
  bioText: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#222222',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#222222',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Compact Styles
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatarContainer: {
    position: 'relative',
    marginRight: 16,
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
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  compactTitle: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 6,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRating: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactProjects: {
    fontSize: 13,
    color: '#717171',
  },
  compactActions: {
    alignItems: 'flex-end',
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  compactBookButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  compactBookText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // List Styles
  listContainer: {
    marginVertical: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },
  seeAllText: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '600',
  },
  listCard: {
    width: 120,
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 8,
  },
  listAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  listAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  listOnlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
    marginBottom: 6,
  },
  listSpecTitle: {
    fontSize: 13,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 6,
  },
  listRating: {
    marginTop: 6,
  },
  listRatingText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
