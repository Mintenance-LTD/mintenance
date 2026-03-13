import React from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContractorMarkerProps {
  contractor: {
    id: string;
    verified: boolean;
  };
  isSelected: boolean;
  onPress: () => void;
}

export const ContractorMarker: React.FC<ContractorMarkerProps> = ({
  contractor,
  isSelected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.markerContainer,
        isSelected && styles.selectedMarker,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Contractor marker${contractor.verified ? ', verified' : ''}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.marker}>
        <Ionicons
          name='person'
          size={20}
          color={
            isSelected
              ? '#FFFFFF'
              : '#222222'
          }
        />
      </View>
      {contractor.verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name='checkmark' size={8} color='#FFFFFF' />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = {
  markerContainer: {
    alignItems: 'center' as const,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#222222',
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
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
    backgroundColor: '#222222',
  },
  verifiedBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#222222',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
};
