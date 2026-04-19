/**
 * PostJobWizardScreen — Silver-mode-friendly 3-step job-posting flow
 * for the mobile app.
 *
 * R3 #5b of docs/RETENTION_ROADMAP_2026.md. Sits alongside the existing
 * JobPostingScreen (which is a single-scroll form) — this is the
 * opt-in wizard preferred by the 65+ segment.
 *
 * Reuses the existing POST /api/jobs (via mobileApiClient) so there's
 * no new server code.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { theme } from '../../theme';
import { silverFontSize, SILVER_SCALE } from '../../theme/silverModeState';
import { useSilverMode } from '../../hooks/useSilverMode';

const STEPS = ['What', 'Where', 'When'] as const;

const CATEGORIES = [
  'handyman',
  'plumbing',
  'electrical',
  'painting',
  'carpentry',
  'cleaning',
  'gardening',
  'roofing',
  'heating',
  'flooring',
];

export const PostJobWizardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { silverMode } = useSilverMode();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('handyman');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [contractorBeforePhotos, setContractorBeforePhotos] = useState(false);

  const bodySize = silverFontSize(15);
  const titleSize = silverFontSize(22);
  const minTouch = silverMode ? 56 : 44;

  const canAdvance =
    (step === 0 && title.trim().length >= 5) ||
    (step === 1 && location.trim().length >= 3) ||
    (step === 2 && /^\d+(\.\d+)?$/.test(budget));

  const submit = async () => {
    setSubmitting(true);
    try {
      await mobileApiClient.post('/api/jobs', {
        title,
        category,
        description,
        location,
        budget: Number(budget),
        requirements: { contractor_before_photos: contractorBeforePhotos },
      });
      Alert.alert('Job posted', 'Contractors in your area will see it now.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        'Post failed',
        err instanceof Error ? err.message : 'Please try again'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: titleSize }]}>
          Post a new job
        </Text>
        <Text style={styles.stepLabel}>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </Text>
      </View>

      <View style={[styles.card, { padding: silverMode ? 20 : 16 }]}>
        {step === 0 && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.fieldLabel, { fontSize: bodySize }]}>
              What needs doing?
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder='e.g. Fix a leaking kitchen tap'
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                { minHeight: minTouch, fontSize: bodySize },
              ]}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { fontSize: bodySize }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={{ gap: 8 }}
              showsHorizontalScrollIndicator={false}
            >
              {CATEGORIES.map((c) => {
                const selected = c === category;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                      { minHeight: minTouch },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                        { fontSize: bodySize },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.fieldLabel, { fontSize: bodySize }]}>
              Details (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder='Any details that help contractors quote accurately.'
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                { minHeight: 96, fontSize: bodySize, textAlignVertical: 'top' },
              ]}
            />
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.fieldLabel, { fontSize: bodySize }]}>
              Where is the job?
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder='Postcode or address'
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
              style={[
                styles.input,
                { minHeight: minTouch, fontSize: bodySize },
              ]}
            />
            <Text style={[styles.helpText, { fontSize: bodySize - 2 }]}>
              Your exact address is only shared with the contractor after you
              accept their bid.
            </Text>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 14 }}>
            <Text style={[styles.fieldLabel, { fontSize: bodySize }]}>
              Budget (£)
            </Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder='e.g. 150'
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType='numeric'
              autoFocus
              style={[
                styles.input,
                { minHeight: minTouch, fontSize: bodySize },
              ]}
            />
            <TouchableOpacity
              onPress={() => setContractorBeforePhotos(!contractorBeforePhotos)}
              style={[
                styles.optionCard,
                contractorBeforePhotos && styles.optionCardSelected,
              ]}
            >
              <Ionicons
                name={
                  contractorBeforePhotos
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={silverMode ? 28 : 24}
                color={theme.colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.optionTitle, { fontSize: bodySize }]}>
                  Let the contractor take before-photos on arrival
                </Text>
                <Text style={[styles.optionDesc, { fontSize: bodySize - 2 }]}>
                  Skip the photo upload — the contractor captures before-photos
                  with GPS verification when they arrive.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {step > 0 ? (
          <TouchableOpacity
            style={[styles.navBtn, { minHeight: minTouch }]}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons
              name='arrow-back'
              size={18}
              color={theme.colors.textPrimary}
            />
            <Text style={[styles.navBtnText, { fontSize: bodySize }]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              !canAdvance && styles.primaryBtnDisabled,
              { minHeight: minTouch },
            ]}
            onPress={() => canAdvance && setStep(step + 1)}
            disabled={!canAdvance}
          >
            <Text style={[styles.primaryBtnText, { fontSize: bodySize }]}>
              Next
            </Text>
            <Ionicons
              name='arrow-forward'
              size={18}
              color={theme.colors.surface}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!canAdvance || submitting) && styles.primaryBtnDisabled,
              { minHeight: minTouch },
            ]}
            onPress={() => canAdvance && submit()}
            disabled={!canAdvance || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { fontSize: bodySize }]}>
                  Post job
                </Text>
                <Ionicons
                  name='checkmark'
                  size={18}
                  color={theme.colors.surface}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  fieldLabel: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  helpText: {
    color: theme.colors.textSecondary,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionCardSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  optionTitle: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  navBtnText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    minWidth: 140,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
});

// Unused import safe-guard so SILVER_SCALE stays referenced (tree-shake proof).
void SILVER_SCALE;

export default PostJobWizardScreen;
