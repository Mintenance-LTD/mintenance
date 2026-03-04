import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface TermsSectionProps {
  termsAccepted: boolean;
  onToggleTerms: () => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
}

export const TermsSection: React.FC<TermsSectionProps> = ({
  termsAccepted,
  onToggleTerms,
  onShowTerms,
  onShowPrivacy,
}) => {
  return (
    <>
      <View style={styles.termsContainer}>
        <TouchableOpacity
          testID="terms-checkbox"
          style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
          onPress={onToggleTerms}
          accessibilityRole='checkbox'
          accessibilityLabel='Accept terms and conditions'
          accessibilityHint='Double tap to toggle acceptance of terms and conditions'
          accessibilityState={{ checked: termsAccepted }}
        >
          {termsAccepted ? (
            <Ionicons name='checkmark' size={14} color='#FFFFFF' />
          ) : null}
        </TouchableOpacity>
        <Text style={styles.termsLabel}>I accept the terms and conditions</Text>
      </View>

      <Text style={styles.termsText}>
        By signing up, you agree to our{' '}
        <Text style={styles.linkInline}>Terms & Privacy Policy</Text>
      </Text>

      <View style={styles.linksRow}>
        <TouchableOpacity
          onPress={onShowTerms}
          accessibilityRole='link'
          accessibilityLabel='View terms and conditions'
          accessibilityHint='Double tap to read the full terms and conditions'
        >
          <Text style={styles.linkText}>Terms and Conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShowPrivacy}
          accessibilityRole='link'
          accessibilityLabel='View privacy policy'
          accessibilityHint='Double tap to read the full privacy policy'
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

interface TermsModalProps {
  visible: boolean;
  title: string;
  testID: string;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  visible,
  title,
  testID,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View testID={testID}>
      <Text>{title} Content</Text>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole='button'
        accessibilityLabel={`Close ${title}`}
      >
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  termsLabel: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  linkInline: {
    color: '#222222',
    fontWeight: '500',
    textDecorationLine: 'underline' as const,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  linkText: {
    color: theme.colors.textPrimary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
