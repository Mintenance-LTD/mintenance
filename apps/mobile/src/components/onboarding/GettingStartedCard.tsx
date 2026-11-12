import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';

// Match the dashboard's mint surface rather than mixing in system dark mode.
// Guidance is optional; dismissal is separate from onboarding completion.
export function GettingStartedCard() {
  const { user } = useAuth();
  const accountId = user?.id;
  const [visibleFor, setVisibleFor] = useState<string | null>(null);
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  useEffect(() => {
    let active = true;
    setVisibleFor(null);
    if (accountId) {
      AsyncStorage.getItem(`dashboard_guide_dismissed:v1:${accountId}`)
        .then((value) => {
          if (active && value !== '1') setVisibleFor(accountId);
        })
        .catch(() => {
          /* Optional guidance stays hidden if storage fails. */
        });
    }
    return () => {
      active = false;
    };
  }, [accountId]);
  if (!accountId || visibleFor !== accountId) return null;
  const dismiss = () => {
    setVisibleFor(null);
    void AsyncStorage.setItem(
      `dashboard_guide_dismissed:v1:${accountId}`,
      '1'
    ).catch(() => {
      /* Keep this session dismissed. Guides remain in Profile. */
    });
  };
  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel='Open app guides'
        onPress={() =>
          navigation.navigate('ProfileTab', { screen: 'GettingStarted' })
        }
        style={styles.link}
      >
        <Ionicons name='book-outline' size={20} color={me.brand2} />
        <View style={styles.copy}>
          <Text style={styles.title}>App guides</Text>
          <Text style={styles.subtitle}>Always available in Profile</Text>
        </View>
        <Ionicons name='chevron-forward' size={16} color={me.brand2} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel='Dismiss dashboard guide'
        accessibilityHint='You can still open app guides from Profile.'
        onPress={dismiss}
        style={styles.close}
      >
        <Ionicons name='close' size={20} color={me.ink2} />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.brandSoft,
    borderRadius: 12,
    marginVertical: 8,
  },
  link: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: me.brand2 },
  subtitle: { fontSize: 12, color: me.ink2, marginTop: 2 },
  close: {
    minWidth: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
