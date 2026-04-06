import React from 'react';
import { View, Text, Image, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorProfile } from '@mintenance/types';
import { theme } from '../../theme';
import { styles } from './styles';

interface PreviewModalProps {
  visible: boolean;
  onClose: () => void;
  profile: Partial<ContractorProfile>;
  topInset: number;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ visible, onClose, profile, topInset }) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    <View style={styles.previewContainer}>
      <View style={[styles.previewHeader, { paddingTop: topInset }]}>
        <Text style={styles.previewTitle}>Discovery Card Preview</Text>
        <TouchableOpacity style={styles.previewCloseBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.previewContent}>
        <View style={styles.cardPreview}>
          {profile.companyLogo && (
            <Image source={{ uri: profile.companyLogo }} style={styles.previewLogo} />
          )}
          <Text style={styles.previewCompanyName}>{profile.companyName || 'Your Company'}</Text>
          <Text style={styles.previewBio}>{profile.bio || 'Your professional bio...'}</Text>
          <View style={styles.previewRateChip}>
            <Text style={styles.previewRate}>£{profile.hourlyRate || 0}/hr</Text>
          </View>
        </View>
      </View>
    </View>
  </Modal>
);
