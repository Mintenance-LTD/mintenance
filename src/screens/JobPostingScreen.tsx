import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Button from '../components/ui/Button';
import { Picker } from '@react-native-picker/picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AIPricingWidget } from '../components/AIPricingWidget';
import { PricingAnalysis } from '../services/AIPricingEngine';
import { theme } from '../theme';
import { useCreateJob } from '../hooks/useJobs';
import { logger } from '../utils/logger';

interface Props {
  navigation: StackNavigationProp<any>;
}

const JobPostingScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('handyman');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [budget, setBudget] = useState('');
  const [aiPricingAnalysis, setAIPricingAnalysis] =
    useState<PricingAnalysis | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const createJobMutation = useCreateJob();

  const jobCategories = [
    { label: 'Handyman', value: 'handyman' },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical', value: 'electrical' },
    { label: 'Painting & Decorating', value: 'painting' },
    { label: 'Carpentry', value: 'carpentry' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Gardening', value: 'gardening' },
    { label: 'Roofing', value: 'roofing' },
    { label: 'Heating & Gas', value: 'heating' },
    { label: 'Flooring', value: 'flooring' },
  ];

  const handlePricingUpdate = (analysis: PricingAnalysis) => {
    setAIPricingAnalysis(analysis);
    // Auto-fill budget with optimal price if user hasn't set one
    if (!budget && analysis.suggestedPrice.optimal) {
      setBudget(analysis.suggestedPrice.optimal.toString());
    }
  };

  // Real-time validation
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'title':
        if (!value.trim()) return 'Job title is required';
        if (value.trim().length < 10)
          return 'Job title must be at least 10 characters';
        if (value.trim().length > 100)
          return 'Job title cannot exceed 100 characters';
        return '';

      case 'description':
        if (!value.trim()) return 'Description is required';
        if (value.trim().length < 20)
          return 'Description must be at least 20 characters';
        if (value.trim().length > 500)
          return 'Description cannot exceed 500 characters';
        return '';

      case 'location':
        if (!value.trim()) return 'Location is required';
        if (value.trim().length < 5)
          return 'Please provide a more specific location';
        return '';

      case 'budget':
        if (!value.trim()) return 'Budget is required';
        const budgetNumber = parseFloat(value);
        if (isNaN(budgetNumber) || budgetNumber <= 0)
          return 'Budget must be a valid positive number';
        if (budgetNumber > 50000) return 'Budget cannot exceed £50,000';
        if (budgetNumber < 10) return 'Minimum budget is £10';
        return '';

      default:
        return '';
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the field value
    switch (fieldName) {
      case 'title':
        setTitle(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'location':
        setLocation(value);
        break;
      case 'budget':
        setBudget(value);
        break;
    }

    // Clear or set validation error for this field
    const error = validateField(fieldName, value);
    setValidationErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleSubmit = async () => {
    // Validate all fields
    const titleError = validateField('title', title);
    const descriptionError = validateField('description', description);
    const locationError = validateField('location', location);
    const budgetError = validateField('budget', budget);

    const errors = {
      title: titleError,
      description: descriptionError,
      location: locationError,
      budget: budgetError,
    };

    setValidationErrors(errors);

    // Check if there are any validation errors
    const hasErrors = Object.values(errors).some((error) => error !== '');
    if (hasErrors) {
      Alert.alert(
        'Validation Error',
        'Please fix the errors in the form before submitting'
      );
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post a job');
      return;
    }

    const budgetNumber = parseFloat(budget);

    // Warn if budget is significantly different from AI recommendation
    if (
      aiPricingAnalysis &&
      Math.abs(budgetNumber - aiPricingAnalysis.suggestedPrice.optimal) >
        aiPricingAnalysis.suggestedPrice.optimal * 0.3
    ) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Budget Notice',
          `Your budget (£${budgetNumber}) differs from our AI recommendation (£${aiPricingAnalysis.suggestedPrice.optimal}). Continue anyway?`,
          [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    try {
      logger.info('Submitting job posting', {
        title,
        category,
        urgency,
        budget: budgetNumber,
        locationLength: location.length,
        descriptionLength: description.length,
      });

      await createJobMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        budget: budgetNumber,
        homeownerId: user.id,
        category,
        priority: urgency,
      });

      Alert.alert('Success', 'Job posted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      logger.error('Job posting failed:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to post job. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Job</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={[styles.input, validationErrors.title && styles.inputError]}
            placeholder='e.g., Kitchen Sink Repair'
            value={title}
            onChangeText={(value) => handleFieldChange('title', value)}
            maxLength={100}
          />
          {validationErrors.title && (
            <Text style={styles.errorText}>{validationErrors.title}</Text>
          )}

          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
            >
              {jobCategories.map((cat) => (
                <Picker.Item
                  key={cat.value}
                  label={cat.label}
                  value={cat.value}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              validationErrors.description && styles.inputError,
            ]}
            placeholder='Describe the job in detail...'
            value={description}
            onChangeText={(value) => handleFieldChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical='top'
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {description.length}/500 characters
          </Text>
          {validationErrors.description && (
            <Text style={styles.errorText}>{validationErrors.description}</Text>
          )}

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={[
              styles.input,
              validationErrors.location && styles.inputError,
            ]}
            placeholder='e.g., Central London, Manchester City Centre'
            value={location}
            onChangeText={(value) => handleFieldChange('location', value)}
            maxLength={100}
          />
          {validationErrors.location && (
            <Text style={styles.errorText}>{validationErrors.location}</Text>
          )}

          <Text style={styles.label}>Urgency</Text>
          <View style={styles.urgencyContainer}>
            {(['low', 'medium', 'high'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.urgencyButton,
                  urgency === level && styles.urgencyButtonActive,
                ]}
                onPress={() => setUrgency(level)}
              >
                <Text
                  style={[
                    styles.urgencyButtonText,
                    urgency === level && styles.urgencyButtonTextActive,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Pricing Widget */}
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
              onPricingUpdate={handlePricingUpdate}
              autoAnalyze={true}
            />
          )}

          <Text style={styles.label}>Your Budget *</Text>
          <View
            style={[
              styles.budgetInputContainer,
              validationErrors.budget && styles.inputError,
            ]}
          >
            <Text style={styles.currencySymbol}>£</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder='Enter amount'
              value={budget}
              onChangeText={(value) => handleFieldChange('budget', value)}
              keyboardType='numeric'
            />
          </View>
          {validationErrors.budget && (
            <Text style={styles.errorText}>{validationErrors.budget}</Text>
          )}

          {aiPricingAnalysis && (
            <View style={styles.budgetComparisonContainer}>
              <Text style={styles.budgetComparisonText}>
                AI Suggestion: £{aiPricingAnalysis.suggestedPrice.min} - £
                {aiPricingAnalysis.suggestedPrice.max}
              </Text>
            </View>
          )}

          <View style={styles.budgetHint}>
            <Text style={styles.hintText}>
              🤖 Use AI-powered pricing above for market-accurate budget
              suggestions
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant='primary'
          title={createJobMutation.isPending ? 'Posting…' : 'Post Job'}
          onPress={handleSubmit}
          disabled={createJobMutation.isPending}
          loading={createJobMutation.isPending}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: theme.colors.textInverse,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: theme.spacing[3],
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: theme.colors.textPrimary,
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  urgencyButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  urgencyButtonTextActive: {
    color: theme.colors.textInverse,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[3],
  },
  currencySymbol: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing[1],
  },
  budgetInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  budgetComparisonContainer: {
    backgroundColor: `${theme.colors.info}20`,
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing[1],
  },
  budgetComparisonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.info,
    fontWeight: theme.typography.fontWeight.medium,
  },
  budgetHint: {
    backgroundColor: `${theme.colors.primary}15`,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  hintText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  inputError: {
    borderColor: theme.colors.priorityHigh,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.priorityHigh,
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

export default JobPostingScreen;
