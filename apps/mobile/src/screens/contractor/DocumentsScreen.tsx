/**
 * DocumentsScreen — full-bleed gradient hero, color-coded document
 * cards, category icons, and a green upload FAB.
 *
 * Was a 670-line monolith. Split 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d)
 * into typed constants + helpers (`documents/types.ts`), React Query
 * hooks (`documents/queries.ts`), tap routing (`documents/openDocument.ts`),
 * and 4 leaf components under `documents/components/`. Public behaviour
 * preserved.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

let DocumentPicker: typeof import('expo-document-picker') | null = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch {
  // Package not installed
}

import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import { styles } from './DocumentsStyles';

import {
  useDocumentsQuery,
  useUploadDocument,
  useToggleStar,
} from './documents/queries';
import { openDocument } from './documents/openDocument';
import type { DocFilter, Document } from './documents/types';
import { DocumentsHero } from './documents/components/DocumentsHero';
import { FilterChips } from './documents/components/FilterChips';
import { DocumentCard } from './documents/components/DocumentCard';
import { DocumentsEmptyState } from './documents/components/DocumentsEmptyState';
import { ExpiringBanner } from './documents/components/ExpiringBanner';

export const DocumentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isContractor = user?.role === 'contractor';
  const [filter, setFilter] = useState<DocFilter>('all');

  const { data, isLoading, refetch } = useDocumentsQuery({
    userId: user?.id,
    isContractor,
  });
  const uploadMutation = useUploadDocument(filter);
  const toggleStarMutation = useToggleStar();

  const documents = data || [];
  const filtered =
    filter === 'all'
      ? documents
      : documents.filter((d) => d.category === filter);

  const stats = useMemo(() => {
    const categories = new Set(documents.map((d) => d.category));
    const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
    return { count: documents.length, categories: categories.size, totalSize };
  }, [documents]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach((d) => {
      const key = d.category?.toLowerCase() || '';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const handlePickDocument = useCallback(async () => {
    if (!DocumentPicker) {
      Alert.alert('Not Available', 'Document picker is not installed.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMutation.mutate({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
    }
  }, [uploadMutation]);

  const navigateToJob = useCallback(
    (jobId: string) => {
      (navigation as ReturnType<typeof Object>).navigate('JobsTab', {
        screen: 'JobDetails',
        params: { jobId },
      });
    },
    [navigation]
  );

  const handleOpenDocument = useCallback(
    (doc: Document) => openDocument({ doc, navigateToJob }),
    [navigateToJob]
  );

  const handleToggleStar = useCallback(
    (doc: Document) =>
      toggleStarMutation.mutate({ id: doc.id, starred: !doc.starred }),
    [toggleStarMutation]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor='#FFFFFF'
            colors={[me.brand]}
            progressViewOffset={140}
          />
        }
        ListHeaderComponent={
          <View>
            <DocumentsHero
              topInset={insets.top}
              isContractor={isContractor}
              count={stats.count}
              categories={stats.categories}
              totalSize={stats.totalSize}
              onBack={() => navigation.goBack()}
              onUpload={handlePickDocument}
            />
            {isContractor && (
              <ExpiringBanner
                documents={documents}
                onRenew={() =>
                  (navigation as ReturnType<typeof Object>).navigate(
                    'AddCertification'
                  )
                }
              />
            )}
            <FilterChips
              filter={filter}
              filterCounts={filterCounts}
              onChange={setFilter}
            />
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filtered.length}{' '}
                {filtered.length === 1 ? 'document' : 'documents'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <DocumentsEmptyState
            filter={filter}
            isContractor={isContractor}
            onUpload={handlePickDocument}
          />
        }
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            isContractor={isContractor}
            onOpen={handleOpenDocument}
            onToggleStar={handleToggleStar}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      {isContractor && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={handlePickDocument}
          accessibilityLabel='Upload document'
        >
          <Ionicons name='add' size={28} color={me.onBrand} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default DocumentsScreen;
