/**
 * JobImagesGallery Component
 *
 * Displays job photos in a scrollable gallery.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Image gallery display
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@mintenance/types';
import { me } from '../../../design-system/mint-editorial';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 48) / 2;

interface JobImagesGalleryProps {
  job: Job;
}

export const JobImagesGallery: React.FC<JobImagesGalleryProps> = ({ job }) => {
  if (!job.photos || job.photos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name='images-outline' size={20} color={me.ink2} />
          <Text style={styles.title}>Job Photos</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='image-outline' size={28} color={me.ink3} />
          </View>
          <Text style={styles.emptyText}>No photos uploaded</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name='images-outline' size={20} color={me.ink2} />
        <Text style={styles.title}>Job Photos ({job.photos.length})</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContainer}
      >
        {job.photos.map((photo, index) => {
          const photoUrl =
            typeof photo === 'string' ? photo : (photo as { url: string }).url;
          const photoDesc =
            typeof photo === 'string'
              ? undefined
              : (photo as { description?: string }).description;
          return (
            <View key={index} style={styles.imageContainer}>
              <Image
                source={{ uri: photoUrl }}
                style={styles.image}
                resizeMode='cover'
              />
              {photoDesc && (
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageDescription} numberOfLines={2}>
                    {photoDesc}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  galleryContainer: {
    paddingRight: 20,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: me.bg2,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 8,
  },
  imageDescription: {
    fontSize: 13,
    color: me.onBrand,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: me.ink2,
  },
});
