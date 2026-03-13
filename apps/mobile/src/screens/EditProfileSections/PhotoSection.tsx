import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PhotoSectionProps {
  photoUri: string | null;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  onPickPhoto: () => void;
}

export const PhotoSection: React.FC<PhotoSectionProps> = ({
  photoUri, firstName, lastName, profileImageUrl, onPickPhoto,
}) => {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <View style={styles.photoSection}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onPickPhoto}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        activeOpacity={0.8}
      >
        {(photoUri || profileImageUrl) ? (
          <Image source={{ uri: photoUri || profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.photoEditButton}>
          <Ionicons name="camera" size={16} color="#FFFFFF" />
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
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: '#FFFFFF',
  },
  photoEditButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: "600",
  },
});
