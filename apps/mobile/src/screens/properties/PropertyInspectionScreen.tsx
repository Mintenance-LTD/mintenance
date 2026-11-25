import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import type { ProfileStackParamList } from '../../navigation/types';
import { TenancyInspections } from './components/TenancyInspections';

export function PropertyInspectionScreen({
  navigation,
  route,
}: NativeStackScreenProps<ProfileStackParamList, 'PropertyInspection'>) {
  const { user } = useAuth();
  const { propertyId, reportId } = route.params;
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title='Inspection report'
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {user?.id ? (
          <TenancyInspections
            propertyId={propertyId}
            initialReportId={reportId}
          />
        ) : (
          <Text>Sign in to open this report.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.bg },
  content: { padding: 16 },
});
