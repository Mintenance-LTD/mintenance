import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '@mintenance/types';
import { theme } from '../../theme';
import { styles } from './styles';

interface LogoSectionProps {
  profile: Partial<ContractorProfile>;
  onPickLogo: () => void;
}

export const LogoSection: React.FC<LogoSectionProps> = ({
  profile,
  onPickLogo,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Company Logo</Text>
    {/* Audit follow-up (2026-04-29): icon-only touchable now exposes
        an `accessibilityLabel` so screen readers announce its
        purpose. Without it, VoiceOver / TalkBack just said "Button"
        and the user had no way to know what it did. */}
    <TouchableOpacity
      style={styles.logoUpload}
      onPress={onPickLogo}
      accessibilityRole='button'
      accessibilityLabel={
        profile.companyLogo ? 'Change company logo' : 'Upload company logo'
      }
    >
      {profile.companyLogo ? (
        <Image source={{ uri: profile.companyLogo }} style={styles.logoImage} />
      ) : (
        <View style={styles.logoPlaceholder}>
          <View style={styles.cameraIconWrap}>
            <Ionicons name='camera' size={24} color='#3B82F6' />
          </View>
          <Text style={styles.logoPlaceholderText}>Add Company Logo</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

interface AvailabilitySectionProps {
  profile: Partial<ContractorProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<ContractorProfile>>>;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  profile,
  setProfile,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Availability</Text>
    <View style={styles.availabilityOptions}>
      {['immediate', 'this_week', 'this_month', 'busy'].map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.availabilityOption,
            profile.availability === option && styles.availabilityOptionActive,
          ]}
          onPress={() =>
            setProfile((prev) => ({
              ...prev,
              availability: option as
                | 'immediate'
                | 'this_week'
                | 'this_month'
                | 'busy',
            }))
          }
        >
          <Text
            style={[
              styles.availabilityText,
              profile.availability === option && styles.availabilityTextActive,
            ]}
          >
            {option.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

interface PortfolioSectionProps {
  profile: Partial<ContractorProfile>;
  onAddPortfolio: () => void;
  onRemoveImage: (uri: string) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  profile,
  onAddPortfolio,
  onRemoveImage,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Work Portfolio</Text>
    <Text style={styles.sectionSubtitle}>
      Show your best work (up to 8 photos)
    </Text>

    <TouchableOpacity
      style={styles.addPortfolioButton}
      onPress={onAddPortfolio}
      accessibilityRole='button'
      accessibilityLabel='Add portfolio images'
    >
      <Ionicons name='add' size={22} color={theme.colors.textSecondary} />
      <Text style={styles.addPortfolioText}>Add Portfolio Images</Text>
    </TouchableOpacity>

    {profile.portfolioImages && profile.portfolioImages.length > 0 && (
      <View style={styles.portfolioGrid}>
        {profile.portfolioImages.map((imageUri, index) => (
          <View key={index} style={styles.portfolioItem}>
            <Image source={{ uri: imageUri }} style={styles.portfolioImage} />
            {/* Icon-only X button now self-describes for VoiceOver /
                TalkBack — index keeps the announcement unambiguous
                when there are multiple thumbnails on screen. */}
            <TouchableOpacity
              style={styles.removePortfolioButton}
              onPress={() => onRemoveImage(imageUri)}
              accessibilityRole='button'
              accessibilityLabel={`Remove portfolio image ${index + 1}`}
            >
              <Ionicons name='close' size={16} color='white' />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    )}
  </View>
);

interface ServiceAreaSectionProps {
  profile: Partial<ContractorProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<ContractorProfile>>>;
}

export const ServiceAreaSection: React.FC<ServiceAreaSectionProps> = ({
  profile,
  setProfile,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Service Area</Text>
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Service Radius (km)</Text>
      <TextInput
        style={styles.textInput}
        value={profile.serviceRadius?.toString() || '25'}
        onChangeText={(text) =>
          setProfile((prev) => ({
            ...prev,
            serviceRadius: parseInt(text) || 25,
          }))
        }
        placeholder='25'
        placeholderTextColor={theme.colors.textTertiary}
        keyboardType='numeric'
      />
    </View>
  </View>
);
