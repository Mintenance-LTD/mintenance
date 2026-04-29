/**
 * PhotoGallery — Horizontal portfolio cards
 *
 * Horizontal scroll of project cards with cover image placeholders,
 * project names, and photo counts.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

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

  if (projects.length === 0) {
    projects.push([]);
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
          <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {projects.map((project, index) => (
          <TouchableOpacity key={index} style={styles.projectCard} activeOpacity={0.9}>
            <View style={styles.coverImage}>
              {project[0] ? (
                <Image
                  source={{ uri: project[0] }}
                  style={styles.coverPhoto}
                  resizeMode='cover'
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.emptyCover}>
                  <Ionicons
                    name="image-outline"
                    size={32}
                    color={theme.colors.textTertiary}
                  />
                  <Text style={styles.emptyCoverText}>No photos yet</Text>
                </View>
              )}
              {index === 0 && project.length > 0 && (
                <View style={styles.beforeAfterBadge}>
                  <Text style={styles.beforeAfterText}>Before/After</Text>
                </View>
              )}
            </View>

            {/* Project info */}
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project.length > 0 ? `Project ${index + 1}` : 'Portfolio'}
              </Text>
              <View style={styles.photoCountRow}>
                <Ionicons name="camera-outline" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.photoCountText}>
                  {project.length} {project.length === 1 ? 'photo' : 'photos'}
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
    color: theme.colors.textPrimary,
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
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  projectCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  emptyCover: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCoverText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  beforeAfterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  beforeAfterText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  projectInfo: {
    padding: 12,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  photoCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
