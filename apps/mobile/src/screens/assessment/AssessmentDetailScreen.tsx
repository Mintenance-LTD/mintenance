/**
 * Re-open a saved survey.
 *
 * Renders the stored assessment through the same AIAnalysisCard the live
 * walkthrough result uses, so a survey looks identical whether you are seeing
 * it for the first time or a month later — including the frame each finding
 * was read from.
 *
 * Frames come from assessment_images, whose image_index is exactly the index
 * findings carry in `sourceFrameIndex`. That is why provenance was stored as an
 * index rather than a URL: signed URLs expire, the index does not.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { AIAnalysisCard } from '../job-details/components';
import { me } from '../../design-system/mint-editorial';

interface StatusResponse {
  id: string;
  status: string;
  isFailed?: boolean;
  assessment: {
    damageType?: string | null;
    severity?: string | null;
    confidence?: number | null;
    urgency?: string | null;
    data?: Record<string, unknown> | null;
  } | null;
  images?: { image_url: string; image_index: number | null }[];
}

interface Props {
  navigation: { goBack: () => void };
  route: { params: { assessmentId: string; title?: string } };
}

export const AssessmentDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { assessmentId, title } = route.params;

  const [data, setData] = useState<StatusResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await mobileApiClient.get<StatusResponse>(
        `/api/assessments/${encodeURIComponent(assessmentId)}/status`
      );
      setData(res);
      setLoadFailed(false);
    } catch (error) {
      logger.warn('Failed to load assessment', { error, assessmentId });
      setLoadFailed(true);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Rebuild the frame list in index order so findings' sourceFrameIndex lines
  // up. Sorting explicitly rather than trusting the response order: a gap or a
  // reorder would otherwise pair a finding with the wrong picture, which is
  // worse than showing none.
  const frameUrls = (() => {
    const images = data?.images ?? [];
    if (images.length === 0) return undefined;
    const out: string[] = [];
    for (const img of images) {
      const idx = typeof img.image_index === 'number' ? img.image_index : null;
      if (idx === null) continue;
      out[idx] = img.image_url;
    }
    return out;
  })();

  const assessmentData = data?.assessment?.data ?? null;

  // AIAnalysisCard falls back to a legacy card built from the flat fields below
  // whenever `assessmentData.damageAssessment` is missing. Hardcoding them —
  // which is what WalkthroughResultScreen used to do — makes that fallback
  // assert a confident "Low complexity" about a survey it knows nothing about.
  // Derive from the row's own severity instead (same mapping as the walkthrough
  // screen and JobDetailsViewModel).
  const severity = data?.assessment?.severity ?? undefined;
  const complexity: 'Low' | 'Medium' | 'High' =
    severity === 'dangerous' || severity === 'significant'
      ? 'High'
      : severity === 'developing'
        ? 'Medium'
        : 'Low';

  const urgencyLabel = data?.assessment?.urgency;

  const aiAnalysis = assessmentData
    ? {
        // The card re-derives this from assessmentData when it can; this is the
        // fallback for rows whose JSON predates the richer shape.
        confidence: data?.assessment?.confidence ?? 0,
        detectedItems: [],
        safetyConcerns: [],
        recommendedActions: [],
        estimatedComplexity: complexity,
        suggestedTools: [],
        estimatedDuration: urgencyLabel ?? 'Not estimated',
        assessmentData,
        source: 'assessment_history',
      }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          style={styles.backBtn}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole='header'>
          {title ?? 'Survey'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loadFailed === null && (
          <ActivityIndicator style={styles.spinner} color={me.brand} />
        )}

        {loadFailed === true && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              We couldn&apos;t load this survey.
            </Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.noticeAction}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadFailed === false && !aiAnalysis && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {data?.isFailed
                ? 'This survey did not complete, so there are no results to show.'
                : 'This survey is still being analysed. Check back shortly.'}
            </Text>
          </View>
        )}

        {aiAnalysis && (
          <>
            {frameUrls && frameUrls.length > 0 && (
              <Text style={styles.meta}>
                {frameUrls.filter(Boolean).length} frame
                {frameUrls.filter(Boolean).length === 1 ? '' : 's'} kept with
                this survey
              </Text>
            )}
            <AIAnalysisCard
              aiAnalysis={aiAnalysis}
              aiLoading={false}
              frameUrls={frameUrls}
            />
          </>
        )}
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
  spinner: { marginTop: 24 },
  meta: { fontSize: 12, color: me.ink3, marginBottom: 10 },
  notice: { backgroundColor: me.warnBg, borderRadius: 12, padding: 14, gap: 6 },
  noticeText: { fontSize: 13, color: me.warnFg },
  noticeAction: { fontSize: 13, fontWeight: '700', color: me.warnFg },
});
