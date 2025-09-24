import { supabase } from '../../config/supabase';

export interface JobSheetSignature {
  id: string;
  job_sheet_id: string;
  signer_name: string;
  signer_role?: string;
  signer_email?: string;
  signature_data: string;
  signature_date: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  consent_given: boolean;
  identity_verified: boolean;
  created_at: string;
}

export class FormSignatureService {
  static async addJobSheetSignature(
    sheetId: string,
    signatureData: Omit<JobSheetSignature, 'id' | 'job_sheet_id' | 'created_at'>
  ): Promise<JobSheetSignature> {
    try {
      const { data, error } = await supabase
        .from('job_sheet_signatures')
        .insert({
          job_sheet_id: sheetId,
          ...signatureData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding job sheet signature:', error);
      throw new Error('Failed to add job sheet signature');
    }
  }

  static async getJobSheetSignatures(sheetId: string): Promise<JobSheetSignature[]> {
    try {
      const { data, error } = await supabase
        .from('job_sheet_signatures')
        .select('*')
        .eq('job_sheet_id', sheetId)
        .order('signature_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job sheet signatures:', error);
      throw new Error('Failed to fetch job sheet signatures');
    }
  }

  static async verifySignature(signatureId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('job_sheet_signatures')
        .select('signature_data, signer_email, device_info')
        .eq('id', signatureId)
        .single();

      if (error) throw error;

      // Basic verification - in production, this would involve cryptographic verification
      return !!(data?.signature_data && data?.signer_email);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  static async deleteSignature(signatureId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('job_sheet_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting signature:', error);
      throw new Error('Failed to delete signature');
    }
  }
}