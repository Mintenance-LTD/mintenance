import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Share } from 'react-native';
import {
  cacheDirectory,
  writeAsStringAsync,
  StorageAccessFramework,
  EncodingType,
} from 'expo-file-system/legacy';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
interface Row {
  id: string;
  property_name: string;
  open_jobs: number;
  overdue_jobs: number;
  completed_jobs: number;
  average_completion_days: number | null;
  timed_completions: number;
  released_payments: { currency: string; released_escrow: number }[] | null;
  repeated_categories: { category: string; jobs: number }[];
  contractor_activity: { contractor_id: string; completed_jobs: number }[];
}
export function PortfolioReport() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false),
    [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['portfolio-report', user?.id, offset],
    enabled: !!user && open,
    queryFn: () =>
      mobileApiClient.get<{ properties: Row[]; hasMore: boolean }>(
        `/api/portfolio/report?offset=${offset}`
      ),
  });
  async function exportPage() {
    if (!query.data || exporting) return;
    setExporting(true);
    setMessage('');
    try {
      const escape = (value: unknown) => {
        let text = String(value ?? '');
        if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const csv = [
        [
          'Property',
          'Open jobs',
          'Overdue jobs',
          'Completed jobs',
          'Average completion days',
          'Timed completions',
          'Released escrow by currency',
          'Repeated completed categories',
          'Contractor activity',
        ],
        ...query.data.properties.map((row) => [
          row.property_name,
          row.open_jobs,
          row.overdue_jobs,
          row.completed_jobs,
          row.average_completion_days,
          row.timed_completions,
          JSON.stringify(row.released_payments),
          JSON.stringify(row.repeated_categories),
          JSON.stringify(row.contractor_activity),
        ]),
      ]
        .map((row) => row.map(escape).join(','))
        .join('\r\n');
      const name = `portfolio-page-${offset / 25 + 1}-${Date.now()}.csv`;
      if (Platform.OS === 'android') {
        const permission =
          await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) return;
        const uri = await StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          name,
          'text/csv'
        );
        await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 });
        setMessage('CSV saved to your selected folder.');
      } else {
        if (!cacheDirectory) throw new Error('File storage unavailable');
        const path = cacheDirectory + name;
        await writeAsStringAsync(path, csv, { encoding: EncodingType.UTF8 });
        await Share.share({ url: path, title: 'Portfolio report' });
      }
    } catch {
      setMessage('Export failed. Please retry.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      >
        <Text>Portfolio report {open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open && (
        <>
          <Text>
            Recorded activity, all time. Completion times include time before
            work starts. Released escrow is not an accounting statement.
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            disabled={!query.data || exporting}
            onPress={() => void exportPage()}
          >
            <Text>{exporting ? 'Exporting…' : 'Export this page as CSV'}</Text>
          </TouchableOpacity>
          {!!message && <Text>{message}</Text>}
          {query.isPending ? (
            <Text>Loading report…</Text>
          ) : query.isError ? (
            <TouchableOpacity onPress={() => void query.refetch()}>
              <Text>Unable to load report. Retry.</Text>
            </TouchableOpacity>
          ) : (
            <>
              {query.data?.properties.map((row) => (
                <View key={row.id} style={{ gap: 6, paddingVertical: 12 }}>
                  <Text>{row.property_name}</Text>
                  <Text>
                    {row.open_jobs} open · {row.overdue_jobs} overdue ·{' '}
                    {row.completed_jobs} completed
                  </Text>
                  <Text>
                    Average completion:{' '}
                    {row.average_completion_days ?? 'Not recorded'} days (
                    {row.timed_completions} dated completions)
                  </Text>
                  {row.released_payments?.map((value) => (
                    <Text key={value.currency}>
                      Released escrow: {value.currency}{' '}
                      {Number(value.released_escrow).toFixed(2)}
                    </Text>
                  ))}
                </View>
              ))}
              <TouchableOpacity
                disabled={offset === 0}
                onPress={() => setOffset(Math.max(0, offset - 25))}
              >
                <Text>Previous properties</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!query.data?.hasMore}
                onPress={() => setOffset(offset + 25)}
              >
                <Text>Next properties</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
