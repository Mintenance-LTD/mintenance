import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { AuthService } from '../services/AuthService';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSave = async () => {
    try {
      setLoading(true);

      const updates = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      };

      // Only update non-empty fields
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== '')
      );

      if (user && Object.keys(filteredUpdates).length > 0) {
        await AuthService.updateUserProfile(user.id, filteredUpdates);
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {firstName?.[0] || user?.firstName?.[0]}
                  {lastName?.[0] || user?.lastName?.[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.photoEditButton}>
              <Ionicons name='camera' size={20} color={theme.colors.info} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder='Enter your first name'
              placeholderTextColor='#999'
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder='Enter your last name'
              placeholderTextColor='#999'
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor='#999'
            />
            <Text style={styles.helperText}>
              Email cannot be changed. Contact support if needed.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder='Enter your phone number'
              placeholderTextColor='#999'
              keyboardType='phone-pad'
            />
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder={
                user?.role === 'contractor'
                  ? 'Tell homeowners about your experience and expertise...'
                  : 'Tell contractors about your project preferences...'
              }
              placeholderTextColor='#999'
              multiline
              numberOfLines={4}
            />
            <Text style={styles.helperText}>{bio.length}/200 characters</Text>
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Email Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive updates about jobs and messages via email
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{
                false: theme.colors.borderLight,
                true: theme.colors.success,
              }}
              thumbColor={theme.colors.textInverse}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Text style={styles.switchDescription}>
                Get instant notifications on your device
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{
                false: theme.colors.borderLight,
                true: theme.colors.success,
              }}
              thumbColor={theme.colors.textInverse}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name='key-outline' size={20} color='#666' />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#ccc' />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionItem, styles.dangerAction]}>
            <View style={styles.actionLeft}>
              <Ionicons name='trash-outline' size={20} color='#FF3B30' />
              <Text style={[styles.actionText, styles.dangerText]}>
                Delete Account
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color='#FF3B30' />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  changePhotoButton: {
    paddingVertical: 8,
  },
  changePhotoText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    color: theme.colors.textTertiary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
});

export default EditProfileScreen;
