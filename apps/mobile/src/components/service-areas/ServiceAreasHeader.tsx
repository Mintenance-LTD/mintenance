import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';

interface ServiceAreasHeaderProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ServiceAreas'>;
  onAddPress: () => void;
}

export const ServiceAreasHeader: React.FC<ServiceAreasHeaderProps> = ({
  navigation,
  onAddPress,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name='arrow-back'
          size={24}
          color="#222222"
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Service Areas</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddPress}
        accessibilityLabel="Add service area"
      >
        <Ionicons name='add' size={24} color="#222222" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  addButton: {
    padding: 8,
  },
});
