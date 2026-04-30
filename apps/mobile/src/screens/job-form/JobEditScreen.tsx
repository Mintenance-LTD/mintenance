import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Banner } from '../../components/ui/Banner';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { JobCRUDService } from '../../services/JobCRUDService';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

type Props = NativeStackScreenProps<JobsStackParamList, 'JobEdit'>;

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Painting',
  'Carpentry',
  'Roofing',
  'Landscaping',
  'Cleaning',
  'General Maintenance',
  'HVAC',
  'Other',
];

const PRIORITIES = ['low', 'medium', 'high'] as const;

const JobEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { jobId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');

  // Discard-prompt — fetch hydrates the form on mount and does NOT
  // touch hasEdits, so a user who opens then immediately closes the
  // screen never sees the prompt. Edits flip the flag.
  const [hasEdits, setHasEdits] = useState(false);
  const allowExit = useUnsavedChanges(hasEdits);
  const markDirty = () => setHasEdits(true);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const job = await JobCRUDService.getJobById(jobId);
      if (!job) {
        setErrorMessage('Job not found.');
        return;
      }
      if (job.status !== 'posted') {
        setErrorMessage('Only jobs with "posted" status can be edited.');
        return;
      }
      setTitle(job.title ?? '');
      setDescription(job.description ?? '');
      setCategory(job.category ?? '');
      setPriority((job.priority as 'low' | 'medium' | 'high') ?? 'medium');
      setBudget(job.budget != null ? String(job.budget) : '');
      setLocation(
        typeof job.location === 'string'
          ? job.location
          : job.location
            ? JSON.stringify(job.location)
            : ''
      );
    } catch (error) {
      logger.error('Failed to fetch job for editing', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load job details.'
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const clearError = useCallback(() => {
    if (errorMessage) setErrorMessage(null);
  }, [errorMessage]);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return false;
    }
    if (!description.trim()) {
      setErrorMessage('Description is required.');
      return false;
    }
    if (!category) {
      setErrorMessage('Category is required.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      await JobCRUDService.updateJob(jobId, {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        budget: budget ? Number(budget) : undefined,
        location: location.trim() || undefined,
      });
      setHasEdits(false);
      Alert.alert('Success', 'Job updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            allowExit();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      logger.error('Failed to update job', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !title) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole='button'
              accessibilityLabel='Go back'
              style={styles.headerBackBtn}
            >
              <Ionicons
                name='arrow-back'
                size={24}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerBarTitle}>Edit Job</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Banner
              message={errorMessage}
              variant='error'
              testID='job-edit-error-banner'
            />
            <Button
              variant='secondary'
              title='Go Back'
              onPress={() => navigation.goBack()}
              fullWidth
              style={{ marginTop: 16, borderRadius: 14 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Cancel editing'
            style={styles.headerBackBtn}
          >
            <Ionicons name='close' size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Edit Job</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {errorMessage ? (
              <Banner
                message={errorMessage}
                variant='error'
                testID='job-edit-error-banner'
              />
            ) : null}

            <Input
              label='Title'
              placeholder='Job title'
              value={title}
              onChangeText={(v) => {
                clearError();
                setTitle(v);
                markDirty();
              }}
              variant='outline'
              size='lg'
              fullWidth
              required
            />

            <Input
              label='Description'
              placeholder='Describe the work needed'
              value={description}
              onChangeText={(v) => {
                clearError();
                setDescription(v);
                markDirty();
              }}
              multiline
              numberOfLines={4}
              variant='outline'
              size='lg'
              fullWidth
              required
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipContainer}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipSelected]}
                  onPress={() => {
                    clearError();
                    setCategory(cat);
                    markDirty();
                  }}
                  accessibilityRole='button'
                  accessibilityState={{ selected: category === cat }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === cat && styles.chipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    priority === p && styles.priorityChipSelected,
                  ]}
                  onPress={() => {
                    clearError();
                    setPriority(p);
                    markDirty();
                  }}
                  accessibilityRole='button'
                  accessibilityState={{ selected: priority === p }}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      priority === p && styles.priorityChipTextSelected,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label='Budget'
              placeholder='e.g. 500'
              value={budget}
              onChangeText={(v) => {
                clearError();
                setBudget(v.replace(/[^0-9.]/g, ''));
                markDirty();
              }}
              keyboardType='numeric'
              leftIcon='cash-outline'
              variant='outline'
              size='lg'
              fullWidth
            />

            <Input
              label='Location'
              placeholder='Address or area'
              value={location}
              onChangeText={(v) => {
                clearError();
                setLocation(v);
                markDirty();
              }}
              leftIcon='location-outline'
              variant='outline'
              size='lg'
              fullWidth
            />

            <View style={styles.buttonRow}>
              <Button
                variant='secondary'
                title='Cancel'
                onPress={() => navigation.goBack()}
                style={{ flex: 1, borderRadius: 14, marginRight: 8 }}
              />
              <Button
                variant='primary'
                title={saving ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                disabled={saving}
                loading={saving}
                style={{ flex: 1, borderRadius: 14, marginLeft: 8 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerBackBtn: {
    padding: 8,
  },
  headerBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 8,
  },
  chipContainer: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  priorityChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priorityChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  priorityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 40,
  },
});

export default JobEditScreen;
