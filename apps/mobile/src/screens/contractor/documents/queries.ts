import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { supabase } from '../../../config/supabase';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import type { Document, DocFilter } from './types';

/**
 * React Query hooks for the Documents screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 *
 * Fetches three sources and merges into a single sorted list:
 *   1. Contracts (both roles, excluding draft status)
 *   2. Uploaded contractor documents (contractor only)
 *   3. Certifications projected as documents (contractor only)
 */
export function useDocumentsQuery(args: {
  userId: string | undefined;
  isContractor: boolean;
}) {
  const { userId, isContractor } = args;
  return useQuery({
    queryKey: ['documents', isContractor ? 'contractor' : 'homeowner', userId],
    queryFn: async () => {
      if (!userId) return [] as Document[];
      const allDocs: Document[] = [];
      const idCol = isContractor ? 'contractor_id' : 'homeowner_id';

      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, title, status, amount, created_at, job_id')
        .eq(idCol, userId)
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
        const { data: docs } = await supabase
          .from('contractor_documents')
          .select('*')
          .eq('contractor_id', userId)
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

        // 2026-05-02 audit follow-up: the prior SELECT picked
        // `certification_name` + `issuing_body` — neither of which
        // exists on `public.contractor_certifications`. Supabase
        // tolerated the unknown column names and silently returned
        // null for both. Canonical columns (verified live + locked
        // in by migration 20260502000000_contractor_certifications_canonical)
        // are `name` and `issuer`.
        const { data: certs } = await supabase
          .from('contractor_certifications')
          .select('id, name, issuer, issue_date, expiry_date, document_url')
          .eq('contractor_id', userId)
          .order('issue_date', { ascending: false });
        (certs || []).forEach((c: Record<string, unknown>) => {
          const name = (c.name as string) || 'Certification';
          const issuer = (c.issuer as string) || '';
          allDocs.push({
            id: `cert-${c.id as string}`,
            filename: issuer ? `${name} — ${issuer}` : name,
            category: 'certification',
            uploaded_at: (c.issue_date as string) || '',
            starred: false,
            public_url: c.document_url as string | undefined,
            // Surface the expiry so the screen can flag lapsing certs
            // (UK landlord/contractor compliance window — Gas Safe and
            // EICR are time-bound).
            expires_at: (c.expiry_date as string | null) ?? undefined,
          });
        });
      }

      allDocs.sort(
        (a, b) =>
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      return allDocs;
    },
    enabled: !!userId,
  });
}

export function useUploadDocument(currentFilter: DocFilter) {
  const queryClient = useQueryClient();
  return useMutation({
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
      formData.append(
        'category',
        currentFilter === 'all' ? 'other' : currentFilter
      );
      await mobileApiClient.postFormData('/api/contractor/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      Alert.alert('Uploaded', 'Document uploaded successfully.');
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      // 2026-05-02 audit follow-up: backend exposes
      // `PATCH /api/contractor/documents` and reads `id` from the body
      // (route.ts:281). The path-segment form 404'd silently and the
      // star icon flipped only in local state.
      await mobileApiClient.patch('/api/contractor/documents', {
        id,
        starred,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}
