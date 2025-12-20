/**
 * SpecialOffersCarousel Component
 * 
 * Horizontal carousel displaying special offers with pagination.
 * 
 * @filesize Target: <120 lines
 * @compliance Single Responsibility - Offers display
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, StyleSheet } from 'react-native';
import { theme } from '../../../theme';
import type { SpecialOffer } from '../viewmodels/EnhancedHomeViewModel';

const { width } = Dimensions.get('window');

interface SpecialOffersCarouselProps {
  offers: SpecialOffer[];
  onOfferClaim: (offerId: string) => void;
}

export const SpecialOffersCarousel: React.FC<SpecialOffersCarouselProps> = ({
  offers,
  onOfferClaim,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewRef = React.useRef((viewableItems: any) => {
    if (viewableItems.viewableItems.length > 0) {
      setCurrentIndex(viewableItems.viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const renderOffer = ({ item }: { item: SpecialOffer }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerBadge}>
        <Text style={styles.offerBadgeText}>{item.badge}</Text>
      </View>
      <Text style={styles.offerTitle}>{item.title}</Text>
      <View style={styles.discountContainer}>
        <Text style={styles.discountText}>Up to</Text>
        <Text style={styles.discountValue}>{item.discount}</Text>
      </View>
      <Text style={styles.offerDescription}>{item.description}</Text>
      <TouchableOpacity
        style={styles.claimButton}
        onPress={() => onOfferClaim(item.id)}
      >
        <Text style={styles.claimButtonText}>Claim Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
      />
      <View style={styles.pagination}>
        {offers.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.lg,
  },
  offerCard: {
    width: width - 60,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginHorizontal: theme.spacing.md,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    marginBottom: theme.spacing.md,
  },
  offerBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  offerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  discountText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.white,
    marginRight: theme.spacing.sm,
  },
  discountValue: {
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
    lineHeight: 48,
  },
  offerDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverseMuted,
    marginBottom: theme.spacing.lg,
  },
  claimButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.base,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.borderLight,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
});
