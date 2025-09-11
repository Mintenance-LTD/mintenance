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

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  contractor: ContractorProfile;
  onLike: () => void;
  onPass: () => void;
}

const ContractorCard: React.FC<Props> = ({ contractor, onLike, onPass }) => {
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
              <Text style={styles.contractorName}>
                {contractor.firstName} {contractor.lastName}
              </Text>

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
});

export default ContractorCard;
