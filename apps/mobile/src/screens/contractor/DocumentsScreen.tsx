/**
 * DocumentsScreen — Redesigned with full-bleed hero, color-coded
 * document cards, category icons, and green upload FAB.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch {
  // Package not installed
}
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { theme, gradients } from '../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  filename: string;
  category: string;
  uploaded_at: string;
  starred: boolean;
  file_size?: number;
  public_url?: string;
  is_contract?: boolean;
  job_id?: string;
}

type DocFilter = 'all' | 'contracts' | 'photos' | 'certifications' | 'insurance' | 'receipts' | 'templates';

const FILTER_CONFIG: { key: DocFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'contracts', label: 'Contracts', icon: 'document-text-outline' },
  { key: 'photos', label: 'Photos', icon: 'image-outline' },
  { key: 'certifications', label: 'Certs', icon: 'ribbon-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' },
  { key: 'templates', label: 'Templates', icon: 'copy-outline' },
];

const CATEGORY_STYLE: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  contracts:      { color: theme.colors.primary, bg: theme.colors.primaryLight, icon: 'document-text' },
  contract:       { color: theme.colors.primary, bg: theme.colors.primaryLight, icon: 'document-text' },
  photos:         { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  photo:          { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  certifications: { color: theme.colors.accent, bg: theme.colors.accentLight, icon: 'ribbon' },
  certification:  { color: theme.colors.accent, bg: theme.colors.accentLight, icon: 'ribbon' },
  insurance:      { color: '#8B5CF6', bg: '#EDE9FE', icon: 'shield-checkmark' },
  receipts:       { color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary, icon: 'receipt' },
  receipt:        { color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary, icon: 'receipt' },
  templates:      { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
  template:       { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
};

const getDocStyle = (category: string) => {
  const key = category?.toLowerCase() || '';
  return CATEGORY_STYLE[key] || { color: theme.colors.textSecondary, bg: theme.colors.backgroundTertiary, icon: 'document-outline' as const };
};

const EMPTY_MESSAGES: Record<DocFilter, { title: string; desc: string }> = {
  all:            { title: 'No Documents Yet', desc: 'Upload contracts, photos, certificates and more to keep everything organised.' },
  contracts:      { title: 'No Contracts', desc: 'Signed contracts with your clients will appear here.' },
  photos:         { title: 'No Photos', desc: 'Job photos and site images will be stored here.' },
  certifications: { title: 'No Certificates', desc: 'Upload your trade certifications to build trust with homeowners.' },
  insurance:      { title: 'No Insurance Docs', desc: 'Add your liability and professional insurance documents.' },
  receipts:       { title: 'No Receipts', desc: 'Material and expense receipts will appear here.' },
  templates:      { title: 'No Templates', desc: 'Save quote and contract templates for quick reuse.' },
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeIcon = (filename: string): keyof typeof Ionicons.glyphMap => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'document-text';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['xls', 'xlsx'].includes(ext)) return 'grid';
  return 'document-outline';
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isContractor = user?.role === 'contractor';
  const [filter, setFilter] = useState<DocFilter>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['documents', user?.role, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (isContractor) {
        const { data: docs, error } = await supabase
          .from('contractor_documents')
          .select('*')
          .eq('contractor_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return (docs || []).map((d: Record<string, unknown>): Document => ({
          id: d.id as string, filename: (d.name as string) || (d.filename as string) || '', category: (d.category as string) || 'other',
          uploaded_at: d.created_at as string, starred: (d.starred as boolean) ?? false, file_size: d.size_bytes as number | undefined,
          public_url: d.public_url as string | undefined, is_contract: d.is_contract as boolean | undefined, job_id: d.job_id as string | undefined,
        }));
      }
      // Homeowner: aggregate contracts as virtual documents
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, status, created_at, job_id')
        .eq('homeowner_id', user.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      if (contractError) throw new Error(contractError.message);
      return (contracts || []).map((c: { id: string; title: string; status: string; created_at: string; job_id?: string }): Document => ({
        id: c.id, filename: c.title || 'Contract', category: 'contract',
        uploaded_at: c.created_at, starred: false,
        is_contract: true, job_id: c.job_id,
      }));
    },
    enabled: !!user?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: { uri: string; name: string; mimeType: string }) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
      formData.append('name', file.name);
      formData.append('file_type', ext);
      formData.append('category', filter === 'all' ? 'other' : filter);

      await mobileApiClient.postFormData('/api/contractor/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      Alert.alert('Uploaded', 'Document uploaded successfully.');
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await mobileApiClient.patch(`/api/contractor/documents/${id}`, { starred });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handlePickDocument = async () => {
    if (!DocumentPicker) {
      Alert.alert('Not Available', 'Document picker is not installed.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadMutation.mutate({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
    }
  };

  const handleOpenDocument = useCallback((doc: Document) => {
    // Contracts: navigate to the job/contract view
    if (doc.is_contract || doc.category === 'contract' || doc.category === 'contracts') {
      if (doc.job_id) {
        (navigation as ReturnType<typeof Object>).navigate('JobsTab', {
          screen: 'JobDetails',
          params: { jobId: doc.job_id },
        });
      } else {
        // Contract without job_id: try opening the contract directly
        (navigation as ReturnType<typeof Object>).navigate('JobsTab', {
          screen: 'JobDetails',
          params: { jobId: doc.id },
        });
      }
      return;
    }

    // Regular documents: open the file URL
    if (doc.public_url) {
      Linking.openURL(doc.public_url).catch(() => {
        Alert.alert('Cannot Open', 'Unable to open this file. The URL may be unavailable.');
      });
      return;
    }

    Alert.alert('No File', 'This document does not have a viewable file attached.');
  }, [navigation]);

  const documents = data || [];
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.category === filter);

  // Stats
  const stats = useMemo(() => {
    const categories = new Set(documents.map((d) => d.category));
    const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
    return { count: documents.length, categories: categories.size, totalSize };
  }, [documents]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach((d) => {
      const key = d.category?.toLowerCase() || '';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [documents]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#FFFFFF"
            colors={[theme.colors.primary]}
            progressViewOffset={140}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Full-bleed gradient hero */}
            <LinearGradient
              colors={gradients.heroGreen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.decor1} />
              <View style={styles.decor2} />

              {/* Nav row */}
              <View style={styles.heroNav}>
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={20} color={theme.colors.textInverse} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Documents</Text>
                  <Text style={styles.heroSubtitle}>
                    {stats.count} {stats.count === 1 ? 'file' : 'files'} uploaded
                  </Text>
                </View>
                {isContractor && (
                  <TouchableOpacity
                    style={styles.uploadHeroBtn}
                    onPress={handlePickDocument}
                    accessibilityRole="button"
                    accessibilityLabel="Upload document"
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#064E3B" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Stat pills */}
              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{stats.count}</Text>
                  <Text style={styles.statLabel}>Documents</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{stats.categories}</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>
                    {stats.totalSize > 0 ? formatFileSize(stats.totalSize) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Total Size</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Filter chips with icons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_CONFIG.map((f) => {
                const active = filter === f.key;
                const count = filterCounts[f.key] || 0;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setFilter(f.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={f.icon}
                      size={14}
                      color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                    />
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {f.label}
                    </Text>
                    {count > 0 && f.key !== 'all' && (
                      <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                        <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Results count */}
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={FILTER_CONFIG.find((f) => f.key === filter)?.icon ?? 'document-outline'}
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>{EMPTY_MESSAGES[filter].title}</Text>
            <Text style={styles.emptyDesc}>{EMPTY_MESSAGES[filter].desc}</Text>
            {isContractor && (
              <TouchableOpacity style={styles.emptyUploadBtn} onPress={handlePickDocument}>
                <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.textInverse} />
                <Text style={styles.emptyUploadText}>Upload Document</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const docStyle = getDocStyle(item.category);
          const fileIcon = getFileTypeIcon(item.filename);
          const sizeStr = formatFileSize(item.file_size);

          return (
            <TouchableOpacity style={styles.docCard} activeOpacity={0.7} onPress={() => handleOpenDocument(item)}>
              {/* Color accent bar */}
              <View style={[styles.docAccent, { backgroundColor: docStyle.color }]} />

              <View style={styles.docContent}>
                <View style={styles.docTopRow}>
                  {/* Category icon */}
                  <View style={[styles.docIconWrap, { backgroundColor: docStyle.bg }]}>
                    <Ionicons name={docStyle.icon} size={20} color={docStyle.color} />
                  </View>

                  {/* File info */}
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{item.filename}</Text>
                    <View style={styles.docMeta}>
                      <View style={[styles.categoryPill, { backgroundColor: docStyle.bg }]}>
                        <Text style={[styles.categoryPillText, { color: docStyle.color }]}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.docDate}>
                        {new Date(item.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                      {sizeStr ? <Text style={styles.docSize}>{sizeStr}</Text> : null}
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.docActions}>
                    {isContractor && (
                      <TouchableOpacity
                        style={styles.starBtn}
                        onPress={() => toggleStarMutation.mutate({ id: item.id, starred: !item.starred })}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={item.starred ? 'Unstar document' : 'Star document'}
                      >
                        <Ionicons
                          name={item.starred ? 'star' : 'star-outline'}
                          size={18}
                          color={item.starred ? theme.colors.accent : theme.colors.textTertiary}
                        />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Green upload FAB */}
      {isContractor && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={handlePickDocument}
          accessibilityLabel="Upload document"
        >
          <Ionicons name="add" size={28} color={theme.colors.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  uploadHeroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stat pills
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },

  // Filter chips
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    gap: 5,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
  },
  chipBadge: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipBadgeTextActive: {
    color: theme.colors.textInverse,
  },

  // Results
  resultsRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // List
  list: {
    paddingBottom: 100,
  },

  // Document card
  docCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  docAccent: {
    width: 4,
  },
  docContent: {
    flex: 1,
    padding: 14,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  docDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  docSize: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 280,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  emptyUploadText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
});

export default DocumentsScreen;
