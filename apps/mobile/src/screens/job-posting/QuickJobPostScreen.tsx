/**
 * QuickJobPostScreen - "Post a Quick Job" page
 *
 * Mirrors the web app's /jobs/quick-create page:
 * - Property card (pre-filled from search bar)
 * - Common Repairs template grid
 * - Title + description form
 * - Budget range selector
 * - Urgency selector
 * - Submit button
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { JobService } from '../../services/JobService';
import { sanitize } from '@mintenance/security';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { theme } from '../../theme';

// ============================================================================
// DATA
// ============================================================================

const REPAIR_TEMPLATES = [
  {
    id: 'leaky-tap',
    icon: 'water-outline' as const,
    title: 'Leaky Tap/Pipe',
    category: 'plumbing',
    description: 'Fix dripping tap, leaking pipe, or water issue',
    budgetRange: '\u00A350-150',
    budget: '100',
    iconColor: theme.colors.primary,
    iconBg: theme.colors.primaryLight,
  },
  {
    id: 'electrical-issue',
    icon: 'flash-outline' as const,
    title: 'Electrical Issue',
    category: 'electrical',
    description: 'Fix power outlet, switch, or minor electrical problem',
    budgetRange: '\u00A375-200',
    budget: '150',
    iconColor: '#92400E',
    iconBg: theme.colors.accentLight,
  },
  {
    id: 'paint-touchup',
    icon: 'color-palette-outline' as const,
    title: 'Painting/Touch-up',
    category: 'painting',
    description: 'Paint room, touch-up walls, or refresh surfaces',
    budgetRange: '\u00A3100-300',
    budget: '200',
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
  },
  {
    id: 'general-repair',
    icon: 'construct-outline' as const,
    title: 'General Repair',
    category: 'handyman',
    description: 'Fix door, window, furniture, or general maintenance',
    budgetRange: '\u00A350-200',
    budget: '100',
    iconColor: theme.colors.textSecondary,
    iconBg: theme.colors.backgroundSecondary,
  },
  {
    id: 'blocked-drain',
    icon: 'home-outline' as const,
    title: 'Blocked Drain',
    category: 'plumbing',
    description: 'Unblock sink, toilet, or drainage issue',
    budgetRange: '\u00A375-150',
    budget: '100',
    iconColor: '#1E40AF',
    iconBg: '#DBEAFE',
  },
  {
    id: 'emergency',
    icon: 'alert-circle-outline' as const,
    title: 'Emergency Repair',
    category: 'emergency',
    description: 'Urgent fix needed ASAP',
    budgetRange: '\u00A3150+',
    budget: '300',
    iconColor: '#991B1B',
    iconBg: '#FEE2E2',
  },
];

const BUDGET_RANGES = [
  { label: 'Under \u00A3100', value: '75' },
  { label: '\u00A3100-200', value: '150' },
  { label: '\u00A3200-350', value: '275' },
  { label: '\u00A3350-500', value: '425' },
];

const URGENCY_OPTIONS = [
  { label: 'Today', value: 'today', color: '#FEE2E2', textColor: '#991B1B' },
  {
    label: 'Tomorrow',
    value: 'tomorrow',
    color: '#FEE2E2',
    textColor: theme.colors.error,
  },
  {
    label: 'This Week',
    value: 'this_week',
    color: theme.colors.accentLight,
    textColor: theme.colors.accent,
  },
  {
    label: 'Not Urgent',
    value: 'not_urgent',
    color: theme.colors.backgroundSecondary,
    textColor: theme.colors.textSecondary,
  },
];

const VALID_JOB_CATEGORIES = new Set([
  'plumbing',
  'electrical',
  'hvac',
  'general',
  'appliance',
  'landscaping',
  'roofing',
  'painting',
  'carpentry',
  'cleaning',
  'flooring',
  'tiling',
  'plastering',
  'guttering',
  'fencing',
  'damp',
  'pest_control',
  'other',
  'heating',
  'gardening',
  'handyman',
]);

function normalizeJobCategory(category?: string): string {
  const cleaned = category?.trim().toLowerCase();
  if (!cleaned || cleaned === 'emergency') return 'general';
  return VALID_JOB_CATEGORIES.has(cleaned) ? cleaned : 'other';
}

interface RouteParams {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  category: string;
  urgency: string;
}

export const QuickJobPostScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const params = route.params as RouteParams;
  const initialCategory = params?.category ?? '';

  // Pre-fill from QuickJobModal selections (WHERE/WHEN/WHAT)
  const categoryLabel = initialCategory
    ? initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1)
    : '';
  const [title, setTitle] = useState(
    categoryLabel ? `${categoryLabel} issue` : ''
  );
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('150');
  const [urgency, setUrgency] = useState(params?.urgency || 'this_week');
  const [category, setCategory] = useState(initialCategory);
  // Auto-select matching template if category matches
  const matchingTemplate = initialCategory
    ? REPAIR_TEMPLATES.find((t) => t.category === initialCategory)
    : null;
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    matchingTemplate?.id || null
  );
  const [submitting, setSubmitting] = useState(false);

  useUnsavedChanges(!!(title || description));

  const handleTemplateSelect = useCallback(
    (template: (typeof REPAIR_TEMPLATES)[0]) => {
      setSelectedTemplate(template.id);
      setTitle(template.title);
      setDescription(template.description);
      setBudget(template.budget);
      setCategory(template.category);
    },
    []
  );

  const handleSubmit = async () => {
    if (!title || title.length < 5) {
      Alert.alert(
        'Missing Title',
        'Please enter a job title (at least 5 characters)'
      );
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      let fullDescription = description || title;
      if (urgency === 'today')
        fullDescription = `URGENT - Needed today! ${fullDescription}`;
      else if (urgency === 'tomorrow')
        fullDescription = `Needed tomorrow. ${fullDescription}`;
      else if (urgency === 'this_week')
        fullDescription = `Needed this week. ${fullDescription}`;

      while (fullDescription.length < 50) {
        fullDescription += ' - Please see title for details.';
      }

      await JobService.createJob({
        title: sanitize.text(title, 200),
        description: sanitize.jobDescription(fullDescription),
        location: params?.propertyAddress || '',
        budget: parseFloat(budget) || 150,
        homeownerId: user.id,
        category: normalizeJobCategory(category),
        priority:
          urgency === 'today'
            ? 'high'
            : urgency === 'tomorrow'
              ? 'medium'
              : 'low',
        property_id: params?.propertyId,
      });

      Alert.alert(
        'Job Posted!',
        'Your job has been posted. Contractors in your area will be notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to post job';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Quick Job</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <Text style={styles.subtitle}>
          Get your repair fixed fast - select a template or describe your issue
        </Text>

        {/* Property Card */}
        <View style={styles.propertyBanner}>
          <Text style={styles.propertyLabel}>Property</Text>
          <View style={styles.propertyRow}>
            <Ionicons
              name='home'
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={styles.propertyText}>
              <Text style={styles.propertyNameText}>
                {params?.propertyName || 'My Property'}
              </Text>
              <Text style={styles.propertyAddressText} numberOfLines={1}>
                {params?.propertyAddress || ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Common Repairs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Repairs</Text>
          <View style={styles.templateGrid}>
            {REPAIR_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardActive,
                ]}
                onPress={() => handleTemplateSelect(template)}
              >
                <View
                  style={[
                    styles.templateIconCircle,
                    { backgroundColor: template.iconBg },
                  ]}
                >
                  <Ionicons
                    name={template.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={template.iconColor}
                  />
                </View>
                <Text
                  style={[
                    styles.templateTitle,
                    selectedTemplate === template.id &&
                      styles.templateTitleActive,
                  ]}
                >
                  {template.title}
                </Text>
                <Text style={styles.templateBudget}>
                  {template.budgetRange}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Describe Your Issue
            The "What needs fixing?" title input is hidden whenever a
            template is selected OR the user arrived with a category
            pre-filled from the Where/When/What search modal — in both
            cases `title` already has a sensible default (the template
            name, or e.g. "Carpentry issue") and asking the user to
            re-confirm it was the "I'm forced to do that again" gripe
            on the quick-post flow. When they DID start from a blank
            slate, we keep the title field since we need 5+ chars. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe Your Issue</Text>
          {!selectedTemplate && !params?.category ? (
            <>
              <Text style={styles.inputLabel}>What needs fixing?</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder='e.g., Leaking kitchen tap'
                placeholderTextColor={theme.colors.textTertiary}
              />
            </>
          ) : null}
          <Text style={styles.inputLabel}>Brief description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder='Add any helpful details...'
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical='top'
          />
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Range</Text>
          <View style={styles.budgetGrid}>
            {BUDGET_RANGES.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.budgetChip,
                  budget === range.value && styles.budgetChipActive,
                ]}
                onPress={() => setBudget(range.value)}
              >
                <Text
                  style={[
                    styles.budgetText,
                    budget === range.value && styles.budgetTextActive,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Urgency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How urgent is this?</Text>
          <View style={styles.urgencyGrid}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.urgencyChip,
                  { backgroundColor: opt.color },
                  urgency === opt.value && styles.urgencyChipActive,
                ]}
                onPress={() => setUrgency(opt.value)}
              >
                <Text style={[styles.urgencyText, { color: opt.textColor }]}>
                  {opt.label}
                </Text>
                {urgency === opt.value && (
                  <Ionicons name='checkmark' size={16} color={opt.textColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Need more options? */}
        <TouchableOpacity
          style={styles.moreOptionsLink}
          onPress={() => {
            navigation.goBack();
            setTimeout(() => {
              navigation.navigate('Modal', {
                screen: 'ServiceRequest',
              } as never);
            }, 300);
          }}
        >
          <Text style={styles.moreOptionsText}>
            Need more options? Use the full form
          </Text>
          <Ionicons
            name='arrow-forward'
            size={16}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole='button'
          accessibilityLabel={submitting ? 'Posting job' : 'Post job'}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons
                name='paper-plane'
                size={18}
                color={theme.colors.textInverse}
              />
              <Text style={styles.submitText}>Post Job</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
  },

  // Property banner
  propertyBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  propertyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  propertyText: {
    flex: 1,
  },
  propertyNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyAddressText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },

  // Templates
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 110,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  templateCardActive: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  templateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
  },
  templateTitleActive: {
    color: theme.colors.textPrimary,
  },
  templateBudget: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // Inputs
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  // Budget
  budgetGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  budgetChipActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  budgetTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '700',
  },

  // Urgency
  urgencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    flex: 1,
    minWidth: '46%',
  },
  urgencyChipActive: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // More options link
  moreOptionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  moreOptionsText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    gap: 8,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default QuickJobPostScreen;
