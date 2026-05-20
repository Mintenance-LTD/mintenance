import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Title + description inputs.
 *
 * The "What needs fixing?" title input is hidden whenever a template
 * is selected OR the user arrived with a category pre-filled from the
 * Where/When/What search modal — in both cases `title` already has a
 * sensible default (the template name, or e.g. "Carpentry issue") and
 * asking the user to re-confirm it was the historical "I'm forced to
 * do that again" gripe on the quick-post flow. When they DID start
 * from a blank slate, we keep the title field since we need 5+ chars.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function IssueDescription({
  title,
  setTitle,
  description,
  setDescription,
  showTitleInput,
}: {
  title: string;
  setTitle: (next: string) => void;
  description: string;
  setDescription: (next: string) => void;
  showTitleInput: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Describe Your Issue</Text>
      {showTitleInput && (
        <>
          <Text style={styles.inputLabel}>What needs fixing?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder='e.g., Leaking kitchen tap'
            placeholderTextColor={me.ink3}
          />
        </>
      )}
      <Text style={styles.inputLabel}>Brief description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder='Add any helpful details...'
        placeholderTextColor={me.ink3}
        multiline
        numberOfLines={3}
        textAlignVertical='top'
      />
    </View>
  );
}
