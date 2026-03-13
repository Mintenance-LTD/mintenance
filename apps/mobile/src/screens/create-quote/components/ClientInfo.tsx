/**
 * ClientInfo — Client contact form with context hints
 *
 * Name, email (with send hint), phone inputs with icons.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';

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
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name="person" size={16} color="#3B82F6" />
        </View>
        <Text style={styles.sectionTitle}>Client Information</Text>
      </View>

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
        <View style={styles.hintRow}>
          <Ionicons name="mail-outline" size={12} color="#B0B0B0" />
          <Text style={styles.hintText}>The quote will be sent to this email address</Text>
        </View>

        <Input
          label="Phone Number"
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder="+44 7700 900000"
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>
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
    backgroundColor: '#DBEAFE',
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
    gap: 12,
  },
  input: {
    marginBottom: 0,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontStyle: 'italic',
  },
});
