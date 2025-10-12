import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

export interface JobSheet {
  id: string;
  contractor_id: string;
  job_id?: string;
  template_id: string;
  sheet_number: string;
  sheet_title: string;
  status:
    | 'created'
    | 'in_progress'
    | 'pending_review'
    | 'completed'
    | 'approved'
    | 'rejected'
    | 'archived';
  priority: number;
  assigned_to?: string;
  reviewed_by?: string;
  approved_by?: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  due_date?: string;
  location_name?: string;
  location_address?: string;
  location_coordinates?: { lat: number; lng: number };
  location_accuracy?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_signature?: any;
  form_data: any;
  photos: any[];
  documents: any[];
  signatures: any;
  quality_score?: number;
  quality_notes?: string;
  billable_hours?: number;
  materials_cost?: number;
  total_cost?: number;
  compliance_items: any[];
  safety_checklist: any[];
  revision_number: number;
  revision_notes?: string;
  parent_sheet_id?: string;
  last_synced_at?: string;
  sync_conflicts: any[];
  tags?: string[];
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJobSheetData {
  template_id: string;
  job_id?: string;
  sheet_title: string;
  priority?: number;
  assigned_to?: string;
  scheduled_date?: string;
  due_date?: string;
  location_name?: string;
  location_address?: string;
  location_coordinates?: { lat: number; lng: number };
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  form_data?: any;
  tags?: string[];
  notes?: string;
}

export interface JobSheetFilters {
  status?: JobSheet['status'][];
  template_id?: string;
  assigned_to?: string;
  priority?: number[];
  date_range?: {
    start: string;
    end: string;
  };
  location_search?: string;
  client_search?: string;
  tags?: string[];
}

export class JobSheetOperationsService {
  static async createJobSheet(
    contractorId: string,
    sheetData: CreateJobSheetData
  ): Promise<JobSheet> {
    try {
      // Generate sheet number
      const { data: sheetNumber } = await supabase.rpc(
        'generate_job_sheet_number',
        { contractor_id_param: contractorId }
      );

      const { data, error } = await supabase
        .from('job_sheets')
        .insert({
          contractor_id: contractorId,
          sheet_number: sheetNumber,
          template_id: sheetData.template_id,
          job_id: sheetData.job_id,
          sheet_title: sheetData.sheet_title,
          priority: sheetData.priority || 3,
          assigned_to: sheetData.assigned_to,
          scheduled_date: sheetData.scheduled_date,
          due_date: sheetData.due_date,
          location_name: sheetData.location_name,
          location_address: sheetData.location_address,
          location_coordinates: sheetData.location_coordinates
            ? `POINT(${sheetData.location_coordinates.lng} ${sheetData.location_coordinates.lat})`
            : null,
          client_name: sheetData.client_name,
          client_email: sheetData.client_email,
          client_phone: sheetData.client_phone,
          form_data: sheetData.form_data || {},
          tags: sheetData.tags,
          notes: sheetData.notes,
          status: 'created',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating job sheet', error);
      throw new Error('Failed to create job sheet');
    }
  }

  static async getJobSheets(
    contractorId: string,
    filters?: JobSheetFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<JobSheet[]> {
    try {
      let query = supabase
        .from('job_sheets')
        .select('*')
        .eq('contractor_id', contractorId);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.template_id) {
        query = query.eq('template_id', filters.template_id);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }

      if (filters?.client_search) {
        query = query.ilike('client_name', `%${filters.client_search}%`);
      }

      if (filters?.location_search) {
        query = query.ilike('location_name', `%${filters.location_search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching job sheets', error);
      throw new Error('Failed to fetch job sheets');
    }
  }

  static async getJobSheet(sheetId: string): Promise<JobSheet | null> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .select('*')
        .eq('id', sheetId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching job sheet', error);
      throw new Error('Failed to fetch job sheet');
    }
  }

  static async updateJobSheet(
    sheetId: string,
    sheetData: Partial<JobSheet>
  ): Promise<JobSheet> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          ...sheetData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating job sheet', error);
      throw new Error('Failed to update job sheet');
    }
  }

  static async updateJobSheetFormData(
    sheetId: string,
    formData: any
  ): Promise<JobSheet> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          form_data: formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating job sheet form data', error);
      throw new Error('Failed to update job sheet form data');
    }
  }

  static async startJobSheet(sheetId: string): Promise<JobSheet> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error starting job sheet', error);
      throw new Error('Failed to start job sheet');
    }
  }

  static async completeJobSheet(
    sheetId: string,
    qualityNotes?: string
  ): Promise<JobSheet> {
    try {
      // Calculate quality score
      const { data: qualityScore } = await supabase.rpc(
        'calculate_quality_score',
        { sheet_id: sheetId }
      );

      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          quality_score: qualityScore,
          quality_notes: qualityNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error completing job sheet', error);
      throw new Error('Failed to complete job sheet');
    }
  }

  static async deleteJobSheet(sheetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('job_sheets')
        .delete()
        .eq('id', sheetId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting job sheet', error);
      throw new Error('Failed to delete job sheet');
    }
  }

  static async duplicateJobSheet(
    sheetId: string,
    newTitle?: string
  ): Promise<JobSheet> {
    try {
      const originalSheet = await this.getJobSheet(sheetId);
      if (!originalSheet) throw new Error('Job sheet not found');

      const duplicateData: CreateJobSheetData = {
        template_id: originalSheet.template_id,
        job_id: originalSheet.job_id,
        sheet_title: newTitle || `${originalSheet.sheet_title} (Copy)`,
        priority: originalSheet.priority,
        location_name: originalSheet.location_name,
        location_address: originalSheet.location_address,
        location_coordinates: originalSheet.location_coordinates,
        client_name: originalSheet.client_name,
        client_email: originalSheet.client_email,
        client_phone: originalSheet.client_phone,
        form_data: originalSheet.form_data,
        tags: originalSheet.tags,
        notes: originalSheet.notes,
      };

      return await this.createJobSheet(
        originalSheet.contractor_id,
        duplicateData
      );
    } catch (error) {
      logger.error('Error duplicating job sheet', error);
      throw new Error('Failed to duplicate job sheet');
    }
  }

  static async calculateFormCompletionPercentage(sheetId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc(
        'calculate_form_completion_percentage',
        { sheet_id: sheetId }
      );

      if (error) throw error;
      return data || 0;
    } catch (error) {
      logger.error('Error calculating form completion percentage', error);
      return 0;
    }
  }
}