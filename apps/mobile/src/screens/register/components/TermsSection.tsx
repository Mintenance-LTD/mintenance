import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
      <TouchableOpacity
        testID='terms-checkbox'
        style={styles.termsContainer}
        onPress={onToggleTerms}
        accessibilityRole='checkbox'
        accessibilityLabel='Accept terms and conditions'
        accessibilityHint='Double tap to toggle acceptance of terms and conditions'
        accessibilityState={{ checked: termsAccepted }}
        activeOpacity={0.7}
      >
        <View
          style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
        >
          {termsAccepted ? (
            <Ionicons name='checkmark' size={16} color={me.onBrand} />
          ) : null}
        </View>
        <Text style={styles.termsLabel}>I accept the terms and conditions</Text>
      </TouchableOpacity>

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
    minHeight: 44,
    marginBottom: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: me.line,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  termsLabel: {
    marginLeft: 8,
    color: me.ink2,
  },
  termsText: {
    fontSize: 12,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  linkInline: {
    color: me.brand,
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
    color: me.brand,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
