import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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
              style={[
                styles.serviceCard,
                index % 2 === 0 ? styles.leftCard : styles.rightCard,
              ]}
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
  style?: any;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      {service.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}

      <View style={[styles.iconContainer, { backgroundColor: service.color + '20' }]}>
        <Text style={[styles.icon, { color: service.color }]}>{service.icon}</Text>
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
export const SpecialOffersSection: React.FC<{
  offers: Array<{
    id: string;
    title: string;
    description: string;
    discount: string;
    validUntil: string;
    image: string;
  }>;
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
              <Text style={styles.validUntil}>Valid until {offer.validUntil}</Text>
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
    marginVertical: theme.spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  seeAllButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  scrollView: {
    marginLeft: theme.spacing.lg,
  },
  scrollContainer: {
    paddingRight: theme.spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: cardWidth * 2 + theme.spacing.md,
  },
  serviceCard: {
    width: cardWidth,
    marginBottom: theme.spacing.md,
  },
  leftCard: {
    marginRight: theme.spacing.md,
  },
  rightCard: {
    marginLeft: 0,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.base,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  popularText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  serviceDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.normal * theme.typography.fontSize.sm,
  },
  cardFooter: {
    alignItems: 'flex-start',
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  selectButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },

  // Special Offers Styles
  offersContainer: {
    marginVertical: theme.spacing.lg,
  },
  offerCard: {
    width: screenWidth * 0.8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  discountBadge: {
    marginBottom: theme.spacing.sm,
  },
  discountText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.8,
  },
  discountValue: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
  },
  offerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  offerDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
    marginBottom: theme.spacing.sm,
  },
  validUntil: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.white,
    opacity: 0.7,
  },
  claimButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  claimButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
});