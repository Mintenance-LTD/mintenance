/**
 * QuoteHeader — Project details with editable title and template picker
 *
 * Actual TextInput for project title, template selector with icon.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface QuoteHeaderProps {
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  onTemplatePress: () => void;
  selectedTemplate: string;
  templates: { id: string; name: string }[];
}

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
  projectTitle,
  setProjectTitle,
  onTemplatePress,
  selectedTemplate,
  templates,
}) => {
  const selectedTemplateName =
    templates.find((t) => t.id === selectedTemplate)?.name || '';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name='document-text' size={16} color={me.brand} />
        </View>
        <Text style={styles.sectionTitle}>Project Details</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Title</Text>
        <TextInput
          style={styles.textInput}
          value={projectTitle}
          onChangeText={setProjectTitle}
          placeholder='e.g. Bathroom Renovation Quote'
          placeholderTextColor={me.ink3}
          accessibilityLabel='Project title'
        />
      </View>

      <TouchableOpacity style={styles.templateButton} onPress={onTemplatePress}>
        <View style={styles.templateIconWrap}>
          <Ionicons name='copy-outline' size={18} color={me.brand} />
        </View>
        <View style={styles.templateButtonText}>
          <Text style={styles.templateButtonLabel}>Quote Template</Text>
          <Text style={styles.templateButtonValue} numberOfLines={1}>
            {selectedTemplateName || 'Choose a template (optional)'}
          </Text>
        </View>
        <Ionicons name='chevron-forward' size={18} color={me.ink3} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    ...me.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: me.bg2,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: me.ink,
    borderWidth: 1,
    borderColor: me.line,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.bg2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: me.line,
    gap: 12,
  },
  templateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateButtonText: {
    flex: 1,
  },
  templateButtonLabel: {
    fontSize: 11,
    color: me.ink2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  templateButtonValue: {
    fontSize: 15,
    color: me.ink,
    fontWeight: '500',
  },
});
