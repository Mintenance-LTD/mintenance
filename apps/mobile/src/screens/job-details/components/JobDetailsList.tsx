import React from 'react';
import { View, Text } from 'react-native';
import { DetailRow } from './DetailRow';
import { styles } from '../jobDetailsStyles';

/**
 * The "Details" panel — Category / Urgency / Timeline rows.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function JobDetailsList({
  category,
  urgency,
  status,
}: {
  category?: string;
  urgency?: string;
  status?: string;
}) {
  return (
    <View style={styles.sectionPadded}>
      <Text style={styles.sectionLabel}>Details</Text>
      <DetailRow
        icon='grid-outline'
        label='Category'
        value={
          category
            ? category.charAt(0).toUpperCase() + category.slice(1)
            : 'General'
        }
      />
      <DetailRow
        icon='alert-circle-outline'
        label='Urgency'
        value={
          urgency
            ? urgency.charAt(0).toUpperCase() + urgency.slice(1)
            : 'Medium'
        }
      />
      <DetailRow
        icon='calendar-outline'
        label='Timeline'
        value={
          status === 'completed'
            ? 'Completed'
            : status === 'in_progress'
              ? 'In Progress'
              : 'Awaiting start'
        }
      />
    </View>
  );
}
