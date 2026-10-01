/**
 * PhotoGallery — Horizontal portfolio cards
 *
 * Horizontal scroll of project cards with cover image placeholders,
 * project names, and photo counts.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

const CARD_WIDTH = Dimensions.get('window').width * 0.6;

interface PhotoGalleryProps {
  photos: string[];
  projects?: { id: string; title: string; images: string[] }[];
  onAddPhoto: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onAddPhoto,
  projects: savedProjects = [],
}) => {
  const [selected, setSelected] = useState<{
    title: string;
    images: string[];
  } | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const projects =
    savedProjects.length > 0
      ? savedProjects
      : photos.length > 0
        ? [{ id: 'other-work', title: 'Other past work', images: photos }]
        : [{ id: 'empty', title: 'Portfolio', images: [] as string[] }];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole='header'>
          Portfolio
        </Text>
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => {
            onAddPhoto?.();
            setSelected({
              title: 'Portfolio',
              images: projects.flatMap((project) => project.images),
            });
          }}
          accessibilityRole='button'
          accessibilityLabel='See all photos'
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name='arrow-forward' size={14} color={me.brand} />
        </TouchableOpacity>
      </View>

      {selected && (
        <Modal animationType='slide' onRequestClose={() => setSelected(null)}>
          <View
            style={{ flex: 1, backgroundColor: me.surface, paddingTop: 48 }}
          >
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel='Close portfolio'
              onPress={() => setSelected(null)}
              style={{ padding: 20 }}
            >
              <Text style={{ color: me.brand, fontWeight: '700' }}>
                Close portfolio
              </Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Text style={styles.title}>{selected.title}</Text>
              {selected.images.length === 0 && (
                <Text>No portfolio photos yet.</Text>
              )}
              {selected.images.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  resizeMode='contain'
                  style={{ width: '100%', height: 320 }}
                  accessibilityLabel={`${selected.title}, photo ${index + 1}`}
                />
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            activeOpacity={0.9}
            onPress={() => setSelected(project)}
            accessibilityRole='button'
            accessibilityLabel={`View ${project.title}`}
          >
            <View style={styles.coverImage}>
              {project.images[0] && !failedImages[project.id] ? (
                <Image
                  source={{ uri: project.images[0] }}
                  style={styles.coverPhoto}
                  resizeMode='cover'
                  onError={() =>
                    setFailedImages((previous) => ({
                      ...previous,
                      [project.id]: true,
                    }))
                  }
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.emptyCover}>
                  <Ionicons name='image-outline' size={32} color={me.ink3} />
                  <Text style={styles.emptyCoverText}>
                    {project.images.length
                      ? 'Photo unavailable'
                      : 'No photos yet'}
                  </Text>
                </View>
              )}
            </View>

            {/* Project info */}
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project.title}
              </Text>
              <View style={styles.photoCountRow}>
                <Ionicons name='camera-outline' size={12} color={me.ink2} />
                <Text style={styles.photoCountText}>
                  {project.images.length}{' '}
                  {project.images.length === 1 ? 'photo' : 'photos'}
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
    color: me.ink,
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
    color: me.brand,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  projectCard: {
    width: CARD_WIDTH,
    backgroundColor: me.surface,
    borderRadius: 16,
    overflow: 'hidden',
    ...me.shadow.card,
  },
  coverImage: {
    width: '100%',
    height: 140,
    backgroundColor: me.bg3,
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
    color: me.ink3,
    fontWeight: '600',
  },
  beforeAfterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: me.ink,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  beforeAfterText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.onBrand,
  },
  projectInfo: {
    padding: 12,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  photoCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: me.ink2,
  },
});
