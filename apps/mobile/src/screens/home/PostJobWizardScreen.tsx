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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { validateJobDraft, type Urgency } from '@mintenance/api-contracts';
import { me } from '../../design-system/mint-editorial';
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
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [contractorBeforePhotos, setContractorBeforePhotos] = useState(false);

  const bodySize = silverFontSize(15);
  const titleSize = silverFontSize(22);
  const minTouch = silverMode ? 56 : 44;

  const canAdvance =
    (step === 0 && title.trim().length >= 5) ||
    (step === 1 && location.trim().length >= 3) ||
    step === 2;

  const submit = async () => {
    setSubmitting(true);
    try {
      // 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
      // run the canonical schema before posting so silver-mode users see
      // the same error message the route would have rejected with.
      const draftValidation = validateJobDraft({
        title,
        description,
        location,
        urgency,
        category: category as
          | import('@mintenance/api-contracts').JobCategory
          | undefined,
        requirements: { contractor_before_photos: contractorBeforePhotos },
      });
      if (!draftValidation.ok) {
        const first = draftValidation.errors[0];
        Alert.alert(
          'Cannot post yet',
          first?.message ?? 'Please review the form and try again.'
        );
        setSubmitting(false);
        return;
      }
      // jobs.requirements is a real jsonb column (live audit 2026-04-28
      // showed 16 prod rows already use it). The /api/jobs Zod schema
      // now accepts `requirements: z.record(z.string(), z.unknown())`
      // and JobCreationService writes it through to the row, so the
      // silver-mode contractor_before_photos flag finally persists.
      await mobileApiClient.post('/api/jobs', draftValidation.payload);
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
              placeholderTextColor={me.ink2}
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
              placeholderTextColor={me.ink2}
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
              placeholderTextColor={me.ink2}
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
              When do you need this done?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(
                [
                  { value: 'low', label: 'Flexible' },
                  { value: 'medium', label: 'Soon' },
                  { value: 'high', label: 'Urgent' },
                  { value: 'emergency', label: 'Emergency' },
                ] as const
              ).map((opt) => {
                const active = urgency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setUrgency(opt.value)}
                    style={[
                      styles.chip,
                      active && styles.chipSelected,
                      { minHeight: minTouch },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextSelected,
                        { fontSize: bodySize },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.helpText, { fontSize: bodySize - 2 }]}>
              Contractors will quote their own price — you choose the bid that
              suits you best.
            </Text>
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
                color={me.brand}
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
            <Ionicons name='arrow-back' size={18} color={me.ink} />
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
            <Ionicons name='arrow-forward' size={18} color={me.surface} />
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
              <ActivityIndicator color={me.surface} />
            ) : (
              <>
                <Text style={[styles.primaryBtnText, { fontSize: bodySize }]}>
                  Post job
                </Text>
                <Ionicons name='checkmark' size={18} color={me.surface} />
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
    backgroundColor: me.bg2,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    ...me.shadow.card,
  },
  fieldLabel: {
    fontWeight: '600',
    color: me.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: me.ink,
    backgroundColor: me.surface,
  },
  helpText: {
    color: me.ink2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  chipText: {
    color: me.ink2,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: me.brand,
    fontWeight: '700',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  optionCardSelected: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  optionTitle: {
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  optionDesc: {
    color: me.ink2,
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
    color: me.ink,
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
    backgroundColor: me.brand,
    minWidth: 140,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: me.surface,
    fontWeight: '700',
  },
});

// Unused import safe-guard so SILVER_SCALE stays referenced (tree-shake proof).
void SILVER_SCALE;

export default PostJobWizardScreen;
