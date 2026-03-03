import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { styles } from './contractorCardStyles';
import SwipeableCardWrapper from './SwipeableCardWrapper';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '@mintenance/types';
import { theme } from '../theme';
import ConnectButton from './ConnectButton';

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
                <View
                  style={styles.starsContainer}
                  accessibilityLabel={`Rated ${(contractor.rating || 0).toFixed(1)} out of 5 stars`}
                  accessibilityRole="text"
                >
                  {renderStars(contractor.rating || 0)}
                </View>
                <Text style={styles.ratingText}>
                  {(contractor.rating || 0).toFixed(1)} (
                  {contractor.totalJobsCompleted || contractor.total_jobs_completed || 0} jobs)
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
                <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>${contractor.hourlyRate}/hr</Text>
              </View>
            )}

            {contractor.yearsExperience && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>{contractor.yearsExperience} years exp</Text>
              </View>
            )}

            {contractor.availability && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>
                  {contractor.availability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            )}

            {contractor.businessAddress && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
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
              <Ionicons name='location-outline' size={16} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>{contractor.address}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => setShowDetails(!showDetails)}
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Show less details' : 'View reviews'}
          >
            <Text style={styles.detailsButtonText}>
              {showDetails ? 'Show Less' : 'View Reviews'}
            </Text>
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.textPrimary}
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
      <SwipeableCardWrapper
        cards={cards}
        cardIndex={0}
        backgroundColor='transparent'
        stackSize={1}
        animateOverlayLabelsOpacity
        animateCardOpacity
        onSwipedLeft={onPass}
        onSwipedRight={onLike}
        overlayLabels={{
          left: {
            title: 'PASS',
            style: {
              label: {
                backgroundColor: theme.colors.error,
                color: 'white',
                fontSize: 24,
                fontWeight: '700',
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
                backgroundColor: theme.colors.success,
                color: 'white',
                fontSize: 24,
                fontWeight: '700',
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
      />

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.passButton} onPress={onPass} accessibilityRole="button" accessibilityLabel="Pass on this contractor">
          <Ionicons name='close' size={30} color={theme.colors.error} />
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

        <TouchableOpacity style={styles.likeButton} onPress={onLike} accessibilityRole="button" accessibilityLabel="Like this contractor">
          <Ionicons name='leaf' size={30} color={theme.colors.success} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ContractorCard;
