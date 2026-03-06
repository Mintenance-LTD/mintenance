import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface PasswordStrengthBarProps {
  password: string;
}

interface StrengthLevel {
  label: string;
  segments: number;
  color: string;
}

function getStrength(password: string): StrengthLevel {
  if (!password) return { label: '', segments: 0, color: theme.colors.border };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score === 1) return { label: 'Weak', segments: 1, color: theme.colors.error };
  if (score === 2) return { label: 'Fair', segments: 2, color: theme.colors.warning };
  if (score === 3) return { label: 'Good', segments: 3, color: '#F59E0B' };
  return { label: 'Strong', segments: 4, color: theme.colors.success };
}

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ password }) => {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <View style={styles.container}>
      <View style={styles.segmentsRow}>
        {[1, 2, 3, 4].map((seg) => (
          <View
            key={seg}
            style={[
              styles.segment,
              { backgroundColor: seg <= strength.segments ? strength.color : theme.colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: strength.color }]}>{strength.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 4,
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
