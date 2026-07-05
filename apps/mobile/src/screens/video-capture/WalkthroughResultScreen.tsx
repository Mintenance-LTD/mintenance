/**
 * Walkthrough Result Screen (Phase C).
 *
 * Renders the merged property survey returned by POST /api/assessments/walkthrough
 * using the same AIAnalysisCard the job-details + photo-assessment flows use, so
 * the multi-finding output looks identical everywhere. Reached from the standalone
 * "AI Video Walkthrough" capture flow once the assessment completes.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AIAnalysisCard } from '../job-details/components';
import { me } from '../../design-system/mint-editorial';

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      assessment: Record<string, unknown>;
      frameCount?: number;
      framesAssessed?: number;
    };
  };
}

export const WalkthroughResultScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { assessment, frameCount, framesAssessed } = route.params;

  // AIAnalysisCard reads everything from `assessmentData`; the legacy AIAnalysis
  // fields are unused on the rich path, so minimal defaults are fine.
  const aiAnalysis = {
    confidence:
      (assessment?.damageAssessment as { confidence?: number } | undefined)
        ?.confidence ?? 0,
    detectedItems: [],
    safetyConcerns: [],
    recommendedActions: [],
    estimatedComplexity: 'Low' as const,
    suggestedTools: [],
    estimatedDuration: '',
    assessmentData: assessment,
    source: 'mobile_walkthrough',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          style={styles.backBtn}
        >
          <Icon name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole='header'>
          Walkthrough Survey
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {typeof framesAssessed === 'number' && (
          <Text style={styles.meta}>
            {framesAssessed} of {frameCount ?? framesAssessed} frames analysed
          </Text>
        )}

        <AIAnalysisCard aiAnalysis={aiAnalysis} aiLoading={false} />

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: me.ink },
  scroll: { padding: 16, paddingBottom: 40 },
  meta: { fontSize: 13, color: me.ink3, marginBottom: 12 },
  doneBtn: {
    marginTop: 24,
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: { color: me.onBrand, fontSize: 16, fontWeight: '600' },
});
