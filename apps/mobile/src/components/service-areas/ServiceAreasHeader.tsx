import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ServiceAreasHeaderProps {
  navigation: StackNavigationProp<Record<string, undefined>>;
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
          color={theme.colors.textInverse}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Service Areas</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateServiceArea')}
      >
        <Ionicons name='add' size={24} color={theme.colors.textInverse} />
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
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  addButton: {
    padding: 8,
  },
});
