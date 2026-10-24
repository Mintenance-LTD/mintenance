import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useOnboardingTokens } from '../../hooks/useOnboardingTheme';
export function GettingStartedCard() {
  const me = useOnboardingTokens();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  return (
    <TouchableOpacity
      accessibilityRole='button'
      onPress={() =>
        navigation.navigate('ProfileTab', { screen: 'GettingStarted' })
      }
      style={{
        padding: 18,
        marginVertical: 12,
        borderRadius: 16,
        backgroundColor: me.brandSoft,
      }}
    >
      <Text
        style={{ fontFamily: me.font.display, color: me.ink, fontSize: 20 }}
      >
        Getting started
      </Text>
      <Text style={{ color: me.ink2, marginTop: 6 }}>
        Your role, your features. Read a short guide or revisit one at any time.
      </Text>
    </TouchableOpacity>
  );
}
