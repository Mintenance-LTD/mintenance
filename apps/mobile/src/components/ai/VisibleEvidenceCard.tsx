import React from 'react';
import { View, Text } from 'react-native';

import { type ObservationResult } from '../../services/observationResult';
export {
  isObservationResult,
  type ObservationResult,
} from '../../services/observationResult';

export function VisibleEvidenceCard({
  assessment,
}: {
  assessment: ObservationResult;
}) {
  const photos = assessment.visualEvidence?.photos;
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Text
        accessibilityRole='header'
        style={{ fontSize: 20, fontWeight: '600' }}
      >
        Visible findings from your photos
      </Text>
      {Array.isArray(photos) &&
        photos.map((photo) => (
          <View key={photo.photoIndex} style={{ gap: 8 }}>
            <Text style={{ fontWeight: '600' }}>
              Photo {photo.photoIndex + 1}
            </Text>
            {photo.observation.outcome === 'no_visible_defect' && (
              <Text>No visible defect in the photographed region.</Text>
            )}
            {photo.observation.observations.map((item, i) => (
              <Text key={i}>{item.description}</Text>
            ))}
            {photo.observation.limitations.map((item, i) => (
              <Text key={i}>{item}</Text>
            ))}
          </View>
        ))}
      {!Array.isArray(photos) && (
        <Text>
          Visible findings are not available yet. Please check the assessment
          status.
        </Text>
      )}
      <Text style={{ fontWeight: '600' }}>What remains unknown</Text>
      <Text>
        Cause, structural significance, safety and repair cost are not
        established by these photos. Include a wider view, a clear close-up and
        a scale reference for review.
      </Text>
    </View>
  );
}
