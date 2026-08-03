import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@mintenance/design-tokens';

/**
 * Last-resort screen for a build that cannot start because required
 * environment variables were not baked in (missing EAS environment
 * variables, a malformed Supabase URL, no Stripe publishable key...).
 *
 * 2026-08-03: the first Google Play internal build shipped without any of
 * its six production EAS variables. `src/config/supabase.ts` threw at module
 * load, so React never rendered, `onLayoutRootView` never ran, and the
 * native splash — deliberately pinned by SplashScreen.preventAutoHideAsync()
 * in App.tsx — stayed on screen forever. The app looked frozen with no
 * indication of why. This screen replaces that dead end.
 *
 * Deliberately minimal: no ThemeProvider, no SafeAreaProvider, no navigation.
 * Anything stateful it pulled in would be one more thing that could fail in
 * exactly the broken state this screen exists to report. Colours come from
 * `@mintenance/design-tokens` rather than hex literals — that module is a
 * static token map with no environment dependency, so it is safe here, unlike
 * `src/theme` whose `colors` are live getters over a ThemeProvider-owned
 * dark-mode flag (StyleSheet.create runs at import, before any provider
 * mounts, so those getters would read an unset flag).
 */

interface ConfigErrorScreenProps {
  /** Human-readable problems, one per line. Must never contain secrets. */
  problems: readonly string[];
}

export function ConfigErrorScreen({ problems }: ConfigErrorScreenProps) {
  // The splash is pinned by App.tsx and nothing else will dismiss it on this
  // path — hide it here or the error text renders underneath it.
  const onLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or called too late. Nothing to do.
    });
  }, []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <ScrollView
        contentContainerStyle={styles.content}
        testID='config-error-screen'
      >
        <Text style={styles.title}>Configuration error</Text>
        <Text style={styles.subtitle}>
          This build of Mintenance is missing settings it needs to start, so it
          cannot connect to your account.
        </Text>

        <View style={styles.card}>
          {problems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              {'•  '}
              {problem}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>
          Nothing is wrong with your device or your account. This is a packaging
          problem with the app itself — please report it to the Mintenance team
          along with the lines above.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Deliberately NOT the splash teal: a visible change of background is the
    // first signal to the user that the app got past boot and has something
    // to say, rather than still hanging.
    backgroundColor: colors.primary,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 72,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray300,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  problem: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  footer: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray300,
  },
});
