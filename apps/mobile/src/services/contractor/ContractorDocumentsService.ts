/**
 * Contractor Documents Service
 *
 * Read operations use direct Supabase queries; writes use mobileApiClient
 * for server-side orchestration.
 */

import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';

export interface ContractorDocument {
  id: string;
  name: string;
  file_type: string;
  public_url: string;
  storage_path?: string;
  category: string;
  size_bytes?: number;
  starred?: boolean;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  // Virtual documents (contracts)
  is_contract?: boolean;
  job_id?: string;
}

export class ContractorDocumentsService {
  static async getDocuments(): Promise<ContractorDocument[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        logger.error('Failed to fetch contractor documents: not authenticated');
        return [];
      }

      const { data, error } = await supabase
        .from('contractor_documents')
        .select('*')
        .eq('contractor_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch contractor documents', error.message);
        return [];
      }

      return (data ?? []) as unknown as ContractorDocument[];
    } catch (error) {
      logger.error('Failed to fetch contractor documents', error);
      return [];
    }
  }

  static async uploadDocument(
    file: { uri: string; name: string; mimeType: string },
    category: string = 'other',
    jobId?: string
  ): Promise<ContractorDocument> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
    formData.append('category', category);
    if (jobId) formData.append('job_id', jobId);

    return mobileApiClient.postFormData<ContractorDocument>(
      '/api/contractor/documents',
      formData
    );
  }

  static async deleteDocument(documentId: string): Promise<void> {
    await mobileApiClient.delete(
      `/api/contractor/documents?id=${encodeURIComponent(documentId)}`
    );
  }

  static async toggleStar(documentId: string, starred: boolean): Promise<void> {
    await mobileApiClient.patch('/api/contractor/documents', {
      id: documentId,
      starred,
    });
  }

  static async updateTags(documentId: string, tags: string[]): Promise<void> {
    await mobileApiClient.patch('/api/contractor/documents', {
      id: documentId,
      tags,
    });
  }
}
