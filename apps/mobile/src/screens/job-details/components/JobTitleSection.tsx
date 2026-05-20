import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../jobDetailsStyles';

/**
 * Title + category chip + urgency tag + location + posted-time row.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function JobTitleSection({
  title,
  category,
  urgency,
  locationStr,
  daysAgo,
}: {
  title: string;
  category?: string;
  urgency: string;
  locationStr: string;
  daysAgo: number;
}) {
  const isUrgent = urgency !== 'low' && urgency !== 'medium';

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.tagRow}>
        {category && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </View>
        )}
        {isUrgent && (
          <View style={[styles.tag, styles.urgentTag]}>
            <Ionicons name='flame' size={12} color={me.errFg} />
            <Text style={[styles.tagText, { color: me.errFg }]}>
              {urgency === 'emergency' ? 'Emergency' : 'Urgent'}
            </Text>
          </View>
        )}
      </View>

      {locationStr ? (
        <View style={styles.locationRow}>
          <Ionicons name='location-outline' size={16} color={me.ink2} />
          <Text style={styles.locationText}>{locationStr}</Text>
        </View>
      ) : null}

      <Text style={styles.metaText}>
        Posted{' '}
        {daysAgo === 0
          ? 'today'
          : daysAgo === 1
            ? '1 day ago'
            : `${daysAgo} days ago`}
      </Text>
    </View>
  );
}
