import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

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
  return (
    <View style={styles.photoSection}>
      <View style={styles.avatarContainer}>
        {(photoUri || profileImageUrl) ? (
          <Image source={{ uri: photoUri || profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{firstName?.[0]}{lastName?.[0]}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.photoEditButton} onPress={onPickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <Ionicons name="camera" size={20} color="#717171" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.changePhotoButton} onPress={onPickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  photoSection: { backgroundColor: theme.colors.surface, alignItems: "center", paddingVertical: 32, marginBottom: 16 },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#222222", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontWeight: "600", color: theme.colors.textInverse },
  photoEditButton: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.colors.border },
  changePhotoButton: { paddingVertical: 8 },
  changePhotoText: { fontSize: 16, color: theme.colors.textPrimary, fontWeight: "500" },
});