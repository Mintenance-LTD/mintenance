import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { PROPERTY_VIEWS, type PropertyView } from '@mintenance/shared';
import { usePropertyView } from '../../hooks/usePropertyView';
import { me } from '../../design-system/mint-editorial';
import { PropertyChoice } from './PropertyChoice';

export function PropertyViewSwitcher() {
  const { view, setView, ready, enabled, saved } = usePropertyView();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  if (!enabled) return null;
  return (
    <View style={styles.row}>
      <PropertyChoice
        label='Your view'
        value={view}
        options={PROPERTY_VIEWS}
        disabled={!ready}
        onChange={(value) => setView(value as PropertyView)}
      >
        {(dismiss) => (
          <>
            <Text style={styles.detail}>
              Your plan and property permissions still apply.
            </Text>
            <TouchableOpacity
              accessibilityRole='button'
              style={styles.linkButton}
              onPress={() => {
                dismiss();
                navigation.navigate('ProfileTab', { screen: 'Subscription' });
              }}
            >
              <Text style={styles.link}>Plan & features</Text>
            </TouchableOpacity>
            {!saved && (
              <Text style={styles.detail}>
                This view is temporary because device storage is unavailable.
              </Text>
            )}
          </>
        )}
      </PropertyChoice>
      <TouchableOpacity
        accessibilityRole='button'
        style={styles.linkButton}
        onPress={() =>
          navigation.navigate('ProfileTab', { screen: 'Properties' })
        }
      >
        <Text style={styles.link}>Property records</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  detail: { color: me.ink2, fontSize: 13, lineHeight: 19, marginTop: 12 },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  link: { color: me.brand2, fontWeight: '600' },
});
