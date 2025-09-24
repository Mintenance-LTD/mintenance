import { supabase } from '../../config/supabase';
import { JobSheet } from './JobSheetOperationsService';

export interface FormApproval {
  id: string;
  job_sheet_id: string;
  approved_by: string;
  approval_status: 'approved' | 'rejected' | 'needs_revision';
  approval_level: number;
  approval_notes?: string;
  required_changes?: any;
  approval_deadline?: string;
  approved_at: string;
  created_at: string;
}

export class FormApprovalService {
  static async submitForApproval(
    sheetId: string,
    approvalLevel: number = 1
  ): Promise<JobSheet> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          status: 'pending_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting job sheet for approval:', error);
      throw new Error('Failed to submit job sheet for approval');
    }
  }

  static async approveJobSheet(
    sheetId: string,
    approverId: string,
    approvalNotes?: string,
    approvalLevel: number = 1
  ): Promise<FormApproval> {
    try {
      // Create approval record
      const { data: approval, error: approvalError } = await supabase
        .from('form_approvals')
        .insert({
          job_sheet_id: sheetId,
          approved_by: approverId,
          approval_status: 'approved',
          approval_level: approvalLevel,
          approval_notes: approvalNotes,
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Update job sheet status
      const { error: updateError } = await supabase
        .from('job_sheets')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId);

      if (updateError) throw updateError;

      return approval;
    } catch (error) {
      console.error('Error approving job sheet:', error);
      throw new Error('Failed to approve job sheet');
    }
  }

  static async rejectJobSheet(
    sheetId: string,
    approverId: string,
    rejectionNotes: string,
    requiredChanges?: any,
    approvalLevel: number = 1
  ): Promise<FormApproval> {
    try {
      // Create rejection record
      const { data: approval, error: approvalError } = await supabase
        .from('form_approvals')
        .insert({
          job_sheet_id: sheetId,
          approved_by: approverId,
          approval_status: 'rejected',
          approval_level: approvalLevel,
          approval_notes: rejectionNotes,
          required_changes: requiredChanges,
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Update job sheet status
      const { error: updateError } = await supabase
        .from('job_sheets')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId);

      if (updateError) throw updateError;

      return approval;
    } catch (error) {
      console.error('Error rejecting job sheet:', error);
      throw new Error('Failed to reject job sheet');
    }
  }

  static async requestRevision(
    sheetId: string,
    approverId: string,
    revisionNotes: string,
    requiredChanges: any,
    approvalLevel: number = 1
  ): Promise<FormApproval> {
    try {
      // Create revision request record
      const { data: approval, error: approvalError } = await supabase
        .from('form_approvals')
        .insert({
          job_sheet_id: sheetId,
          approved_by: approverId,
          approval_status: 'needs_revision',
          approval_level: approvalLevel,
          approval_notes: revisionNotes,
          required_changes: requiredChanges,
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Update job sheet status
      const { error: updateError } = await supabase
        .from('job_sheets')
        .update({
          status: 'created', // Reset to created for revision
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId);

      if (updateError) throw updateError;

      return approval;
    } catch (error) {
      console.error('Error requesting revision:', error);
      throw new Error('Failed to request revision');
    }
  }

  static async getJobSheetApprovals(sheetId: string): Promise<FormApproval[]> {
    try {
      const { data, error } = await supabase
        .from('form_approvals')
        .select('*')
        .eq('job_sheet_id', sheetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job sheet approvals:', error);
      throw new Error('Failed to fetch job sheet approvals');
    }
  }

  static async getPendingApprovals(approverId: string): Promise<FormApproval[]> {
    try {
      const { data, error } = await supabase
        .from('form_approvals')
        .select(`
          *,
          job_sheets:job_sheet_id (
            id,
            sheet_title,
            contractor_id,
            created_at
          )
        `)
        .eq('approved_by', approverId)
        .eq('approval_status', 'needs_revision')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw new Error('Failed to fetch pending approvals');
    }
  }

  static async getApprovalHistory(contractorId: string): Promise<FormApproval[]> {
    try {
      const { data, error } = await supabase
        .from('form_approvals')
        .select(`
          *,
          job_sheets:job_sheet_id!inner (
            id,
            sheet_title,
            contractor_id
          )
        `)
        .eq('job_sheets.contractor_id', contractorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching approval history:', error);
      throw new Error('Failed to fetch approval history');
    }
  }
}