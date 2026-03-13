/**
 * QuoteHeader — Project details with editable title and template picker
 *
 * Actual TextInput for project title, template selector with icon.
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const selectedTemplateName = templates.find(t => t.id === selectedTemplate)?.name || '';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name="document-text" size={16} color="#10B981" />
        </View>
        <Text style={styles.sectionTitle}>Project Details</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Title</Text>
        <TextInput
          style={styles.textInput}
          value={projectTitle}
          onChangeText={setProjectTitle}
          placeholder="e.g. Bathroom Renovation Quote"
          placeholderTextColor="#B0B0B0"
          accessibilityLabel="Project title"
        />
      </View>

      <TouchableOpacity style={styles.templateButton} onPress={onTemplatePress}>
        <View style={styles.templateIconWrap}>
          <Ionicons name="copy-outline" size={18} color="#10B981" />
        </View>
        <View style={styles.templateButtonText}>
          <Text style={styles.templateButtonLabel}>Quote Template</Text>
          <Text style={styles.templateButtonValue} numberOfLines={1}>
            {selectedTemplateName || 'Choose a template (optional)'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
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
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#717171',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    gap: 12,
  },
  templateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateButtonText: {
    flex: 1,
  },
  templateButtonLabel: {
    fontSize: 11,
    color: '#717171',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  templateButtonValue: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '500',
  },
});
