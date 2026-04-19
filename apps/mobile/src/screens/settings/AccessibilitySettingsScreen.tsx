/**
 * AccessibilitySettingsScreen — mobile Silver-mode toggle.
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mirrors /settings/accessibility on web. Keeps the screen minimal;
 * future accessibility toggles layer in here.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSilverMode } from '../../hooks/useSilverMode';
import { theme } from '../../theme';

export const AccessibilitySettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { silverMode, toggle, loading } = useSilverMode();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    >
      <View style={styles.section}>
        <View style={styles.rowTop}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowTitle}>Silver mode</Text>
            <Text style={styles.rowDesc}>
              Larger fonts and bigger taps across key flows. Best if you find
              the standard layout hard to read or hit.
            </Text>
          </View>
          <Switch
            value={silverMode}
            onValueChange={() => {
              void toggle();
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabelGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  rowDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});

export default AccessibilitySettingsScreen;
