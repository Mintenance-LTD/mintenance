/**
 * DocumentsScreen — Redesigned with full-bleed hero, color-coded
 * document cards, category icons, and green upload FAB.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
import { styles } from './DocumentsStyles';

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

type DocFilter =
  | 'all'
  | 'contracts'
  | 'photos'
  | 'certifications'
  | 'insurance'
  | 'receipts'
  | 'templates';

const FILTER_CONFIG: {
  key: DocFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'contracts', label: 'Contracts', icon: 'document-text-outline' },
  { key: 'photos', label: 'Photos', icon: 'image-outline' },
  { key: 'certifications', label: 'Certs', icon: 'ribbon-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' },
  { key: 'templates', label: 'Templates', icon: 'copy-outline' },
];

const CATEGORY_STYLE: Record<
  string,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  contracts: {
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    icon: 'document-text',
  },
  contract: {
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    icon: 'document-text',
  },
  photos: { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  photo: { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  certifications: {
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
    icon: 'ribbon',
  },
  certification: {
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
    icon: 'ribbon',
  },
  insurance: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'shield-checkmark' },
  receipts: {
    color: theme.colors.textSecondary,
    bg: theme.colors.backgroundTertiary,
    icon: 'receipt',
  },
  receipt: {
    color: theme.colors.textSecondary,
    bg: theme.colors.backgroundTertiary,
    icon: 'receipt',
  },
  templates: { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
  template: { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
};

const getDocStyle = (category: string) => {
  const key = category?.toLowerCase() || '';
  return (
    CATEGORY_STYLE[key] || {
      color: theme.colors.textSecondary,
      bg: theme.colors.backgroundTertiary,
      icon: 'document-outline' as const,
    }
  );
};

const EMPTY_MESSAGES: Record<DocFilter, { title: string; desc: string }> = {
  all: {
    title: 'No Documents Yet',
    desc: 'Upload contracts, photos, certificates and more to keep everything organised.',
  },
  contracts: {
    title: 'No Contracts',
    desc: 'Signed contracts with your clients will appear here.',
  },
  photos: {
    title: 'No Photos',
    desc: 'Job photos and site images will be stored here.',
  },
  certifications: {
    title: 'No Certificates',
    desc: 'Upload your trade certifications to build trust with homeowners.',
  },
  insurance: {
    title: 'No Insurance Docs',
    desc: 'Add your liability and professional insurance documents.',
  },
  receipts: {
    title: 'No Receipts',
    desc: 'Material and expense receipts will appear here.',
  },
  templates: {
    title: 'No Templates',
    desc: 'Save quote and contract templates for quick reuse.',
  },
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeIcon = (filename: string): keyof typeof Ionicons.glyphMap => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext))
    return 'image';
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
      const allDocs: Document[] = [];
      const idCol = isContractor ? 'contractor_id' : 'homeowner_id';

      // 1. Contracts (both roles)
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, title, status, amount, created_at, job_id')
        .eq(idCol, user.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      (contracts || []).forEach((c: Record<string, unknown>) => {
        const status = c.status as string;
        const statusLabel =
          status === 'accepted'
            ? 'Signed'
            : status === 'pending_contractor'
              ? 'Awaiting Contractor'
              : status === 'pending_homeowner'
                ? 'Awaiting You'
                : status;
        allDocs.push({
          id: c.id as string,
          filename: `${(c.title as string) || 'Contract'} (${statusLabel})`,
          category: 'contracts',
          uploaded_at: c.created_at as string,
          starred: false,
          is_contract: true,
          job_id: c.job_id as string | undefined,
        });
      });

      if (isContractor) {
        // 2. Uploaded documents
        const { data: docs } = await supabase
          .from('contractor_documents')
          .select('*')
          .eq('contractor_id', user.id)
          .order('created_at', { ascending: false });
        (docs || []).forEach((d: Record<string, unknown>) => {
          allDocs.push({
            id: d.id as string,
            filename: (d.name as string) || (d.filename as string) || '',
            category: (d.category as string) || 'other',
            uploaded_at: d.created_at as string,
            starred: (d.starred as boolean) ?? false,
            file_size: d.size_bytes as number | undefined,
            public_url: d.public_url as string | undefined,
            job_id: d.job_id as string | undefined,
          });
        });

        // 3. Certifications as documents
        const { data: certs } = await supabase
          .from('contractor_certifications')
          .select(
            'id, certification_name, issuing_body, issue_date, expiry_date, document_url'
          )
          .eq('contractor_id', user.id)
          .order('issue_date', { ascending: false });
        (certs || []).forEach((c: Record<string, unknown>) => {
          allDocs.push({
            id: `cert-${c.id as string}`,
            filename: `${(c.certification_name as string) || 'Certification'} — ${(c.issuing_body as string) || ''}`,
            category: 'certification',
            uploaded_at: (c.issue_date as string) || '',
            starred: false,
            public_url: c.document_url as string | undefined,
          });
        });
      }

      // Sort all by date descending
      allDocs.sort(
        (a, b) =>
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      return allDocs;
    },
    enabled: !!user?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: {
      uri: string;
      name: string;
      mimeType: string;
    }) => {
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
      // 2026-05-02 audit follow-up: backend exposes
      // `PATCH /api/contractor/documents` and reads `id` from the body
      // (see route.ts:281). The path-segment form 404'd silently and
      // the star icon flipped only in local state.
      await mobileApiClient.patch('/api/contractor/documents', {
        id,
        starred,
      });
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
      uploadMutation.mutate({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
    }
  };

  const handleOpenDocument = useCallback(
    (doc: Document) => {
      // Contracts: navigate to the job/contract view
      if (
        doc.is_contract ||
        doc.category === 'contract' ||
        doc.category === 'contracts'
      ) {
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
          Alert.alert(
            'Cannot Open',
            'Unable to open this file. The URL may be unavailable.'
          );
        });
        return;
      }

      Alert.alert(
        'No File',
        'This document does not have a viewable file attached.'
      );
    },
    [navigation]
  );

  const documents = data || [];
  const filtered =
    filter === 'all'
      ? documents
      : documents.filter((d) => d.category === filter);

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
                  accessibilityRole='button'
                  accessibilityLabel='Go back'
                >
                  <Ionicons
                    name='arrow-back'
                    size={20}
                    color={theme.colors.textInverse}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Documents</Text>
                  <Text style={styles.heroSubtitle}>
                    {stats.count} {stats.count === 1 ? 'file' : 'files'}{' '}
                    uploaded
                  </Text>
                </View>
                {isContractor && (
                  <TouchableOpacity
                    style={styles.uploadHeroBtn}
                    onPress={handlePickDocument}
                    accessibilityRole='button'
                    accessibilityLabel='Upload document'
                  >
                    <Ionicons
                      name='cloud-upload-outline'
                      size={18}
                      color='#064E3B'
                    />
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
                    {stats.totalSize > 0
                      ? formatFileSize(stats.totalSize)
                      : '—'}
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
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setFilter(f.key)}
                    accessibilityRole='button'
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={f.icon}
                      size={14}
                      color={
                        active
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                    {count > 0 && f.key !== 'all' && (
                      <View
                        style={[
                          styles.chipBadge,
                          active && styles.chipBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipBadgeText,
                            active && styles.chipBadgeTextActive,
                          ]}
                        >
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
                {filtered.length}{' '}
                {filtered.length === 1 ? 'document' : 'documents'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={
                  FILTER_CONFIG.find((f) => f.key === filter)?.icon ??
                  'document-outline'
                }
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {EMPTY_MESSAGES[filter].title}
            </Text>
            <Text style={styles.emptyDesc}>{EMPTY_MESSAGES[filter].desc}</Text>
            {isContractor && (
              <TouchableOpacity
                style={styles.emptyUploadBtn}
                onPress={handlePickDocument}
              >
                <Ionicons
                  name='cloud-upload-outline'
                  size={18}
                  color={theme.colors.textInverse}
                />
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
            <TouchableOpacity
              style={styles.docCard}
              activeOpacity={0.7}
              onPress={() => handleOpenDocument(item)}
            >
              {/* Color accent bar */}
              <View
                style={[styles.docAccent, { backgroundColor: docStyle.color }]}
              />

              <View style={styles.docContent}>
                <View style={styles.docTopRow}>
                  {/* Category icon */}
                  <View
                    style={[
                      styles.docIconWrap,
                      { backgroundColor: docStyle.bg },
                    ]}
                  >
                    <Ionicons
                      name={docStyle.icon}
                      size={20}
                      color={docStyle.color}
                    />
                  </View>

                  {/* File info */}
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {item.filename}
                    </Text>
                    <View style={styles.docMeta}>
                      <View
                        style={[
                          styles.categoryPill,
                          { backgroundColor: docStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            { color: docStyle.color },
                          ]}
                        >
                          {item.category.charAt(0).toUpperCase() +
                            item.category.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.docDate}>
                        {new Date(item.uploaded_at).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </Text>
                      {sizeStr ? (
                        <Text style={styles.docSize}>{sizeStr}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.docActions}>
                    {isContractor && (
                      <TouchableOpacity
                        style={styles.starBtn}
                        onPress={() =>
                          toggleStarMutation.mutate({
                            id: item.id,
                            starred: !item.starred,
                          })
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={
                          item.starred ? 'Unstar document' : 'Star document'
                        }
                      >
                        <Ionicons
                          name={item.starred ? 'star' : 'star-outline'}
                          size={18}
                          color={
                            item.starred
                              ? theme.colors.accent
                              : theme.colors.textTertiary
                          }
                        />
                      </TouchableOpacity>
                    )}
                    <Ionicons
                      name='chevron-forward'
                      size={16}
                      color={theme.colors.textTertiary}
                    />
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
          accessibilityLabel='Upload document'
        >
          <Ionicons name='add' size={28} color={theme.colors.textInverse} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default DocumentsScreen;
