import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../theme';

interface ServiceAreasActionsProps {
  navigation: StackNavigationProp<any>;
}

export const ServiceAreasActions: React.FC<ServiceAreasActionsProps> = ({ navigation }) => {
  return (
    <View style={styles.actionsContainer}>
      <Text style={styles.actionsTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('ServiceAreaAnalytics')}
      >
        <Ionicons
          name='analytics'
          size={24}
          color={theme.colors.primary}
        />
        <Text style={styles.actionButtonText}>View Analytics</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Coming Soon', 'Route optimisation features will be available in the next update.')}
      >
        <Ionicons name='map' size={24} color={theme.colors.primary} />
        <Text style={styles.actionButtonText}>Route Planning</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('CoverageMap')}
      >
        <Ionicons
          name='location'
          size={24}
          color={theme.colors.primary}
        />
        <Text style={styles.actionButtonText}>Coverage Map</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 32,
    ...theme.shadows.base,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
});
