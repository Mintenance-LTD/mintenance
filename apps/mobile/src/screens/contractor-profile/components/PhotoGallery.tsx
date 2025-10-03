/**
 * PhotoGallery Component
 * 
 * 2-column grid photo gallery with add button.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - Photo display
 */

import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

const { width } = Dimensions.get('window');

interface PhotoGalleryProps {
  photos: string[];
  onAddPhoto: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onAddPhoto,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddPhoto}>
          <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.addText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoItem} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoItem: {
    width: (width - 56) / 2,
    height: 160,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
});
