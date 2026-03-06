import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface LocationSectionProps {
  address: string; setAddress: (v: string) => void;
  city: string; setCity: (v: string) => void;
  postcode: string; setPostcode: (v: string) => void;
  locating: boolean;
  onUseMyLocation: () => void;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  address, setAddress, city, setCity, postcode, setPostcode, locating, onUseMyLocation,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Location</Text>
      <TouchableOpacity style={styles.locationButton} onPress={onUseMyLocation} disabled={locating} accessibilityRole="button" accessibilityLabel="Use current GPS location">
        {locating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="location" size={18} color="#FFFFFF" />}
        <Text style={styles.locationButtonText}>{locating ? "Detecting location..." : "Use My Location"}</Text>
      </TouchableOpacity>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. 42 High Street" placeholderTextColor={theme.colors.textTertiary} autoCorrect={false} />
      </View>
      <View style={styles.locationRow}>
        <View style={styles.locationRowLeft}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. London" placeholderTextColor={theme.colors.textTertiary} />
        </View>
        <View style={styles.locationRowSpacer} />
        <View style={styles.locationRowRight}>
          <Text style={styles.label}>Postcode</Text>
          <TextInput style={styles.input} value={postcode} onChangeText={setPostcode} placeholder="e.g. SW1A 1AA" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="characters" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "500", color: theme.colors.textPrimary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary },
  locationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#222222", borderRadius: 10, paddingVertical: 12, gap: 8, marginBottom: 20 },
  locationButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  locationRow: { flexDirection: "row", marginBottom: 0 },
  locationRowLeft: { flex: 3, marginBottom: 20 },
  locationRowSpacer: { width: 12 },
  locationRowRight: { flex: 2, marginBottom: 20 },
});