import { me } from '../../../design-system/mint-editorial';
import { Ionicons } from '@expo/vector-icons';
import { PropertyChoice } from '../../../components/properties/PropertyChoice';
import { workspaceStyles as ws } from './PropertyWorkspaceUI';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  TextInput,
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const kinds = [
    'lease',
    'inspection',
    'warranty',
    'invoice',
    'certificate',
    'other',
  ];
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
      <TextInput
        style={ws.search}
        value={search}
        onChangeText={setSearch}
        placeholder='Search files on this page'
        accessibilityLabel='Search property files'
        placeholderTextColor={me.ink3}
      />
      <PropertyChoice
        label='File type filter'
        value={filter}
        options={[
          { value: 'all', label: 'All types' },
          ...kinds.map((value) => ({ value, label: value })),
        ]}
        onChange={setFilter}
      />
      <View style={styles.types}>
        <Text style={ws.muted}>Upload as</Text>
        <PropertyChoice
          label='Upload file type'
          value={kind}
          options={kinds.map((value) => ({ value, label: value }))}
          onChange={setKind}
          disabled={busy}
        />
      </View>
      <TouchableOpacity
        disabled={busy}
        accessibilityRole='button'
        style={ws.primary}
        onPress={() => void upload()}
      >
        <Ionicons name='cloud-upload-outline' size={20} color={me.onBrand} />
        <Text style={ws.primaryText}>
          {busy ? 'Uploading…' : 'Upload file'}
        </Text>
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
          {query.data?.documents
            .filter(
              (doc) =>
                (filter === 'all' || doc.kind === filter) &&
                doc.name.toLowerCase().includes(search.trim().toLowerCase())
            )
            .map((doc) => (
              <TouchableOpacity
                style={styles.file}
                key={doc.id}
                accessibilityRole='button'
                onPress={() => void open(doc.id)}
              >
                <Ionicons
                  name='document-text-outline'
                  size={26}
                  color={me.brand2}
                />
                <View style={{ flex: 1 }}>
                  <Text style={ws.rowText}>{doc.name}</Text>
                  <Text style={ws.muted}>{doc.kind}</Text>
                </View>
                <Text style={{ color: me.brand2, fontWeight: '700' }}>
                  Preview
                </Text>
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
    backgroundColor: me.surface,
    gap: 12,
    borderWidth: 1,
    borderColor: me.line,
  },
  title: { fontSize: 20, fontWeight: '600' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  selected: { fontWeight: '700', textDecorationLine: 'underline' },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: me.line,
  },
});
