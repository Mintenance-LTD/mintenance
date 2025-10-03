/**
 * JobImagesGallery Component
 * 
 * Displays job photos in a scrollable gallery.
 * 
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Image gallery display
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { Job } from '../../../types';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 48) / 2; // 2 images per row with padding

interface JobImagesGalleryProps {
  job: Job;
}

export const JobImagesGallery: React.FC<JobImagesGalleryProps> = ({ job }) => {
  if (!job.photos || job.photos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="images-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.title}>Job Photos</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>No photos uploaded</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Job Photos ({job.photos.length})</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContainer}
      >
        {job.photos.map((photo, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image 
              source={{ uri: photo.url }} 
              style={styles.image}
              resizeMode="cover"
            />
            {photo.description && (
              <View style={styles.imageOverlay}>
                <Text style={styles.imageDescription} numberOfLines={2}>
                  {photo.description}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  galleryContainer: {
    paddingRight: theme.spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceTertiary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  imageDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
