/**
 * JobPostingFormFields - Form body sub-component for JobPostingScreen.
 * Extracted to keep JobPostingScreen under 600 lines.
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Input } from '../../components/ui/Input';
import { Picker } from '@react-native-picker/picker';
import { AIPricingWidget } from '../../components/AIPricingWidget';
import { BuildingAssessmentCard } from '../../components/ai/BuildingAssessmentCard';
import type { PricingAnalysis } from '../../services/AIPricingEngine';
import type { BuildingAssessment } from '@mintenance/ai-core';
import { theme } from '../../theme';

interface JobCategory {
  label: string;
  value: string;
}

export interface JobPostingFormFieldsProps {
  title: string;
  description: string;
  location: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  budget: string;
  photos: string[];
  buildingAssessment: BuildingAssessment | null;
  aiPricingAnalysis: PricingAnalysis | null;
  validationErrors: Record<string, string>;
  jobCategories: JobCategory[];
  onFieldChange: (name: string, value: string) => void;
  onCategoryChange: (value: string) => void;
  onUrgencyChange: (level: 'low' | 'medium' | 'high') => void;
  onPricingUpdate: (analysis: PricingAnalysis) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onAssessmentComplete: (assessment: BuildingAssessment) => void;
  onAssessmentCorrection: (assessmentId: string, corrections: unknown[]) => void;
}

export const JobPostingFormFields: React.FC<JobPostingFormFieldsProps> = ({
  title, description, location, category, urgency, budget,
  photos, aiPricingAnalysis, validationErrors,
  jobCategories, onFieldChange, onCategoryChange, onUrgencyChange,
  onPricingUpdate, onAddPhoto, onRemovePhoto,
  onAssessmentComplete, onAssessmentCorrection,
}) => (
  <View style={styles.form}>
    <Input
      testID="job-title-input"
      label='Job Title'
      placeholder='e.g., Kitchen Sink Repair'
      value={title}
      onChangeText={(value) => onFieldChange('title', value)}
      maxLength={100}
      state={validationErrors.title ? 'error' : 'default'}
      errorText={validationErrors.title}
      leftIcon='hammer-outline'
      variant='outline'
      size='lg'
      fullWidth
      required
    />

    <Text style={styles.label}>Category *</Text>
    <View style={styles.pickerContainer}>
      <Picker
        testID="job-category-select"
        selectedValue={category}
        onValueChange={onCategoryChange}
        style={styles.picker}
      >
        {jobCategories.map((cat) => (
          <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
        ))}
      </Picker>
    </View>

    {/* Hidden test-accessible category options */}
    {jobCategories.map((cat) => (
      <TouchableOpacity
        key={`test-${cat.value}`}
        style={{ opacity: 0, position: 'absolute', left: -9999 }}
        onPress={() => onCategoryChange(cat.value)}
      >
        <Text testID={`category-option-${cat.value}`}>{cat.label}</Text>
      </TouchableOpacity>
    ))}

    <Text style={styles.label}>Description *</Text>
    <TextInput
      testID="job-description-input"
      style={[styles.input, styles.textArea, validationErrors.description && styles.inputError]}
      placeholder='Describe the job in detail...'
      value={description}
      onChangeText={(value) => onFieldChange('description', value)}
      multiline
      numberOfLines={4}
      textAlignVertical='top'
      maxLength={500}
      placeholderTextColor={theme.colors.textTertiary}
    />
    <Text style={styles.characterCount}>{description.length}/500 characters</Text>
    {validationErrors.description && (
      <Text style={styles.errorText}>{validationErrors.description}</Text>
    )}

    <Text style={styles.label}>Location *</Text>
    <TextInput
      testID="job-location-input"
      style={[styles.input, validationErrors.location && styles.inputError]}
      placeholder='e.g., Central London, Manchester City Centre'
      value={location}
      onChangeText={(value) => onFieldChange('location', value)}
      maxLength={100}
      placeholderTextColor={theme.colors.textTertiary}
    />
    {validationErrors.location && (
      <Text style={styles.errorText}>{validationErrors.location}</Text>
    )}

    <Text style={styles.label}>Urgency</Text>
    <View testID="job-priority-select" style={styles.urgencyContainer}>
      {(['low', 'medium', 'high'] as const).map((level) => (
        <TouchableOpacity
          key={level}
          style={[styles.urgencyButton, urgency === level && styles.urgencyButtonActive]}
          onPress={() => onUrgencyChange(level)}
        >
          <Text style={[styles.urgencyButtonText, urgency === level && styles.urgencyButtonTextActive]}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {title.trim() && description.trim() && location.trim() && (
      <AIPricingWidget
        jobInput={{
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(),
          urgency,
          homeownerBudget: budget ? parseFloat(budget) : undefined,
        }}
        onPricingUpdate={onPricingUpdate}
        autoAnalyze={true}
      />
    )}

    <Text style={styles.label}>Your Budget *</Text>
    <View style={[styles.budgetInputContainer, validationErrors.budget && styles.inputError]}>
      <Text style={styles.currencySymbol}>£</Text>
      <TextInput
        testID="job-budget-input"
        style={styles.budgetInput}
        placeholder='Enter amount'
        value={budget}
        onChangeText={(value) => onFieldChange('budget', value)}
        keyboardType='numeric'
        placeholderTextColor={theme.colors.textTertiary}
      />
    </View>
    {validationErrors.budget && (
      <Text style={styles.errorText}>{validationErrors.budget}</Text>
    )}

    <Text style={styles.label}>Photos (Optional)</Text>
    <TouchableOpacity testID="add-photo-button" style={styles.addPhotoButton} onPress={onAddPhoto}>
      <Text style={styles.addPhotoButtonText}>+ Add Photos</Text>
    </TouchableOpacity>

    {photos.length > 0 && (
      <View style={styles.photosContainer}>
        {photos.map((photo, index) => (
          <View key={photo} testID={`photo-${index}`} style={styles.photoItem}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoText}>Photo {index + 1}</Text>
            </View>
            <TouchableOpacity
              testID={`delete-photo-${index}`}
              style={styles.deletePhotoButton}
              onPress={() => onRemovePhoto(index)}
            >
              <Text style={styles.deletePhotoText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    )}

    {photos.length > 0 && (
      <BuildingAssessmentCard
        images={photos}
        jobDetails={{ title, description, category, location }}
        onAssessmentComplete={onAssessmentComplete}
        onCorrection={onAssessmentCorrection}
      />
    )}

    {aiPricingAnalysis && (
      <View style={styles.budgetComparisonContainer}>
        <Text style={styles.budgetComparisonText}>
          AI Suggestion: £{aiPricingAnalysis.suggestedPrice.min} - £{aiPricingAnalysis.suggestedPrice.max}
        </Text>
      </View>
    )}

    <View style={styles.budgetHint}>
      <Text style={styles.hintText}>
        Use AI-powered pricing above for market-accurate budget suggestions
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  pickerContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: theme.colors.textPrimary,
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  urgencyButtonTextActive: {
    color: theme.colors.textInverse,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  budgetComparisonContainer: {
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  budgetComparisonText: {
    fontSize: 14,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  budgetHint: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  hintText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  addPhotoButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
});
