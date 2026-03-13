import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. 42 High Street" placeholderTextColor="#B0B0B0" autoCorrect={false} />
      </View>
      <View style={styles.locationRow}>
        <View style={styles.locationRowLeft}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. London" placeholderTextColor="#B0B0B0" />
        </View>
        <View style={styles.locationRowSpacer} />
        <View style={styles.locationRowRight}>
          <Text style={styles.label}>Postcode</Text>
          <TextInput style={styles.input} value={postcode} onChangeText={setPostcode} placeholder="e.g. SW1A 1AA" placeholderTextColor="#B0B0B0" autoCapitalize="characters" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: '#222222', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "500", color: '#222222', marginBottom: 8 },
  input: { backgroundColor: '#F7F7F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#222222' },
  locationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: '#10B981', borderRadius: 28, paddingVertical: 14, gap: 8, marginBottom: 20 },
  locationButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: "600" },
  locationRow: { flexDirection: "row", marginBottom: 0 },
  locationRowLeft: { flex: 3, marginBottom: 20 },
  locationRowSpacer: { width: 12 },
  locationRowRight: { flex: 2, marginBottom: 20 },
});
