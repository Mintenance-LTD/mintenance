import { theme } from '../../../theme';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
interface Doc {
  id: string;
  name: string;
  kind: string;
}
export function PropertyFiles({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [kind, setKind] = useState('other');
  const url = `/api/properties/${propertyId}/documents`;
  const query = useQuery({
    queryKey: ['property-files', propertyId, user?.id, offset],
    enabled: !!user,
    queryFn: () =>
      mobileApiClient.get<{ documents: Doc[]; hasMore: boolean }>(
        `${url}?offset=${offset}`
      ),
  });
  async function upload() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) throw new Error('No file selected. Please try again.');
      if (file.size && file.size > 3145728)
        throw new Error('Choose a file up to 3 MB.');
      const body = new FormData();
      body.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
      body.append('kind', kind);
      await mobileApiClient.postFormData(url, body);
      setOffset(0);
      await query.refetch();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Upload failed. Retry.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    try {
      const result = await mobileApiClient.get<{ url: string }>(
        `${url}?documentId=${id}`
      );
      await Linking.openURL(result.url);
    } catch {
      setError('Unable to open the file. Please retry.');
    }
  }
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Property files</Text>
      <Text>
        Private files for owners and managers. PDF, PNG or JPEG, up to 3 MB.
      </Text>
      <View style={styles.types}>
        {[
          'lease',
          'inspection',
          'warranty',
          'invoice',
          'certificate',
          'other',
        ].map((value) => (
          <TouchableOpacity
            key={value}
            disabled={busy}
            accessibilityRole='button'
            accessibilityState={{ selected: kind === value }}
            onPress={() => setKind(value)}
          >
            <Text style={kind === value ? styles.selected : undefined}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        disabled={busy}
        accessibilityRole='button'
        onPress={() => void upload()}
      >
        <Text>{busy ? 'Uploading…' : 'Choose and upload file'}</Text>
      </TouchableOpacity>
      {!!error && <Text accessibilityRole='alert'>{error}</Text>}
      {query.isPending ? (
        <Text>Loading files…</Text>
      ) : query.isError ? (
        <TouchableOpacity onPress={() => void query.refetch()}>
          <Text>Unable to load files. Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <>
          {query.data?.documents.length === 0 && (
            <Text>No files on this page.</Text>
          )}
          {query.data?.documents.map((doc) => (
            <TouchableOpacity
              style={styles.file}
              key={doc.id}
              accessibilityRole='button'
              onPress={() => void open(doc.id)}
            >
              <Text>{doc.name}</Text>
              <Text>{doc.kind} · Open file</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.types}>
            <TouchableOpacity
              disabled={offset === 0}
              onPress={() => setOffset(Math.max(0, offset - 25))}
            >
              <Text>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!query.data?.hasMore}
              onPress={() => setOffset(offset + 25)}
            >
              <Text>Next</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    padding: 16,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '600' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  selected: { fontWeight: '700', textDecorationLine: 'underline' },
  file: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
});
