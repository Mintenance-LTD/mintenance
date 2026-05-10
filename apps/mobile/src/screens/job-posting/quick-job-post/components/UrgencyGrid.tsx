import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../theme/styles';
import { URGENCY_OPTIONS } from '../theme/templates';

/**
 * Urgency chip picker (Today / Tomorrow / This Week / Not Urgent).
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function UrgencyGrid({
  urgency,
  onChange,
}: {
  urgency: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How urgent is this?</Text>
      <View style={styles.urgencyGrid}>
        {URGENCY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.urgencyChip,
              { backgroundColor: opt.color },
              urgency === opt.value && styles.urgencyChipActive,
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.urgencyText, { color: opt.textColor }]}>
              {opt.label}
            </Text>
            {urgency === opt.value && (
              <Ionicons name='checkmark' size={16} color={opt.textColor} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
