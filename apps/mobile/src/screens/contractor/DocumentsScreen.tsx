import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// expo-document-picker loaded dynamically to avoid bundle failure if not installed
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch {
  // Package not installed - upload will show an alert
}
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface Document {
  id: string;
  filename: string;
  category: string;
  uploaded_at: string;
  starred: boolean;
  file_size?: number;
}

type DocFilter = 'all' | 'contracts' | 'photos' | 'certifications' | 'insurance' | 'receipts' | 'templates';

export const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<DocFilter>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-documents'],
    queryFn: async () => {
      interface ApiDoc { id: string; name: string; category: string; created_at: string; starred: boolean; size_bytes?: number }
      const res = await mobileApiClient.get<{ documents: ApiDoc[] }>('/api/contractor/documents');
      return (res.documents || []).map((d): Document => ({
        id: d.id, filename: d.name, category: d.category,
        uploaded_at: d.created_at, starred: d.starred, file_size: d.size_bytes,
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: { uri: string; name: string; mimeType: string }) => {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, type: file.mimeType, name: file.name } as unknown as Blob);
      formData.append('category', filter === 'all' ? 'other' : filter);
      return mobileApiClient.postFormData('/api/contractor/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-documents'] });
      Alert.alert('Uploaded', 'Document uploaded successfully.');
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      return mobileApiClient.patch(`/api/contractor/documents/${id}`, { starred });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contractor-documents'] }),
  });

  const handlePickDocument = async () => {
    if (!DocumentPicker) {
      Alert.alert('Not Available', 'Document picker is not installed. Please install expo-document-picker.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMutation.mutate({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
    }
  };

  const documents = data || [];
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.category === filter);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Documents" showBack onBack={() => navigation.goBack()} />

      <FlatList
        horizontal
        data={['all', 'contracts', 'photos', 'certifications', 'insurance', 'receipts', 'templates'] as DocFilter[]}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="document-outline" title="No Documents" subtitle="Upload your documents here." />}
        renderItem={({ item }) => (
          <View style={styles.docRow}>
            <Ionicons name="document-outline" size={24} color={theme.colors.textSecondary} />
            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>{item.filename}</Text>
              <View style={styles.docMeta}>
                <Badge variant="default" size="sm">{item.category}</Badge>
                <Text style={styles.docDate}>{new Date(item.uploaded_at).toLocaleDateString('en-GB')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggleStarMutation.mutate({ id: item.id, starred: !item.starred })}>
              <Ionicons name={item.starred ? 'star' : 'star-outline'} size={20} color={item.starred ? '#F59E0B' : theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={handlePickDocument} accessibilityLabel="Upload document">
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  filterChipActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  docRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, gap: 12, ...theme.shadows.sm },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  docDate: { fontSize: 12, color: theme.colors.textTertiary },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});

export default DocumentsScreen;
