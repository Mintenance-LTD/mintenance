import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { PROPERTY_JOB_STATUS_LABELS } from '@mintenance/shared';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import type { ProfileStackParamList } from '../../navigation/types';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ActionFollowup } from './components/ActionFollowup';

type Repair = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  property: { id: string; name: string };
  start: string | null;
  end: string | null;
  completedAt: string | null;
  dueAt: string | null;
  nextAction: string;
  canManageFollowup: boolean;
  photos: { id: string; kind: 'before' | 'after'; url: string | null }[];
};

function ukTime(value: string) {
  return (
    new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    }) + ' UK time'
  );
}

export function PropertyRepairScreen({
  navigation,
  route,
}: NativeStackScreenProps<ProfileStackParamList, 'PropertyRepair'>) {
  const { user } = useAuth();
  const { propertyId = '', jobId = '' } = route.params ?? {};
  const hasRepair = !!propertyId && !!jobId;
  const [followupOpen, setFollowupOpen] = useState(false);
  const query = useQuery({
    queryKey: ['property-repair', user?.id, propertyId, jobId],
    enabled: !!user?.id && hasRepair,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const repair = await mobileApiClient.get<Repair>(
        `/api/properties/${encodeURIComponent(propertyId)}/jobs/${encodeURIComponent(jobId)}`,
        { signal, retries: 0 }
      );
      if (
        repair?.id !== jobId ||
        repair.property?.id !== propertyId ||
        !Array.isArray(repair.photos)
      ) {
        throw new Error('Repair could not be confirmed');
      }
      return repair;
    },
  });

  const repair = !query.isError && query.data;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          accessibilityRole='button'
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        {!user ? (
          <Text>Sign in to open this repair.</Text>
        ) : hasRepair && query.isPending ? (
          <ActivityIndicator
            accessibilityLabel='Loading repair'
            color={me.brand}
          />
        ) : !repair ? (
          <View style={styles.card}>
            <Text>
              This repair could not be opened. Check that you still have access
              to this property.
            </Text>
            {hasRepair && (
              <TouchableOpacity
                accessibilityRole='button'
                onPress={() => void query.refetch()}
              >
                <Text style={styles.link}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text>{repair.property.name} · Property repair</Text>
              <Text accessibilityRole='header' style={styles.title}>
                {repair.title}
              </Text>
              <Text>
                {PROPERTY_JOB_STATUS_LABELS[repair.status] || repair.status}
              </Text>
              <Text selectable>Job reference {repair.id}</Text>
              {repair.description && <Text>{repair.description}</Text>}
            </View>
            <View style={styles.card}>
              <Text accessibilityRole='header' style={styles.heading}>
                Next step
              </Text>
              <Text>{repair.nextAction}</Text>
              {repair.dueAt && (
                <Text>Follow-up due {ukTime(repair.dueAt)}</Text>
              )}
              {repair.canManageFollowup && (
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityState={{ expanded: followupOpen }}
                  onPress={() => setFollowupOpen(!followupOpen)}
                >
                  <Text style={styles.link}>Manage follow-up</Text>
                </TouchableOpacity>
              )}
              {repair.canManageFollowup && followupOpen && (
                <ActionFollowup
                  propertyId={propertyId}
                  kind='job'
                  sourceId={jobId}
                  onSaved={() => void query.refetch()}
                />
              )}
            </View>
            <View style={styles.card}>
              <Text accessibilityRole='header' style={styles.heading}>
                Current work window
              </Text>
              {repair.start && <Text>Starts {ukTime(repair.start)}</Text>}
              {repair.end && <Text>Ends {ukTime(repair.end)}</Text>}
              {!repair.start && !repair.end && (
                <Text>No work window recorded.</Text>
              )}
              {repair.completedAt && (
                <Text>Work marked complete {ukTime(repair.completedAt)}</Text>
              )}
            </View>
            <View style={styles.card}>
              <Text accessibilityRole='header' style={styles.heading}>
                Completion evidence
              </Text>
              {repair.photos.length === 0 && (
                <Text>No before or after photos recorded.</Text>
              )}
              {repair.photos.map((photo) => (
                <View key={photo.id}>
                  <Text>
                    {photo.kind === 'before' ? 'Before photo' : 'After photo'}
                  </Text>
                  {photo.url ? (
                    <Image
                      source={{ uri: photo.url, cache: 'reload' }}
                      style={styles.photo}
                      resizeMode='contain'
                      accessibilityLabel={
                        photo.kind === 'before' ? 'Before work' : 'After work'
                      }
                    />
                  ) : (
                    <Text>Photo unavailable.</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.bg },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: me.surface, borderRadius: 16, padding: 16, gap: 8 },
  title: { color: me.ink, fontSize: 24, fontWeight: '700' },
  heading: { color: me.ink, fontSize: 18, fontWeight: '700' },
  link: { color: me.brand, paddingVertical: 10, fontWeight: '600' },
  photo: { width: '100%', height: 240, marginTop: 6, borderRadius: 10 },
});
