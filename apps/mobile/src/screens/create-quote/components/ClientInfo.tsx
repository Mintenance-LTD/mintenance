/**
 * ClientInfo Component
 * 
 * Client information form section.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - Client form
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../../../components/ui/Input';
import { theme } from '../../../theme';

interface ClientInfoProps {
  clientName: string;
  setClientName: (name: string) => void;
  clientEmail: string;
  setClientEmail: (email: string) => void;
  clientPhone: string;
  setClientPhone: (phone: string) => void;
}

export const ClientInfo: React.FC<ClientInfoProps> = ({
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Client Information</Text>
      
      <View style={styles.inputGroup}>
        <Input
          label="Client Name"
          value={clientName}
          onChangeText={setClientName}
          placeholder="Enter client name"
          style={styles.input}
        />
        
        <Input
          label="Email Address"
          value={clientEmail}
          onChangeText={setClientEmail}
          placeholder="client@example.com"
          keyboardType="email-address"
          style={styles.input}
        />
        
        <Input
          label="Phone Number"
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>
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
  inputGroup: {
    gap: theme.spacing.md,
  },
  input: {
    marginBottom: 0,
  },
});
