import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../../DocumentsStyles';
import {
  type Document,
  formatFileSize,
  getDocStyle,
  getFileExtLabel,
} from '../types';
import { DocIcon } from '../../../../components/documents/DocIcon';

/**
 * One document card in the contractor library. Type-coloured left
 * accent + DocIcon paper tile (with extension chip) + filename + meta
 * row + optional star + chevron. Matches the contractor library spec
 * in redesign-v2/documents-web.html.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 * Spec-matched 2026-05-21 (DocIcon paper shape + ext chip).
 */
export function DocumentCard({
  document,
  isContractor,
  onOpen,
  onToggleStar,
}: {
  document: Document;
  isContractor: boolean;
  onOpen: (doc: Document) => void;
  onToggleStar: (doc: Document) => void;
}) {
  const docStyle = getDocStyle(document.category);
  const sizeStr = formatFileSize(document.file_size);
  const extLabel = getFileExtLabel(document.filename);

  return (
    <TouchableOpacity
      style={styles.docCard}
      activeOpacity={0.7}
      onPress={() => onOpen(document)}
    >
      <View style={[styles.docAccent, { backgroundColor: docStyle.color }]} />

      <View style={styles.docContent}>
        <View style={styles.docTopRow}>
          <DocIcon color={docStyle.color} bg={docStyle.bg} ext={extLabel}>
            <Ionicons name={docStyle.icon} size={22} color={docStyle.color} />
          </DocIcon>

          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={1}>
              {document.filename}
            </Text>
            <View style={styles.docMeta}>
              <View
                style={[styles.categoryPill, { backgroundColor: docStyle.bg }]}
              >
                <Text
                  style={[styles.categoryPillText, { color: docStyle.color }]}
                >
                  {document.category.charAt(0).toUpperCase() +
                    document.category.slice(1)}
                </Text>
              </View>
              <Text style={styles.docDate}>
                {new Date(document.uploaded_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              {sizeStr ? <Text style={styles.docSize}>{sizeStr}</Text> : null}
            </View>
          </View>

          <View style={styles.docActions}>
            {isContractor && (
              <TouchableOpacity
                style={styles.starBtn}
                onPress={() => onToggleStar(document)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={
                  document.starred ? 'Unstar document' : 'Star document'
                }
              >
                <Ionicons
                  name={document.starred ? 'star' : 'star-outline'}
                  size={18}
                  color={document.starred ? me.accent : me.ink3}
                />
              </TouchableOpacity>
            )}
            <Ionicons name='chevron-forward' size={16} color={me.ink3} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
