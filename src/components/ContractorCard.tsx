import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '../types';
import { theme } from '../theme';
import ConnectButton from './ConnectButton';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  contractor: ContractorProfile;
  currentUserId?: string;
  onLike: () => void;
  onPass: () => void;
}

const ContractorCard: React.FC<Props> = ({ contractor, currentUserId, onLike, onPass }) => {
  const [showDetails, setShowDetails] = useState(false);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons
          key={i}
          name='star'
          size={16}
          color={theme.colors.ratingGold}
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons
          key='half'
          name='star-half'
          size={16}
          color={theme.colors.ratingGold}
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name='star-outline'
          size={16}
          color={theme.colors.ratingGold}
        />
      );
    }

    return stars;
  };

  const cards = [
    // Main profile card
    {
      type: 'profile',
      content: (
        <View style={styles.cardContent}>
          {/* Company Logo Header */}
          {contractor.companyLogo && (
            <View style={styles.companyLogoContainer}>
              <Image
                source={{ uri: contractor.companyLogo }}
                style={styles.companyLogo}
              />
            </View>
          )}

          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {contractor.profileImageUrl ? (
                <Image
                  source={{ uri: contractor.profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons
                    name='person'
                    size={50}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              {/* Company Name or Personal Name */}
              <Text style={styles.contractorName}>
                {contractor.companyName || `${contractor.firstName} ${contractor.lastName}`}
              </Text>

              {/* Personal name if company name is shown */}
              {contractor.companyName && (
                <Text style={styles.personalName}>
                  {contractor.firstName} {contractor.lastName}
                </Text>
              )}

              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {renderStars(contractor.rating || 0)}
                </View>
                <Text style={styles.ratingText}>
                  {(contractor.rating || 0).toFixed(1)} (
                  {contractor.totalJobsCompleted} jobs)
                </Text>
              </View>

              {contractor.distance && (
                <Text style={styles.distanceText}>
                  📍 {contractor.distance.toFixed(1)} km away
                </Text>
              )}
            </View>
          </View>

          {contractor.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{contractor.bio}</Text>
            </View>
          )}

          {/* Enhanced Profile Information */}
          <View style={styles.detailsGrid}>
            {contractor.hourlyRate && (
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.detailText}>${contractor.hourlyRate}/hr</Text>
              </View>
            )}

            {contractor.yearsExperience && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.detailText}>{contractor.yearsExperience} years exp</Text>
              </View>
            )}

            {contractor.availability && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.detailText}>
                  {contractor.availability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            )}

            {contractor.businessAddress && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {contractor.businessAddress}
                </Text>
              </View>
            )}
          </View>

          {contractor.skills && contractor.skills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={styles.skillsTitle}>Specialties</Text>
              <View style={styles.skillsContainer}>
                {contractor.skills.slice(0, 4).map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill.skillName}</Text>
                  </View>
                ))}
                {contractor.skills.length > 4 && (
                  <View style={styles.skillTag}>
                    <Text style={styles.skillText}>
                      +{contractor.skills.length - 4} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {contractor.address && (
            <View style={styles.locationSection}>
              <Ionicons name='location-outline' size={16} color='#666' />
              <Text style={styles.locationText}>{contractor.address}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.detailsButtonText}>
              {showDetails ? 'Show Less' : 'View Reviews'}
            </Text>
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.info}
            />
          </TouchableOpacity>

          {showDetails &&
            contractor.reviews &&
            contractor.reviews.length > 0 && (
              <View style={styles.reviewsSection}>
                <Text style={styles.reviewsTitle}>Recent Reviews</Text>
                <ScrollView style={styles.reviewsContainer} nestedScrollEnabled>
                  {contractor.reviews.slice(0, 3).map((review, index) => (
                    <View key={index} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.starsContainer}>
                          {renderStars(review.rating)}
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment}>
                          {review.comment}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
        </View>
      ),
    },

    // Portfolio card (if portfolio images exist)
    ...(contractor.portfolioImages && contractor.portfolioImages.length > 0 ? [{
      type: 'portfolio',
      content: (
        <View style={styles.cardContent}>
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioTitle}>Previous Work</Text>
            <Text style={styles.portfolioSubtitle}>Swipe through project photos</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.portfolioScroll}
            pagingEnabled
          >
            {contractor.portfolioImages.map((imageUri, index) => (
              <View key={index} style={styles.portfolioImageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.portfolioImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          {contractor.specialties && contractor.specialties.length > 0 && (
            <View style={styles.portfolioSpecialties}>
              <Text style={styles.specialtiesTitle}>Specialties</Text>
              <View style={styles.specialtiesContainer}>
                {contractor.specialties.slice(0, 6).map((specialty, index) => (
                  <View key={index} style={styles.specialtyTag}>
                    <Text style={styles.specialtyText}>{specialty}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ),
    }] : []),
  ];

  return (
    <View style={styles.container}>
      <Swiper
        cards={cards}
        cardIndex={0}
        backgroundColor='transparent'
        stackSize={1}
        stackSeparation={0}
        animateOverlayLabelsOpacity
        animateCardOpacity
        disableTopSwipe
        disableBottomSwipe
        onSwipedLeft={onPass}
        onSwipedRight={onLike}
        overlayLabels={{
          left: {
            title: 'PASS',
            style: {
              label: {
                backgroundColor: '#FF3B30',
                color: 'white',
                fontSize: 24,
                fontWeight: 'bold',
                borderRadius: 8,
                padding: 10,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: -30,
              },
            },
          },
          right: {
            title: 'LIKE',
            style: {
              label: {
                backgroundColor: '#4CD964',
                color: 'white',
                fontSize: 24,
                fontWeight: 'bold',
                borderRadius: 8,
                padding: 10,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: 30,
              },
            },
          },
        }}
        renderCard={(card) => <View style={styles.card}>{card?.content}</View>}
        cardStyle={styles.cardStyle}
      />

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.passButton} onPress={onPass}>
          <Ionicons name='close' size={30} color='#FF3B30' />
        </TouchableOpacity>

        {currentUserId && (
          <ConnectButton
            currentUserId={currentUserId}
            targetUserId={contractor.id}
            targetUserName={`${contractor.firstName || contractor.first_name} ${contractor.lastName || contractor.last_name}`}
            targetUserRole="contractor"
            size="medium"
            style={styles.connectButton}
          />
        )}

        <TouchableOpacity style={styles.likeButton} onPress={onLike}>
          <Ionicons name='leaf' size={30} color='#4CD964' />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardStyle: {
    top: 0,
    left: 0,
    bottom: 80,
    right: 0,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contractorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  distanceText: {
    fontSize: 14,
    color: theme.colors.info,
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  skillsSection: {
    marginBottom: 20,
  },
  skillsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: theme.colors.info,
    fontWeight: '500',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginBottom: 10,
  },
  detailsButtonText: {
    fontSize: 16,
    color: theme.colors.info,
    fontWeight: '500',
    marginRight: 5,
  },
  reviewsSection: {
    marginTop: 10,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  reviewsContainer: {
    maxHeight: 200,
  },
  reviewCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  passButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: '#4CD964',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Enhanced profile styles
  companyLogoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  personalName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 8,
    minWidth: '45%',
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  // Portfolio styles
  portfolioHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  portfolioTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  portfolioSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  portfolioScroll: {
    marginBottom: 20,
  },
  portfolioImageContainer: {
    width: screenWidth - 80,
    marginRight: 10,
  },
  portfolioImage: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.lg,
  },
  portfolioSpecialties: {
    marginTop: 10,
  },
  specialtiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  specialtyText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '500',
  },
  connectButton: {
    marginHorizontal: 10,
  },
});

export default ContractorCard;
