/**
 * Building Assessment Card Component
 * Displays comprehensive AI building assessment results
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import UnifiedAIServiceMobile from '../../services/UnifiedAIServiceMobile';
import { theme } from '../../theme';
import { logger } from '../../utils/logger';
import { BuildingAssessment, BuildingAssessmentCardProps } from './building-assessment/types';
import { RunAssessmentButton, LoadingState } from './building-assessment/AssessmentStates';
import { AssessmentHeader } from './building-assessment/AssessmentHeader';
import { AssessmentBody } from './building-assessment/AssessmentBody';

export const BuildingAssessmentCard: React.FC<BuildingAssessmentCardProps> = ({
  images,
  jobDetails,
  onAssessmentComplete,
  onCorrection,
}) => {
  const [assessment, setAssessment] = useState<BuildingAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const runAssessment = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please add photos to run AI assessment');
      return;
    }
    setLoading(true);
    try {
      const result = await UnifiedAIServiceMobile.assessBuilding(images, jobDetails);
      if (result) {
        setAssessment(result);
        onAssessmentComplete?.(result);
        if (result.safetyHazards.criticalFlags.length > 0) {
          Alert.alert(
          'Safety Hazards Detected',
          'Critical safety issues: ' + result.safetyHazards.criticalFlags.join(', '),
          [{ text: 'Acknowledge', style: 'default' }]
          );
        }
      }
    } catch (error) {
      logger.error('Assessment failed:', error, { service: 'ui' });
      Alert.alert('Assessment Failed', 'Unable to analyze images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitCorrections = async () => {
    if (!assessment) return;
    const corrections = [{
      field: 'damageType',
      originalValue: assessment.damageAssessment.damageType,
      correctedValue: 'water_damage',
      userId: 'user_id',
      timestamp: new Date().toISOString(),
      confidence: 0.9,
    }];
    const success = await UnifiedAIServiceMobile.submitCorrections(assessment.id, corrections);
    if (success) {
      Alert.alert('Success', 'Your corrections have been submitted for model training');
      onCorrection?.(assessment.id, corrections);
    }
  };

  if (!assessment && !loading) {
    return <RunAssessmentButton onPress={runAssessment} disabled={loading || images.length === 0} />;
  }
  if (loading) return <LoadingState />;
  if (!assessment) return null;

  return (
    <View style={styles.container}>
      <AssessmentHeader assessment={assessment} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
      {expanded && (
        <AssessmentBody assessment={assessment} onSubmitCorrections={submitCorrections} onRerun={runAssessment} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background, borderRadius: 12, marginVertical: 8 },
});