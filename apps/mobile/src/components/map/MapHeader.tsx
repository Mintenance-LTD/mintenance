import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Input';
import { theme } from '../../theme';

interface MapHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBackPress: () => void;
  onFilterPress: () => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onBackPress,
  onFilterPress,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress}>
        <Ionicons
          name='arrow-back'
          size={24}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>

      <Input
        placeholder='Search Salon, Specialist...'
        value={searchQuery}
        onChangeText={onSearchChange}
        leftIcon='search'
        variant='filled'
        size='md'
        containerStyle={styles.searchContainer}
      />

      <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
        <Ionicons
          name='options-outline'
          size={20}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
