/**
 * PhotoGallery — Horizontal portfolio cards
 *
 * Horizontal scroll of project cards with cover image placeholders,
 * project names, and photo counts.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_WIDTH = Dimensions.get('window').width * 0.6;

interface PhotoGalleryProps {
  photos: string[];
  onAddPhoto: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onAddPhoto,
}) => {
  // Group photos into "projects" (chunks of 3-4)
  const projects = [];
  for (let i = 0; i < photos.length; i += 3) {
    projects.push(photos.slice(i, i + 3));
  }

  // Add placeholder projects if few photos
  if (projects.length === 0) {
    projects.push([], [], []);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Portfolio</Text>
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={onAddPhoto}
          accessibilityRole="button"
          accessibilityLabel="See all photos"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="arrow-forward" size={14} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {projects.map((project, index) => (
          <TouchableOpacity key={index} style={styles.projectCard} activeOpacity={0.9}>
            {/* Cover image placeholder */}
            <View style={styles.coverImage}>
              <Ionicons name="image-outline" size={32} color="#B0B0B0" />
              {index === 0 && project.length > 0 && (
                <View style={styles.beforeAfterBadge}>
                  <Text style={styles.beforeAfterText}>Before/After</Text>
                </View>
              )}
            </View>

            {/* Project info */}
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {index === 0 ? 'Bathroom Renovation' : index === 1 ? 'Kitchen Remodel' : `Project ${index + 1}`}
              </Text>
              <View style={styles.photoCountRow}>
                <Ionicons name="camera-outline" size={12} color="#717171" />
                <Text style={styles.photoCountText}>
                  {project.length || (3 + index)} photos
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  projectCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  coverImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beforeAfterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#222222',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  beforeAfterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  projectInfo: {
    padding: 12,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  photoCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: '#717171',
  },
});
