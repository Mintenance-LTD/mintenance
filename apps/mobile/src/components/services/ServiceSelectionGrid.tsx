import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2; // 2 columns with margins

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  isPopular?: boolean;
}

interface ServiceSelectionGridProps {
  title: string;
  subtitle?: string;
  services: ServiceCategory[];
  onServiceSelect: (service: ServiceCategory) => void;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}

export const ServiceSelectionGrid: React.FC<ServiceSelectionGridProps> = ({
  title,
  subtitle,
  services,
  onServiceSelect,
  showSeeAll = false,
  onSeeAll,
}) => {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {showSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Services Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        <View style={styles.gridContainer}>
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => onServiceSelect(service)}
              style={
                [
                  styles.serviceCard,
                  index % 2 === 0 ? styles.leftCard : styles.rightCard,
                ] as object
              }
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

interface ServiceCardProps {
  service: ServiceCategory;
  onPress: () => void;
  style?: import('react-native').ViewStyle;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      {service.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}

      <View
        style={[
          styles.iconContainer,
          { backgroundColor: service.color + '20' },
        ]}
      >
        <Text style={[styles.icon, { color: service.color }]}>
          {service.icon}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {service.description}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.selectButton}>
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Special offers component inspired by the beauty salon's discount cards
const SpecialOffersSection: React.FC<{
  offers: {
    id: string;
    title: string;
    description: string;
    discount: string;
    validUntil: string;
    image: string;
  }[];
  onOfferSelect: (id: string) => void;
}> = ({ offers, onOfferSelect }) => {
  return (
    <View style={styles.offersContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Special Offers</Text>
        <Text style={styles.subtitle}>Limited time deals</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {offers.map((offer) => (
          <TouchableOpacity
            key={offer.id}
            style={styles.offerCard}
            onPress={() => onOfferSelect(offer.id)}
          >
            <View style={styles.offerContent}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>Up to</Text>
                <Text style={styles.discountValue}>{offer.discount}</Text>
              </View>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDescription}>{offer.description}</Text>
              <Text style={styles.validUntil}>
                Valid until {offer.validUntil}
              </Text>
            </View>
            <TouchableOpacity style={styles.claimButton}>
              <Text style={styles.claimButtonText}>Claim</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  seeAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  scrollView: {
    marginLeft: 20,
  },
  scrollContainer: {
    paddingRight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: cardWidth * 2 + 16,
  },
  serviceCard: {
    width: cardWidth,
    marginBottom: 16,
  },
  leftCard: {
    marginRight: 16,
  },
  rightCard: {
    marginLeft: 0,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 13 * 1.4,
  },
  cardFooter: {
    alignItems: 'flex-start',
  },
  selectButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },

  // Special Offers Styles
  offersContainer: {
    marginVertical: 20,
  },
  offerCard: {
    width: screenWidth * 0.8,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerContent: {
    flex: 1,
    marginRight: 16,
  },
  discountBadge: {
    marginBottom: 8,
  },
  discountText: {
    fontSize: 13,
    color: theme.colors.textInverse,
    opacity: 0.8,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
    marginBottom: 6,
  },
  offerDescription: {
    fontSize: 13,
    color: theme.colors.textInverse,
    opacity: 0.9,
    marginBottom: 8,
  },
  validUntil: {
    fontSize: 12,
    color: theme.colors.textInverse,
    opacity: 0.7,
  },
  claimButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
