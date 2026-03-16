import React from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from '../../theme';

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

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>First Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Last Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputField}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, styles.disabledInputWrap]}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, styles.disabledInput]}
              value={email}
              editable={false}
              placeholderTextColor={theme.colors.textTertiary}
            />
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={12} color={theme.colors.textTertiary} />
            </View>
          </View>
          <Text style={styles.helperText}>
            Contact help@mintenance.co.uk to update your email.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={theme.colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About You</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, 200))}
              placeholder={
                userRole === "contractor"
                  ? "Tell homeowners about your experience, specialties, and approach to work..."
                  : "Tell contractors about your preferences..."
              }
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>
          <Text style={[styles.helperText, bio.length >= 180 && styles.helperTextWarn]}>
            {bio.length}/200 characters
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  disabledInputWrap: {
    backgroundColor: '#F3F3F3',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingVertical: 13,
  },
  disabledInput: {
    color: theme.colors.textTertiary,
  },
  lockBadge: {
    marginLeft: 8,
  },
  textAreaWrap: {
    alignItems: 'flex-start',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  helperTextWarn: {
    color: theme.colors.accent,
  },
});
