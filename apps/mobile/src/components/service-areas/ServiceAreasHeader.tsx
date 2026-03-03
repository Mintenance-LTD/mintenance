import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ServiceAreasHeaderProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
}

export const ServiceAreasHeader: React.FC<ServiceAreasHeaderProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons
          name='arrow-back'
          size={24}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Service Areas</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => Alert.alert('Coming Soon', 'Service area creation coming soon.')}
      >
        <Ionicons name='add' size={24} color={theme.colors.textPrimary} />
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  addButton: {
    padding: 8,
  },
});

