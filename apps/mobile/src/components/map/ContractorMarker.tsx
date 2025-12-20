import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

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
    <View
      style={[
        styles.markerContainer,
        isSelected && styles.selectedMarker,
      ]}
      onTouchEnd={onPress}
    >
      <View style={styles.marker}>
        <Ionicons
          name='person'
          size={20}
          color={
            isSelected
              ? theme.colors.white
              : theme.colors.primary
          }
        />
      </View>
      {contractor.verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name='checkmark' size={8} color={theme.colors.white} />
        </View>
      )}
    </View>
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
    backgroundColor: theme.colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.base,
  },
  selectedMarker: {
    transform: [{ scale: 1.2 }],
    backgroundColor: theme.colors.primary,
  },
  verifiedBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
};
