import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { styles } from '../../DocumentsStyles';
import { EMPTY_MESSAGES, FILTER_CONFIG, type DocFilter } from '../types';

/**
 * Per-filter empty state with optional "Upload Document" CTA for
 * contractors. Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 */
export function DocumentsEmptyState({
  filter,
  isContractor,
  onUpload,
}: {
  filter: DocFilter;
  isContractor: boolean;
  onUpload: () => void;
}) {
  const message = EMPTY_MESSAGES[filter];
  const icon =
    FILTER_CONFIG.find((f) => f.key === filter)?.icon ?? 'document-outline';

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{message.title}</Text>
      <Text style={styles.emptyDesc}>{message.desc}</Text>
      {isContractor && (
        <TouchableOpacity style={styles.emptyUploadBtn} onPress={onUpload}>
          <Ionicons
            name='cloud-upload-outline'
            size={18}
            color={theme.colors.textInverse}
          />
          <Text style={styles.emptyUploadText}>Upload Document</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
