import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Input } from "../../components/ui/Input";
import { theme } from "../../theme";

interface PersonalInfoSectionProps {
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  email: string;
  phone: string; setPhone: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  userRole?: string;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  firstName, setFirstName, lastName, setLastName, email, phone, setPhone, bio, setBio, userRole,
}) => {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Input label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" leftIcon="person-outline" variant="outline" size="lg" fullWidth />
        <Input label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Enter your last name" leftIcon="person-outline" variant="outline" size="lg" fullWidth />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} placeholderTextColor={theme.colors.textTertiary} />
          <Text style={styles.helperText}>Email changes require verification. Contact support at help@mintenance.co.uk to update your email.</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter your phone number" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About You</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder={userRole === "contractor" ? "Tell homeowners about your experience..." : "Tell contractors about your preferences..."} placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={4} />
          <Text style={styles.helperText}>{bio.length}/200 characters</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "500", color: theme.colors.textPrimary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: theme.colors.surface, color: theme.colors.textPrimary },
  disabledInput: { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textTertiary },
  textArea: { height: 80, textAlignVertical: "top" },
  helperText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 6 },
});