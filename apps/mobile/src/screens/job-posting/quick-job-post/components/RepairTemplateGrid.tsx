import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../theme/styles';
import { REPAIR_TEMPLATES, type RepairTemplate } from '../theme/templates';

/**
 * Six-card grid of pre-canned repair templates. Selecting a template
 * fills the title/description/budget/category fields.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function RepairTemplateGrid({
  selectedTemplate,
  onSelect,
}: {
  selectedTemplate: string | null;
  onSelect: (template: RepairTemplate) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Common Repairs</Text>
      <View style={styles.templateGrid}>
        {REPAIR_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              selectedTemplate === template.id && styles.templateCardActive,
            ]}
            onPress={() => onSelect(template)}
          >
            <View
              style={[
                styles.templateIconCircle,
                { backgroundColor: template.iconBg },
              ]}
            >
              <Ionicons
                name={template.icon}
                size={20}
                color={template.iconColor}
              />
            </View>
            <Text
              style={[
                styles.templateTitle,
                selectedTemplate === template.id && styles.templateTitleActive,
              ]}
            >
              {template.title}
            </Text>
            <Text style={styles.templateBudget}>{template.budgetRange}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
