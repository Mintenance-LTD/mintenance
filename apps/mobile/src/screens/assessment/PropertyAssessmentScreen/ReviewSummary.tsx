import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { me } from '../../../design-system/mint-editorial';
import { PropertyInfo } from './constants';
import { styles } from './styles';

const SummaryRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

interface Props {
  propertyAddress?: string;
  propertyInfo: PropertyInfo;
  videoUri: string | null;
  photosCount: number;
  manualNotes: string;
  progressPercentage: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const ReviewSummary: React.FC<Props> = ({
  propertyAddress,
  propertyInfo,
  videoUri,
  photosCount,
  manualNotes,
  progressPercentage,
  isSubmitting,
  onSubmit,
}) => (
  <View style={styles.formSection}>
    <Text style={styles.sectionTitle}>Assessment Summary</Text>
    <SummaryRow label='Property' value={propertyAddress || 'Not specified'} />
    <SummaryRow label='Type' value={propertyInfo.propertyType || '—'} />
    <SummaryRow label='Bedrooms' value={propertyInfo.bedrooms || '—'} />
    <SummaryRow label='Video' value={videoUri ? 'Recorded' : 'None'} />
    <SummaryRow label='Photos' value={`${photosCount}`} />
    <SummaryRow label='Notes' value={manualNotes ? 'Added' : 'None'} />
    <SummaryRow label='Progress' value={`${progressPercentage}%`} />
    <TouchableOpacity
      style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
      onPress={onSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator color={me.onBrand} />
      ) : (
        <>
          <Icon name='cloud-upload' size={20} color='#fff' />
          <Text style={styles.submitButtonText}>Submit Assessment</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);
