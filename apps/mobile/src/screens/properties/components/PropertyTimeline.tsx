import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import { formatTenancyDate } from '@mintenance/shared';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { workspaceStyles as ws } from './PropertyWorkspaceUI';

type Event = {
  id: string;
  title: string;
  date: string;
  href: string;
  kind: string;
  inspected_on?: string;
};
type Page = { events: Event[]; nextCursor: string | null };

const eventLabels: Record<string, string> = {
  job: 'Job',
  document: 'Document',
  inspection: 'Inspection',
  payment: 'Payment',
  dispute: 'Dispute',
  message: 'Message',
};
const recordedDate = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});
const idPattern =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const jobPath = new RegExp('^/jobs/(' + idPattern + ')$', 'i');
const webRecord = new RegExp(
  '^(?:/properties/' +
    idPattern +
    '/documents/' +
    idPattern +
    '|/(?:payments|disputes)/' +
    idPattern +
    '|/messages\\?jobId=' +
    idPattern +
    ')$',
  'i'
);
const inspectionPath = new RegExp(
  '^/properties/(' + idPattern + ')/inspections/(' + idPattern + ')$',
  'i'
);

export function PropertyTimeline({
  accountId,
  propertyId,
  openInspection,
  openJob,
}: {
  accountId: string;
  propertyId: string;
  openInspection: (id: string) => void;
  openJob: (id: string) => void;
}) {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [recordError, setRecordError] = useState('');
  const cursor = cursors[cursors.length - 1];
  const path =
    '/api/properties/' + encodeURIComponent(propertyId) + '/activity';
  const page = useQuery({
    queryKey: ['property-activity', accountId, propertyId, cursor],
    queryFn: async ({ signal }) => {
      const data = await mobileApiClient.get<Page>(
        path + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''),
        { signal }
      );
      if (
        !Array.isArray(data?.events) ||
        data.events.some((event) => !Number.isFinite(Date.parse(event.date)))
      ) {
        throw new Error('Invalid property history');
      }
      return data;
    },
    retry: false,
    gcTime: 0,
  });

  async function openRecord(event: Event) {
    setRecordError('');
    const inspection = inspectionPath.exec(event.href);
    const job = jobPath.exec(event.href);
    try {
      if (
        event.kind === 'inspection' &&
        inspection?.[1] === propertyId &&
        inspection[2]
      ) {
        openInspection(inspection[2]);
      } else if (event.kind === 'job' && job?.[1]) {
        openJob(job[1]);
      } else if (
        webRecord.test(event.href) &&
        (!event.href.startsWith('/properties/') ||
          event.href.startsWith('/properties/' + propertyId + '/'))
      ) {
        const webUrl =
          process.env.EXPO_PUBLIC_WEB_URL || 'https://www.mintenance.co.uk';
        await openBrowserAsync(new URL(event.href, webUrl).href);
      } else {
        setRecordError('This activity record is unavailable.');
      }
    } catch {
      setRecordError('This activity record could not be opened. Try again.');
    }
  }

  return (
    <View style={ws.card}>
      <Text accessibilityRole='header' style={ws.heading}>
        Property history
      </Text>
      <Text style={ws.muted}>
        Jobs, inspections, documents, payments, disputes and job messages.
      </Text>
      {!!recordError && <Text accessibilityRole='alert'>{recordError}</Text>}
      {page.isPending ? (
        <ActivityIndicator accessibilityLabel='Loading property history' />
      ) : page.isError ? (
        <>
          <Text accessibilityRole='alert'>
            Property history could not be loaded.
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            style={ws.row}
            onPress={() => void page.refetch()}
          >
            <Text style={ws.rowText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {page.data.events.length === 0 && (
            <Text>No recorded activity on this page.</Text>
          )}
          {page.data.events.map((event) => (
            <TouchableOpacity
              key={event.id}
              accessibilityRole='button'
              onPress={() => void openRecord(event)}
              style={ws.row}
            >
              <View style={{ flex: 1, gap: 4, paddingVertical: 10 }}>
                <Text style={ws.muted}>
                  {eventLabels[event.kind] ?? 'Activity'}
                </Text>
                <Text style={ws.rowText}>{event.title}</Text>
                {event.inspected_on && (
                  <Text>
                    Inspection · {formatTenancyDate(event.inspected_on)}
                  </Text>
                )}
                <Text style={ws.muted}>
                  {event.kind === 'inspection' ? 'Recorded · ' : ''}
                  {recordedDate.format(new Date(event.date))} UK time
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text style={ws.muted}>Page {cursors.length}</Text>
          {cursors.length > 1 && (
            <TouchableOpacity
              accessibilityRole='button'
              style={ws.row}
              onPress={() => {
                setRecordError('');
                setCursors(cursors.slice(0, -1));
              }}
            >
              <Text style={ws.rowText}>Newer</Text>
            </TouchableOpacity>
          )}
          {page.data.nextCursor && (
            <TouchableOpacity
              accessibilityRole='button'
              style={ws.row}
              onPress={() => {
                setRecordError('');
                setCursors([...cursors, page.data.nextCursor]);
              }}
            >
              <Text style={ws.rowText}>Older</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
