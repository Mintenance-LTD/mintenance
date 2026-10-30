import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { PROPERTY_VIEWS } from '@mintenance/shared';
import { usePropertyView } from '../../hooks/usePropertyView';
import { me } from '../../design-system/mint-editorial';

export function PropertyViewSwitcher() {
  const { view, setView, ready, enabled, saved } = usePropertyView();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  if (!enabled) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your view</Text>
      <View style={styles.row}>
        {PROPERTY_VIEWS.map((option) => (
          <TouchableOpacity
            key={option.value}
            disabled={!ready}
            accessibilityRole='button'
            accessibilityState={{
              selected: view === option.value,
              disabled: !ready,
            }}
            onPress={() => setView(option.value)}
            style={[styles.button, view === option.value && styles.active]}
          >
            <Text
              style={[
                styles.label,
                view === option.value && styles.activeLabel,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.detail}>
        {PROPERTY_VIEWS.find((option) => option.value === view)?.description}{' '}
        Your plan and property permissions still apply.
      </Text>
      <TouchableOpacity
        accessibilityRole='button'
        style={styles.plan}
        onPress={() =>
          navigation.navigate('ProfileTab', { screen: 'Subscription' })
        }
      >
        <Text style={styles.link}>Plan & features</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole='button'
        style={styles.plan}
        onPress={() =>
          navigation.navigate('ProfileTab', { screen: 'Properties' })
        }
      >
        <Text style={styles.link}>
          {view === 'home'
            ? 'Open property records'
            : view === 'rentals'
              ? 'Manage rental properties'
              : 'Manage properties and teams'}
        </Text>
      </TouchableOpacity>
      {!saved && (
        <Text style={styles.detail}>
          This view is temporary because device storage is unavailable.
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 12,
    backgroundColor: me.surface,
    borderColor: me.line,
    borderWidth: 1,
    borderRadius: 16,
  },
  title: { color: me.ink, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: me.bg2,
    borderRadius: 24,
  },
  active: { backgroundColor: me.brand2 },
  label: { color: me.ink, fontWeight: '600' },
  activeLabel: { color: me.onBrand },
  detail: { color: me.ink2, fontSize: 13, lineHeight: 19, marginTop: 8 },
  plan: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: {
    color: me.brand2,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
