/**
 * ContractSignatureSection - Signatures card and accepted banner
 * Extracted from ContractViewScreen to keep file size manageable.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface Contract {
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  status: string;
}

interface ContractSignatureSectionProps {
  contract: Contract;
  formatDate: (dateStr: string) => string;
}

export const ContractSignatureSection: React.FC<
  ContractSignatureSectionProps
> = ({ contract, formatDate }) => {
  return (
    <>
      <View style={styles.signaturesCard}>
        <Text style={styles.signaturesTitle}>Signatures</Text>

        <View style={styles.signatureRow}>
          <Ionicons
            name={
              contract.contractor_signed_at
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={24}
            color={
              contract.contractor_signed_at
                ? theme.colors.primary
                : theme.colors.textTertiary
            }
          />
          <View style={styles.signatureInfo}>
            <Text style={styles.signatureLabel}>
              Contractor {contract.contractor_signed_at ? 'signed' : 'pending'}
            </Text>
            {contract.contractor_signed_at && (
              <Text style={styles.signatureDate}>
                {formatDate(contract.contractor_signed_at)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.signatureRow}>
          <Ionicons
            name={
              contract.homeowner_signed_at
                ? 'checkmark-circle'
                : 'ellipse-outline'
            }
            size={24}
            color={
              contract.homeowner_signed_at
                ? theme.colors.primary
                : theme.colors.textTertiary
            }
          />
          <View style={styles.signatureInfo}>
            <Text style={styles.signatureLabel}>
              Homeowner {contract.homeowner_signed_at ? 'signed' : 'pending'}
            </Text>
            {contract.homeowner_signed_at && (
              <Text style={styles.signatureDate}>
                {formatDate(contract.homeowner_signed_at)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {contract.status === 'accepted' && (
        <View style={styles.acceptedBanner}>
          <Ionicons
            name='checkmark-circle'
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.acceptedText}>
            Contract accepted! Both parties have signed.
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  signaturesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  signaturesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  signatureInfo: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  signatureDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 16,
    padding: 16,
  },
  acceptedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primaryDark,
  },
});
