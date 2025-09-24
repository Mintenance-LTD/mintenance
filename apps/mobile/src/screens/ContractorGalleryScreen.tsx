import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';
// import { useAuth } from '../contexts/AuthContext';
import { ContractorSocialService } from '../services/ContractorSocialService';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

interface GalleryParams {
  contractorId: string;
  contractorName: string;
}

interface Props {
  route: RouteProp<{ params: GalleryParams }>;
  navigation: StackNavigationProp<any>;
}

interface GalleryImage {
  id: string;
  uri: string;
  title: string;
  description: string;
  category: 'before_after' | 'completed' | 'process' | 'tools';
  projectType: string;
  date: string;
  likes: number;
  liked: boolean;
}

const ContractorGalleryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { contractorId, contractorName } = route.params;
  const haptics = useHaptics();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All Work', icon: 'grid-outline' },
    {
      id: 'before_after',
      name: 'Before/After',
      icon: 'swap-horizontal-outline',
    },
    { id: 'completed', name: 'Completed', icon: 'checkmark-circle-outline' },
    { id: 'process', name: 'In Progress', icon: 'construct-outline' },
    { id: 'tools', name: 'Tools & Setup', icon: 'build-outline' },
  ];

  useEffect(() => {
    loadGalleryImages();
  }, [contractorId]);

  const loadGalleryImages = async () => {
    setLoading(true);
    try {
      const posts: any[] =
        await ContractorSocialService.getPostsByContractor(contractorId);

      // Transform contractor posts to gallery images
      const galleryImages: GalleryImage[] = posts
        .filter((post: any) => post.images && post.images.length > 0)
        .flatMap((post: any) =>
          post.images.map((imageUrl: any, _index: number) => ({
            id: `${post.id}-${_index}`,
            uri: imageUrl,
            title: post.title || 'Project Image',
            description: post.content || 'No description available',
            category: mapPostTypeToCategory(post.postType),
            projectType: post.skillsUsed?.[0] || 'General Work',
            date: new Date(post.createdAt).toISOString().split('T')[0],
            likes: post.likesCount || 0,
            liked: post.isLikedByUser || false,
          }))
        );

      setImages(galleryImages);
    } catch (error) {
      logger.error('Error loading gallery images:', error);
      Alert.alert('Error', 'Failed to load gallery images');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const mapPostTypeToCategory = (
    postType: string
  ): 'before_after' | 'completed' | 'process' | 'tools' => {
    switch (postType) {
      case 'showcase':
        return 'completed';
      case 'help_request':
        return 'process';
      case 'tool_rental':
        return 'tools';
      default:
        return 'completed';
    }
  };

  const filteredImages =
    selectedCategory === 'all'
      ? images
      : images.filter((img) => img.category === selectedCategory);

  const handleImagePress = (image: GalleryImage) => {
    haptics.buttonPress();
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleLike = (imageId: string) => {
    haptics.likePost();
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? {
              ...img,
              liked: !img.liked,
              likes: img.liked ? img.likes - 1 : img.likes + 1,
            }
          : img
      )
    );
  };

  const handleShare = async (image: GalleryImage) => {
    haptics.buttonPress();
    try {
      await Share.share({
        message: `Check out this amazing ${image.projectType.toLowerCase()} work by ${contractorName}: ${image.title}`,
        url: image.uri,
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const renderCategoryTab = (category: (typeof categories)[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryTab,
        selectedCategory === category.id && styles.categoryTabActive,
      ]}
      onPress={() => {
        haptics.buttonPress();
        setSelectedCategory(category.id);
      }}
    >
      <Ionicons
        name={category.icon as any}
        size={20}
        color={
          selectedCategory === category.id ? theme.colors.white : theme.colors.textSecondary
        }
      />
      <Text
        style={[
          styles.categoryTabText,
          selectedCategory === category.id && styles.categoryTabTextActive,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderImageItem = (image: GalleryImage, _index: number) => {
    const itemWidth = (width - 60) / 2; // Account for padding and gap

    return (
      <TouchableOpacity
        style={[styles.imageItem, { width: itemWidth }]}
        onPress={() => handleImagePress(image)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: image.uri }} style={styles.image} />

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {categories.find((c) => c.id === image.category)?.name || 'Work'}
          </Text>
        </View>

        {/* Image Info Overlay */}
        <View style={styles.imageOverlay}>
          <Text style={styles.imageTitle} numberOfLines={2}>
            {image.title}
          </Text>
          <Text style={styles.imageDate}>{formatDate(image.date)}</Text>

          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleLike(image.id)}
            >
              <Ionicons
                name={image.liked ? 'heart' : 'heart-outline'}
                size={16}
                color={image.liked ? '#FF6B6B' : theme.colors.white}
              />
              <Text style={styles.likeCount}>{image.likes}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare(image)}
            >
              <Ionicons name='share-outline' size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderImageModal = () => (
    <Modal
      visible={showImageModal}
      animationType='fade'
      statusBarTranslucent
      onRequestClose={() => setShowImageModal(false)}
    >
      <View style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name='close' size={24} color={theme.colors.white} />
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => selectedImage && handleShare(selectedImage)}
            >
              <Ionicons name='share-outline' size={24} color={theme.colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => selectedImage && handleLike(selectedImage.id)}
            >
              <Ionicons
                name={selectedImage?.liked ? 'heart' : 'heart-outline'}
                size={24}
                color={selectedImage?.liked ? '#FF6B6B' : theme.colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Size Image */}
        {selectedImage && (
          <View style={styles.modalImageContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.modalImage}
              resizeMode='contain'
            />
          </View>
        )}

        {/* Image Details */}
        {selectedImage && (
          <View style={styles.modalDetails}>
            <Text style={styles.modalTitle}>{selectedImage.title}</Text>
            <Text style={styles.modalDescription}>
              {selectedImage.description}
            </Text>

            <View style={styles.modalMeta}>
              <View style={styles.modalMetaItem}>
                <Ionicons
                  name='calendar-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.modalMetaText}>
                  {formatDate(selectedImage.date)}
                </Text>
              </View>

              <View style={styles.modalMetaItem}>
                <Ionicons
                  name='build-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.modalMetaText}>
                  {selectedImage.projectType}
                </Text>
              </View>

              <View style={styles.modalMetaItem}>
                <Ionicons
                  name='heart-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.modalMetaText}>
                  {selectedImage.likes} likes
                </Text>
              </View>
            </View>

            {/* Contact Actions */}
            <View style={styles.modalContactActions}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => {
                  setShowImageModal(false);
                  navigation.navigate('Chat', { contractorId });
                }}
              >
                <Ionicons
                  name='chatbubble-outline'
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.contactButtonText}>
                  Ask about this work
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactButton, styles.bookButton]}
                onPress={() => {
                  setShowImageModal(false);
                  navigation.navigate('ServiceBooking', {
                    contractorId,
                    contractorName,
                  });
                }}
              >
                <Ionicons name='calendar-outline' size={18} color={theme.colors.white} />
                <Text style={[styles.contactButtonText, styles.bookButtonText]}>
                  Book Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Gallery ({filteredImages.length})
        </Text>
        <TouchableOpacity>
          <Ionicons name='filter' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Contractor Info */}
      <View style={styles.contractorInfo}>
        <Text style={styles.contractorName}>{contractorName}</Text>
        <Text style={styles.contractorSubtitle}>
          Professional Work Portfolio
        </Text>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategoryTab)}
      </ScrollView>

      {/* Gallery Grid */}
      <FlatList
        data={filteredImages}
        numColumns={2}
        renderItem={({ item, index }) => renderImageItem(item, index)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.galleryContainer}
        columnWrapperStyle={styles.galleryRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name='images-outline'
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No images found</Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'all'
                ? "This contractor hasn't uploaded any work photos yet."
                : `No ${categories.find((c) => c.id === selectedCategory)?.name.toLowerCase()} images available.`}
            </Text>
          </View>
        }
      />

      {renderImageModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contractorInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  contractorName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  contractorSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  categoryTabActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  categoryTabTextActive: {
    color: theme.colors.textInverse,
  },
  galleryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  galleryRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageItem: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 1,
    ...theme.shadows.base,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Use a semi-transparent overlay to improve text readability
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
    marginBottom: 4,
  },
  imageDate: {
    fontSize: 11,
    color: theme.colors.textInverseMuted,
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontWeight: '500',
  },
  shareButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  modalActionButton: {
    padding: 4,
  },
  modalImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width,
    height: '100%',
  },
  modalDetails: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalContactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
  },
  bookButtonText: {
    color: theme.colors.textInverse,
  },
});

export default ContractorGalleryScreen;
