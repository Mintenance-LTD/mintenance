import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ROOM_PHOTO_TYPES,
  groupRoomPhotoAlbums,
  uploadedPhotoLabel,
  type DatedRoomPhoto,
} from '@mintenance/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

export function RoomPhotoAlbums({
  propertyId,
  editable,
}: {
  propertyId: string;
  editable: boolean;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [room, setRoom] = useState('kitchen');
  const [date, setDate] = useState('all');
  const [busy, setBusy] = useState(false);
  // The preference is deliberately absent here: changing view never grants a feature.
  const access = useQuery({
    queryKey: ['room-photo-feature-access', user?.id],
    enabled: !!user,
    queryFn: () =>
      mobileApiClient.get<{ tier: string }>(
        '/api/subscriptions/feature-access'
      ),
  });
  const allowed =
    user?.role === 'admin' ||
    ['landlord', 'agency'].includes(access.data?.tier ?? '');
  const queryKey = ['room-photo-albums', user?.id, propertyId];
  const photos = useQuery({
    queryKey,
    enabled: !!user && allowed,
    queryFn: async () => {
      const result = await mobileApiClient.get<{ photos: DatedRoomPhoto[] }>(
        `/api/properties/${propertyId}/room-photos`
      );
      if (!Array.isArray(result.photos)) throw new Error('Photos unavailable');
      return result.photos;
    },
  });
  const albums = groupRoomPhotoAlbums(photos.data ?? [], room);
  const reload = async () => {
    setDate('all');
    await client.invalidateQueries({ queryKey });
  };
  const upload = async (camera: boolean) => {
    if (!editable || busy || !allowed) return;
    setBusy(true);
    try {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      ) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access in device settings, or choose an existing photo.'
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        exif: false,
      };
      const picked = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!active.current || picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const type =
        asset.mimeType ??
        (/\.png$/i.test(asset.uri)
          ? 'image/png'
          : /\.jpe?g$/i.test(asset.uri)
            ? 'image/jpeg'
            : '');
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)
      ) {
        Alert.alert(
          'Unsupported photo',
          'Choose a JPEG, PNG, WebP or GIF image.'
        );
        return;
      }
      if (asset.fileSize != null && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Photo too large', 'Choose a photo smaller than 5 MB.');
        return;
      }
      const body = new FormData();
      body.append('room_type', room);
      // React Native accepts a local URI descriptor; the browser FormData typings do not.
      body.append('photos', {
        uri: asset.uri,
        type,
        name: asset.fileName || `room-photo.${type.split('/')[1]}`,
      } as unknown as Blob);
      const result = await mobileApiClient.postFormData<{
        uploaded: number;
        warnings?: unknown[];
      }>(`/api/properties/${propertyId}/room-photos`, body, 25000);
      if (!result.uploaded) throw new Error('No photo saved');
      await reload();
      Alert.alert(
        'Photo uploaded',
        'Saved in today’s upload album (UTC). The capture date is not recorded.'
      );
    } catch {
      Alert.alert(
        'Upload unavailable',
        'The photo could not be confirmed as saved. Refresh the album before trying again.'
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = (photo: DatedRoomPhoto) => {
    if (!editable || busy || !allowed) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await mobileApiClient.delete(
              `/api/properties/${propertyId}/room-photos?photoId=${encodeURIComponent(photo.id)}`
            );
            await reload();
          } catch {
            Alert.alert(
              'Delete unavailable',
              'Refresh the album and try again.'
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Room photo albums</Text>
      <Text style={styles.detail}>
        Grouped by upload date (UTC). When a photo was taken is not recorded.
      </Text>
      {access.isLoading ? (
        <ActivityIndicator accessibilityLabel='Checking photo access' />
      ) : access.isError ? (
        <TouchableOpacity
          accessibilityRole='button'
          style={styles.button}
          onPress={() => void access.refetch()}
        >
          <Text style={styles.label}>Could not check plan. Retry</Text>
        </TouchableOpacity>
      ) : !allowed ? (
        <Text style={styles.detail}>
          Room photos require a Landlord or Agency plan, or eligible early
          access. Review Plan & features above.
        </Text>
      ) : (
        <>
          <View style={styles.options}>
            {ROOM_PHOTO_TYPES.map((option) => (
              <TouchableOpacity
                key={option.value}
                accessibilityRole='button'
                accessibilityState={{ selected: room === option.value }}
                style={[
                  styles.button,
                  room === option.value && styles.selected,
                ]}
                onPress={() => {
                  setRoom(option.value);
                  setDate('all');
                }}
              >
                <Text
                  style={[
                    styles.label,
                    room === option.value && styles.selectedText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {editable && (
            <View style={styles.options}>
              <TouchableOpacity
                accessibilityRole='button'
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={styles.button}
                onPress={() => void upload(true)}
              >
                <Text style={styles.label}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole='button'
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={styles.button}
                onPress={() => void upload(false)}
              >
                <Text style={styles.label}>Choose photo</Text>
              </TouchableOpacity>
            </View>
          )}
          {busy && <ActivityIndicator accessibilityLabel='Saving photo' />}
          {photos.isLoading ? (
            <ActivityIndicator accessibilityLabel='Loading photos' />
          ) : photos.isError ? (
            <View accessibilityRole='alert'>
              <Text style={styles.detail}>Photos could not be loaded.</Text>
              <TouchableOpacity
                accessibilityRole='button'
                style={styles.button}
                onPress={() => void photos.refetch()}
              >
                <Text style={styles.label}>Retry photos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {albums.length > 0 && (
                <View style={styles.options}>
                  {[{ date: 'all', label: 'All dates' }, ...albums].map(
                    (album) => (
                      <TouchableOpacity
                        key={album.date}
                        accessibilityRole='button'
                        accessibilityState={{ selected: date === album.date }}
                        style={[
                          styles.button,
                          date === album.date && styles.selected,
                        ]}
                        onPress={() => setDate(album.date)}
                      >
                        <Text
                          style={[
                            styles.label,
                            date === album.date && styles.selectedText,
                          ]}
                        >
                          {album.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}
              {albums.length === 0 && (
                <Text style={styles.detail}>No photos in this room yet.</Text>
              )}
              {albums
                .filter((album) => date === 'all' || date === album.date)
                .map((album) => (
                  <View key={album.date}>
                    <Text style={styles.albumTitle}>
                      {album.label} · {album.photos.length} photo
                      {album.photos.length === 1 ? '' : 's'}
                    </Text>
                    {album.photos.map((photo) => (
                      <View key={photo.id} style={styles.photo}>
                        <Image
                          source={{ uri: photo.photo_url }}
                          accessibilityLabel={photo.file_name || 'Room photo'}
                          style={styles.image}
                          resizeMode='contain'
                        />
                        <Text style={styles.detail}>
                          {uploadedPhotoLabel(photo.created_at)}
                        </Text>
                        {editable && (
                          <TouchableOpacity
                            accessibilityRole='button'
                            accessibilityLabel={`Delete ${photo.file_name || 'room photo'}`}
                            disabled={busy}
                            style={styles.button}
                            onPress={() => remove(photo)}
                          >
                            <Text style={styles.deleteText}>Delete photo</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  title: { fontSize: 18, fontWeight: '700', color: me.ink },
  detail: { fontSize: 13, lineHeight: 19, color: me.ink2, marginVertical: 8 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: me.bg2,
  },
  selected: { backgroundColor: me.brand2 },
  label: { color: me.ink, fontSize: 13, fontWeight: '600' },
  selectedText: { color: me.onBrand },
  albumTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginVertical: 12,
  },
  photo: {
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: me.bg2,
    borderRadius: 8,
  },
  deleteText: { color: me.errFg, fontWeight: '600' },
});
