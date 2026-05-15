/**
 * QuickJobPostScreen — "Post a Quick Job" page.
 *
 * Mirrors the web app's /jobs/quick-create page:
 *   - Property card (pre-filled from search bar)
 *   - Common Repairs template grid
 *   - Title + description form
 *   - Budget range selector
 *   - Urgency selector
 *   - Submit button
 *
 * Was a 787-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b)
 * into typed templates (`quick-job-post/templates.ts`), a submission
 * pipeline (`quick-job-post/submitQuickJob.ts`), shared styles
 * (`quick-job-post/styles.ts`), and 7 leaf components under
 * `quick-job-post/components/`. Public behaviour preserved.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { me } from '../../design-system/mint-editorial';

import { styles } from './quick-job-post/theme/styles';
import {
  REPAIR_TEMPLATES,
  type RepairTemplate,
  type QuickJobRouteParams,
} from './quick-job-post/theme/templates';
import { submitQuickJob } from './quick-job-post/submitQuickJob';
import { QuickJobHeader } from './quick-job-post/components/QuickJobHeader';
import { PropertyBanner } from './quick-job-post/components/PropertyBanner';
import { RepairTemplateGrid } from './quick-job-post/components/RepairTemplateGrid';
import { IssueDescription } from './quick-job-post/components/IssueDescription';
import { BudgetGrid } from './quick-job-post/components/BudgetGrid';
import { UrgencyGrid } from './quick-job-post/components/UrgencyGrid';
import { SubmitFooter } from './quick-job-post/components/SubmitFooter';

export const QuickJobPostScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const params = route.params as QuickJobRouteParams | undefined;
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
  const matchingTemplate = initialCategory
    ? REPAIR_TEMPLATES.find((t) => t.category === initialCategory)
    : null;
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    matchingTemplate?.id || null
  );
  const [submitting, setSubmitting] = useState(false);

  const allowExit = useUnsavedChanges(!!(title || description));

  const handleTemplateSelect = useCallback((template: RepairTemplate) => {
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setDescription(template.description);
    setBudget(template.budget);
    setCategory(template.category);
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    setSubmitting(true);
    const result = await submitQuickJob({
      title,
      description,
      budget,
      urgency,
      category,
      propertyId: params?.propertyId,
      propertyAddress: params?.propertyAddress,
      homeownerId: user.id,
    });
    setSubmitting(false);

    if (!result.ok) {
      Alert.alert(
        result.code === 'VALIDATION' ? 'Cannot post yet' : 'Error',
        result.message
      );
      return;
    }

    Alert.alert(
      'Job Posted!',
      'Your job has been posted. Contractors in your area will be notified.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Bypass the Discard alert — submission already persisted.
            allowExit();
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <QuickJobHeader onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <Text style={styles.subtitle}>
          Get your repair fixed fast - select a template or describe your issue
        </Text>

        <PropertyBanner
          propertyName={params?.propertyName}
          propertyAddress={params?.propertyAddress}
        />

        <RepairTemplateGrid
          selectedTemplate={selectedTemplate}
          onSelect={handleTemplateSelect}
        />

        <IssueDescription
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          showTitleInput={!selectedTemplate && !params?.category}
        />

        <BudgetGrid budget={budget} onChange={setBudget} />

        <UrgencyGrid urgency={urgency} onChange={setUrgency} />

        <TouchableOpacity
          style={styles.moreOptionsLink}
          onPress={() => {
            navigation.goBack();
            setTimeout(() => {
              navigation.navigate('Modal', { screen: 'ServiceRequest' });
            }, 300);
          }}
        >
          <Text style={styles.moreOptionsText}>
            Need more options? Use the full form
          </Text>
          <Ionicons name='arrow-forward' size={16} color={me.ink3} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <SubmitFooter
        bottomInset={insets.bottom}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

export default QuickJobPostScreen;
