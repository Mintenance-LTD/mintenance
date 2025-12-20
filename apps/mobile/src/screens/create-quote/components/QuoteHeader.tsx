/**
 * QuoteHeader Component
 * 
 * Header section with project title and template selection.
 * 
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Header display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface QuoteHeaderProps {
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  onTemplatePress: () => void;
  selectedTemplate: string;
  templates: Array<{ id: string; name: string }>;
}

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
  projectTitle,
  setProjectTitle: _setProjectTitle,
  onTemplatePress,
  selectedTemplate,
  templates,
}) => {
  const selectedTemplateName = templates.find(t => t.id === selectedTemplate)?.name || '';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Project Details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Project Title</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.input}>{projectTitle || 'Enter project title'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.templateButton} onPress={onTemplatePress}>
        <View style={styles.templateButtonContent}>
          <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          <View style={styles.templateButtonText}>
            <Text style={styles.templateButtonLabel}>Quote Template</Text>
            <Text style={styles.templateButtonValue}>
              {selectedTemplateName || 'Select template'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  input: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  templateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateButtonText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  templateButtonLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  templateButtonValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
