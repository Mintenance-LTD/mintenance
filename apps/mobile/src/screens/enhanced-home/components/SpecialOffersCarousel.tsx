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

  const onViewRef = React.useRef((info: { viewableItems: Array<{ index: number | null }> }) => {
    if (info.viewableItems.length > 0) {
      setCurrentIndex(info.viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const renderOffer = ({ item }: { item: SpecialOffer }) => (
    <View
      style={styles.offerCard}
      accessibilityLabel={`${item.badge}: ${item.title}. Up to ${item.discount} off. ${item.description}`}
    >
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
        accessibilityRole='button'
        accessibilityLabel={`Claim ${item.title} offer`}
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
    marginVertical: 16,
  },
  offerCard: {
    width: width - 60,
    backgroundColor: '#222222',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 14,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  offerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  discountText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  discountValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 48,
  },
  offerDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EBEBEB',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#222222',
  },
});
