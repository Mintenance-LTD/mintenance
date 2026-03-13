import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ServiceAreasActions: React.FC = () => {
  return (
    <View style={styles.actionsContainer}>
      <Text style={styles.actionsTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Coming Soon', 'Service area analytics coming soon.')}
      >
        <Ionicons
          name='analytics'
          size={24}
          color="#717171"
        />
        <Text style={styles.actionButtonText}>View Analytics</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Coming Soon', 'Route optimisation features will be available in the next update.')}
      >
        <Ionicons name='map' size={24} color="#717171" />
        <Text style={styles.actionButtonText}>Route Planning</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert('Coming Soon', 'Coverage map coming soon.')}
      >
        <Ionicons
          name='location'
          size={24}
          color="#717171"
        />
        <Text style={styles.actionButtonText}>Coverage Map</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
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
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#222222',
    marginLeft: 12,
    fontWeight: '500',
  },
});
