import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface PhotoSectionProps {
  photoUri: string | null;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  onPickPhoto: () => void;
}

export const PhotoSection: React.FC<PhotoSectionProps> = ({
  photoUri,
  firstName,
  lastName,
  profileImageUrl,
  onPickPhoto,
}) => {
  const initials =
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const activeUri = photoUri || profileImageUrl;
  // If the upstream photo URL 404s (stale bucket URL, expired signed
  // link, etc.) React Native's <Image> renders nothing / a broken
  // icon by default. Track load errors so we gracefully fall back
  // to the initials placeholder the same way the no-url path does.
  const [imageFailed, setImageFailed] = useState(false);
  // Reset the failed flag whenever the URL itself changes so a
  // freshly picked photo gets a chance to load.
  useEffect(() => {
    setImageFailed(false);
  }, [activeUri]);

  return (
    <View style={styles.photoSection}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onPickPhoto}
        accessibilityRole='button'
        accessibilityLabel='Change profile photo'
        activeOpacity={0.8}
      >
        {activeUri && !imageFailed ? (
          <Image
            source={{ uri: activeUri }}
            style={styles.avatar}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.photoEditButton}>
          <Ionicons name='camera' size={16} color={me.onBrand} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPickPhoto} style={styles.changePhotoButton}>
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: me.surface,
    ...me.shadow.pop,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: me.surface,
    ...me.shadow.pop,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: me.onBrand,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: me.surface,
  },
  changePhotoButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 14,
    color: me.brand,
    fontWeight: '600',
  },
});
