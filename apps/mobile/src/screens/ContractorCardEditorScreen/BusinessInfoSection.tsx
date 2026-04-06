import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '@mintenance/types';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { styles } from './styles';

interface BusinessInfoSectionProps {
  profile: Partial<ContractorProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<ContractorProfile>>>;
  user: { address?: string | null; city?: string | null; postcode?: string | null } | null;
}

export const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({ profile, setProfile, user }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Business Information</Text>

    <Input
      label='Company Name'
      value={profile.companyName}
      onChangeText={(text) => setProfile(prev => ({ ...prev, companyName: text }))}
      placeholder="Your business name"
      leftIcon='business-outline'
      variant='outline'
      size='lg'
      fullWidth
    />

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Professional Bio</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        value={profile.bio}
        onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
        placeholder="Describe your expertise and what sets you apart..."
        placeholderTextColor={theme.colors.textTertiary}
        multiline
        numberOfLines={4}
      />
    </View>

    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Business Address</Text>
        {user?.address && (
          <TouchableOpacity
            onPress={() => {
              const parts = [user.address, user.city, user.postcode].filter(Boolean);
              setProfile(prev => ({ ...prev, businessAddress: parts.join(', ') }));
            }}
            style={styles.useProfileBtn}
          >
            <Ionicons name="person-circle-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.useProfileBtnText}>Use Profile Address</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.textInput}
        value={profile.businessAddress}
        onChangeText={(text) => setProfile(prev => ({ ...prev, businessAddress: text }))}
        placeholder="123 Main St, City, Postcode"
        placeholderTextColor={theme.colors.textTertiary}
      />
    </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
        <TextInput
          style={styles.textInput}
          value={profile.hourlyRate?.toString() || ''}
          onChangeText={(text) => setProfile(prev => ({
            ...prev,
            hourlyRate: parseInt(text) || 0
          }))}
          placeholder="75"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
        />
      </View>
      <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
        <Text style={styles.inputLabel}>Years Experience</Text>
        <TextInput
          style={styles.textInput}
          value={profile.yearsExperience?.toString() || ''}
          onChangeText={(text) => setProfile(prev => ({
            ...prev,
            yearsExperience: parseInt(text) || 0
          }))}
          placeholder="10"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
        />
      </View>
    </View>
  </View>
);
