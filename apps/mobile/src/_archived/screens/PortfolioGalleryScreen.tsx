// ARCHIVED: Social/portfolio feature - contractor portfolio gallery screen
// Moved from apps/mobile/src/screens/contractor/PortfolioGalleryScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { EmptyState } from '../../components/ui/EmptyState';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PortfolioGallery'>;

interface PortfolioPhoto {
  id: string;
  image_url: string;
  created_at: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = 8;
const HORIZONTAL_PADDING = 16;
const IMAGE_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

const PortfolioGalleryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('contractor_posts')
        .select('*')
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos((data as PortfolioPhoto[]) ?? []);
    } catch (error) {
      logger.error('Failed to fetch portfolio photos', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos();
  }, [fetchPhotos]);

  const handleAddPhotos = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      for (const asset of result.assets) {
        const fileName = `portfolio/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('portfolio-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('portfolio-photos')
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('contractor_posts')
          .insert({
            contractor_id: user?.id,
            image_url: urlData.publicUrl,
          });

        if (insertError) throw insertError;
      }
      fetchPhotos();
    } catch (error) {
      logger.error('Failed to upload portfolio photos', error);
      Alert.alert('Upload Failed', 'Could not upload one or more photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photo: PortfolioPhoto) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('contractor_posts')
              .delete()
              .eq('id', photo.id);

            if (error) throw error;
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch (error) {
            logger.error('Failed to delete portfolio photo', error);
            Alert.alert('Error', 'Could not delete the photo. Please try again.');
          }
        },
      },
    ]);
  };

  const renderPhoto = ({ item }: { item: PortfolioPhoto }) => (
    <TouchableOpacity
      style={styles.photoWrapper}
      onLongPress={() => handleDeletePhoto(item)}
      accessibilityRole="button"
      accessibilityLabel="Portfolio photo"
      accessibilityHint="Long press to delete this photo"
    >
      <Image source={{ uri: item.image_url }} style={styles.photo} resizeMode="cover" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerBackBtn}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Portfolio Gallery</Text>
          <TouchableOpacity
            onPress={handleAddPhotos}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={styles.headerActionBtn}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="add-circle-outline" size={26} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : photos.length === 0 ? (
          <EmptyState
            icon="images-outline"
            title="No Portfolio Photos"
            subtitle="Showcase your best work to attract homeowners."
            ctaLabel="Add Photos"
            onCtaPress={handleAddPhotos}
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerBackBtn: {
    padding: 8,
  },
  headerBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerActionBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  photoWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});

export { PortfolioGalleryScreen };
export default PortfolioGalleryScreen;
