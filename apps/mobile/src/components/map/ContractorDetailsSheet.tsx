import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface ContractorLocation {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  address: string;
  distance: string;
  pricing: string;
  verified: boolean;
  responseTime: string;
  phone?: string;
  profileImageUrl?: string;
  skills: string[];
}

interface ContractorDetailsSheetProps {
  contractor: ContractorLocation | null;
  onClose: () => void;
  onContact: (contractor: ContractorLocation) => void;
  onCall: (contractor: ContractorLocation) => void;
  onGetDirections: (contractor: ContractorLocation) => void;
}

export const ContractorDetailsSheet: React.FC<ContractorDetailsSheetProps> = ({
  contractor,
  onClose,
  onContact,
  onCall,
  onGetDirections,
}) => {
  if (!contractor) return null;

  return (
    <View style={styles.contractorDetails}>
      <View style={styles.contractorHeader}>
        <View style={styles.contractorInfo}>
          <View style={styles.contractorNameRow}>
            <Text style={styles.contractorName}>{contractor.name}</Text>
            {contractor.verified && (
              <Ionicons
                name='checkmark-circle'
                size={16}
                color={theme.colors.secondary}
              />
            )}
          </View>
          <Text style={styles.contractorSpecialty}>
            {contractor.specialty}
          </Text>
          <View style={styles.contractorMeta}>
            <View style={styles.ratingContainer}>
              <Ionicons name='star' size={14} color='#FFD700' />
              <Text style={styles.rating}>{contractor.rating}</Text>
            </View>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.distance}>{contractor.distance}</Text>
            <Text style={styles.metaDivider}>•</Text>
            <Text style={styles.responseTime}>{contractor.responseTime}</Text>
          </View>
          <Text style={styles.contractorAddress}>{contractor.address}</Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons
            name='close'
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.contractorPricing}>
        <View style={styles.pricingInfo}>
          <Ionicons
            name='cash-outline'
            size={16}
            color={theme.colors.secondary}
          />
          <Text style={styles.pricingText}>{contractor.pricing}</Text>
        </View>
        <View style={styles.estimateInfo}>
          <Ionicons
            name='time-outline'
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.estimateText}>35 km/50min</Text>
        </View>
      </View>

      <View style={styles.contractorActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onContact(contractor)}
        >
          <Ionicons
            name='chatbubble-outline'
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onCall(contractor)}
        >
          <Ionicons
            name='call-outline'
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.directionsButton]}
          onPress={() => onGetDirections(contractor)}
        >
          <Ionicons name='navigate-outline' size={18} color={theme.colors.white} />
          <Text
            style={[styles.actionButtonText, styles.directionsButtonText]}
          >
            Directions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contractorDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...theme.shadows.lg,
  },
  contractorHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contractorSpecialty: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  contractorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  metaDivider: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  distance: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  responseTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  contractorAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  contractorPricing: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  pricingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  estimateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  contractorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  directionsButton: {
    backgroundColor: theme.colors.primary,
  },
  directionsButtonText: {
    color: theme.colors.textInverse,
  },
});
