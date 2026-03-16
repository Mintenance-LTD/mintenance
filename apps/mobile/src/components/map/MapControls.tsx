import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface MapControlsProps {
  loading: boolean;
  onMyLocationPress: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  loading,
  onMyLocationPress,
}) => {
  return (
    <>
      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={onMyLocationPress}
      >
        <Ionicons name='locate' size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Finding nearby contractors...</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
