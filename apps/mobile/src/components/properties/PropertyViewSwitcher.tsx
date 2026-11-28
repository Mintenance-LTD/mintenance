import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  canManageInbox,
  type WorkspaceAccess,
} from '../../screens/properties/components/portfolioInboxModel';
import { PROPERTY_VIEWS, type PropertyView } from '@mintenance/shared';
import { usePropertyView } from '../../hooks/usePropertyView';
import type { RootTabParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { PropertyChoice } from './PropertyChoice';

export function PropertyViewSwitcher() {
  const { view, setView, ready, enabled, saved, accountId } = usePropertyView();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
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
      {ready && view === 'agency' && accountId && (
        <AgencyWorkspaceLinks
          key={accountId}
          accountId={accountId}
          navigation={navigation}
        />
      )}
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
function AgencyWorkspaceLinks({
  accountId,
  navigation,
}: {
  accountId: string;
  navigation: NavigationProp<RootTabParamList>;
}) {
  const access = useQuery({
    queryKey: ['property-view-workspace-access', accountId],
    queryFn: ({ signal }) =>
      mobileApiClient.get<WorkspaceAccess>('/api/portfolio/workspace', {
        signal,
      }),
    refetchOnMount: 'always',
    retry: false,
  });
  const data =
    access.isFetchedAfterMount &&
    !access.isError &&
    Array.isArray(access.data?.workspaces)
      ? access.data
      : undefined;
  const hasWorkspace = !!data?.workspaces.length;
  const canSetUp = data?.canSetUp && (data.unlinkedProperties?.length ?? 0) > 0;
  const canOpenCrm = data?.workspaces.some(({ role }) => canManageInbox(role));
  const workspaceLabel = hasWorkspace
    ? 'Open Agency workspace'
    : 'Set up an Agency workspace';
  return (
    <>
      {(hasWorkspace || canSetUp) && (
        <TouchableOpacity
          accessible
          accessibilityLabel={workspaceLabel}
          accessibilityRole='button'
          style={styles.linkButton}
          onPress={() =>
            navigation.navigate('ProfileTab', { screen: 'PortfolioInbox' })
          }
        >
          <Text style={styles.link}>{workspaceLabel}</Text>
        </TouchableOpacity>
      )}
      {canOpenCrm && (
        <TouchableOpacity
          accessible
          accessibilityLabel='Open Agency CRM'
          accessibilityRole='button'
          style={styles.linkButton}
          onPress={() =>
            navigation.navigate('ProfileTab', { screen: 'AgencyCrm' })
          }
        >
          <Text style={styles.link}>Open Agency CRM</Text>
        </TouchableOpacity>
      )}
      {!!data && !canOpenCrm && (
        <Text style={styles.detail}>
          Shared properties and agency workspace access are separate.
        </Text>
      )}
    </>
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
