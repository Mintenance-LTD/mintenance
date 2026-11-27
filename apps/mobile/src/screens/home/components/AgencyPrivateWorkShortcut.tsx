import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { RootTabParamList } from '../../../navigation/types';
import {
  InboxButton,
  inboxStyles as styles,
} from '../../properties/components/PortfolioInboxControls';
import type { AgencyPrivateWorkViewer } from '../../properties/components/agencyPrivateDispatchModel';

export function AgencyPrivateWorkShortcut({
  viewer,
}: {
  viewer: AgencyPrivateWorkViewer;
}) {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  return (
    <View style={[styles.panel, { alignSelf: 'stretch', marginVertical: 8 }]}>
      <Text accessibilityRole='header' style={styles.heading}>
        {viewer === 'landlord'
          ? 'Property manager quotes'
          : 'Private agency assignments'}
      </Text>
      <Text style={styles.muted}>
        {viewer === 'landlord'
          ? 'Review quotes an agency has shared with you.'
          : 'Work sent directly to you, separate from marketplace jobs.'}
      </Text>
      <InboxButton
        label={
          viewer === 'landlord'
            ? 'Open agency quote approvals'
            : 'Open direct agency work'
        }
        onPress={() =>
          navigation.navigate('ProfileTab', {
            screen: 'AgencyPrivateWork',
            params: { viewer },
          })
        }
      />
    </View>
  );
}
