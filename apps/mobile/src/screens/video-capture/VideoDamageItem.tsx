/**
 * Damage item row for VideoProcessingStatusScreen.
 * Extracted to keep the parent screen under 500 lines.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../../theme';
import { styles } from './videoProcessingStatusStyles';
import {
  normalizeSeverity,
  type SeverityTier,
} from '../../utils/severityUtils';

export interface DamageData {
  instance_count: number;
  average_confidence: number;
  temporal_coverage: number;
  severity_estimate: string;
}

const severityColors: Record<SeverityTier, string> = {
  early: theme.colors.primary,
  developing: '#A16207',
  significant: theme.colors.accent,
  dangerous: theme.colors.error,
};

interface Props {
  type: string;
  data: DamageData;
}

export const VideoDamageItem: React.FC<Props> = ({ type, data }) => (
  <View style={styles.damageItem}>
    <View style={styles.damageHeader}>
      <Text style={styles.damageType}>{type}</Text>
      <View
        style={[
          styles.severityBadge,
          {
            backgroundColor:
              severityColors[normalizeSeverity(data.severity_estimate)],
          },
        ]}
      >
        <Text style={styles.severityText}>{data.severity_estimate}</Text>
      </View>
    </View>
    <View style={styles.damageDetails}>
      <Text style={styles.damageDetailText}>
        Instances: {data.instance_count}
      </Text>
      <Text style={styles.damageDetailText}>
        Confidence: {(data.average_confidence * 100).toFixed(1)}%
      </Text>
      <Text style={styles.damageDetailText}>
        Coverage: {(data.temporal_coverage * 100).toFixed(1)}%
      </Text>
    </View>
  </View>
);
