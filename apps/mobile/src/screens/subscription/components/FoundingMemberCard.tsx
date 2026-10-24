import React from 'react';
import { View, Text } from 'react-native';
import { earlyAccessBenefits } from '@mintenance/shared';
import { useOnboardingTokens } from '../../../hooks/useOnboardingTheme';
export function FoundingMemberCard({
  role,
  platformFeePercent,
}: {
  role: string;
  platformFeePercent?: string;
}) {
  const benefits = earlyAccessBenefits(role, platformFeePercent);
  const me = useOnboardingTokens();
  return (
    <View
      style={{
        backgroundColor: me.brandSoft,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        gap: 12,
      }}
    >
      <Text
        style={{ fontFamily: me.font.display, fontSize: 18, color: me.ink }}
      >
        {benefits.title}
      </Text>
      <Text style={{ color: me.ink2, lineHeight: 21 }}>
        {benefits.description}
      </Text>
      {benefits.items.map((item) => (
        <Text key={item} style={{ color: me.ink2, lineHeight: 21 }}>
          • {item}
        </Text>
      ))}
    </View>
  );
}
