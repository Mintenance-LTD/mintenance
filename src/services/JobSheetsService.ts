import { supabase } from '../config/supabase';
import { Database } from '../types/database';

export interface FormTemplate {
  id: string;
  contractor_id: string;
  template_name: string;
  description?: string;
  category: 'inspection' | 'maintenance' | 'installation' | 'repair' | 'safety_check' | 'compliance' | 'quality_assurance' | 'site_survey' | 'completion_report' | 'custom';
  version: number;
  is_active: boolean;
  is_default: boolean;
  allows_photos: boolean;
  allows_signatures: boolean;
  requires_location: boolean;
  requires_approval: boolean;
  approval_workflow?: any;
  notification_settings?: any;
  usage_count: number;
  last_used_at?: string;
  tags?: string[];
  custom_css?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  template_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'number' | 'decimal' | 'date' | 'time' | 'datetime' | 'email' | 'phone' | 'url' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'boolean' | 'rating' | 'slider' | 'signature' | 'photo' | 'file' | 'location' | 'barcode' | 'section_header' | 'html_content';
  is_required: boolean;
  is_readonly: boolean;
  is_hidden: boolean;
  sort_order: number;
  section_name?: string;
  help_text?: string;
  placeholder_text?: string;
  field_options?: any;
  default_value?: string;
  validation_rules?: any;
  error_messages?: any;
  conditional_logic?: any;
  field_width: string;
  custom_classes?: string;
  created_at: string;
  updated_at: string;
}

export interface JobSheet {
  id: string;
  contractor_id: string;
  job_id?: string;
  template_id: string;
  sheet_number: string;
  sheet_title: string;
  status: 'created' | 'in_progress' | 'pending_review' | 'completed' | 'approved' | 'rejected' | 'archived';
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

export interface FormAnalytics {
  id: string;
  contractor_id: string;
  template_id?: string;
  job_sheet_id?: string;
  form_completion_time?: number;
  field_completion_rates?: any;
  error_count: number;
  revision_count: number;
  accuracy_score?: number;
  completeness_score?: number;
  timeliness_score?: number;
  device_type?: string;
  offline_completion: boolean;
  sync_issues: number;
  start_date?: string;
  completion_date?: string;
  created_at: string;
}

export interface DigitalChecklist {
  id: string;
  template_id: string;
  checklist_name: string;
  description?: string;
  category?: string;
  is_required: boolean;
  pass_fail_scoring: boolean;
  weighted_scoring: boolean;
  checklist_items: any[];
  scoring_rules?: any;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFormTemplateData {
  template_name: string;
  description?: string;
  category?: FormTemplate['category'];
  allows_photos?: boolean;
  allows_signatures?: boolean;
  requires_location?: boolean;
  requires_approval?: boolean;
  approval_workflow?: any;
  notification_settings?: any;
  tags?: string[];
  custom_css?: string;
  instructions?: string;
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

export interface JobSheetSummaryStats {
  total_sheets: number;
  completed_sheets: number;
  pending_sheets: number;
  overdue_sheets: number;
  average_completion_time: number;
  average_quality_score: number;
  completion_rate: number;
  on_time_completion_rate: number;
}

export class JobSheetsService {
  // =============================================
  // FORM TEMPLATES MANAGEMENT
  // =============================================
  
  static async createFormTemplate(
    contractorId: string,
    templateData: CreateFormTemplateData
  ): Promise<FormTemplate> {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .insert({
          contractor_id: contractorId,
          template_name: templateData.template_name,
          description: templateData.description,
          category: templateData.category || 'custom',
          allows_photos: templateData.allows_photos ?? true,
          allows_signatures: templateData.allows_signatures ?? true,
          requires_location: templateData.requires_location ?? false,
          requires_approval: templateData.requires_approval ?? false,
          approval_workflow: templateData.approval_workflow,
          notification_settings: templateData.notification_settings,
          tags: templateData.tags,
          custom_css: templateData.custom_css,
          instructions: templateData.instructions,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating form template:', error);
      throw new Error('Failed to create form template');
    }
  }

  static async getFormTemplates(contractorId: string): Promise<FormTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching form templates:', error);
      throw new Error('Failed to fetch form templates');
    }
  }

  static async getFormTemplate(templateId: string): Promise<FormTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching form template:', error);
      throw new Error('Failed to fetch form template');
    }
  }

  static async updateFormTemplate(
    templateId: string,
    templateData: Partial<CreateFormTemplateData>
  ): Promise<FormTemplate> {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .update({
          ...templateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating form template:', error);
      throw new Error('Failed to update form template');
    }
  }

  static async deleteFormTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('form_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting form template:', error);
      throw new Error('Failed to delete form template');
    }
  }

  // =============================================
  // FORM FIELDS MANAGEMENT
  // =============================================

  static async createFormField(
    templateId: string,
    fieldData: Omit<FormField, 'id' | 'template_id' | 'created_at' | 'updated_at'>
  ): Promise<FormField> {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .insert({
          template_id: templateId,
          ...fieldData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating form field:', error);
      throw new Error('Failed to create form field');
    }
  }

  static async getFormFields(templateId: string): Promise<FormField[]> {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching form fields:', error);
      throw new Error('Failed to fetch form fields');
    }
  }

  static async updateFormField(
    fieldId: string,
    fieldData: Partial<Omit<FormField, 'id' | 'template_id' | 'created_at' | 'updated_at'>>
  ): Promise<FormField> {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .update({
          ...fieldData,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating form field:', error);
      throw new Error('Failed to update form field');
    }
  }

  static async deleteFormField(fieldId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting form field:', error);
      throw new Error('Failed to delete form field');
    }
  }

  static async reorderFormFields(templateId: string, fieldOrders: { id: string; sort_order: number }[]): Promise<void> {
    try {
      const updates = fieldOrders.map(({ id, sort_order }) => 
        supabase
          .from('form_fields')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering form fields:', error);
      throw new Error('Failed to reorder form fields');
    }
  }

  // =============================================
  // JOB SHEETS MANAGEMENT
  // =============================================

  static async createJobSheet(
    contractorId: string,
    sheetData: CreateJobSheetData
  ): Promise<JobSheet> {
    try {
      // Generate sheet number
      const { data: sheetNumber } = await supabase
        .rpc('generate_job_sheet_number', { contractor_id_param: contractorId });

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
          status: 'created'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating job sheet:', error);
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
      console.error('Error fetching job sheets:', error);
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
      console.error('Error fetching job sheet:', error);
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
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating job sheet:', error);
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
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating job sheet form data:', error);
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
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting job sheet:', error);
      throw new Error('Failed to start job sheet');
    }
  }

  static async completeJobSheet(sheetId: string, qualityNotes?: string): Promise<JobSheet> {
    try {
      // Calculate quality score
      const { data: qualityScore } = await supabase
        .rpc('calculate_quality_score', { sheet_id: sheetId });

      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          quality_score: qualityScore,
          quality_notes: qualityNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing job sheet:', error);
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
      console.error('Error deleting job sheet:', error);
      throw new Error('Failed to delete job sheet');
    }
  }

  // =============================================
  // SIGNATURES MANAGEMENT
  // =============================================

  static async addJobSheetSignature(
    sheetId: string,
    signatureData: Omit<JobSheetSignature, 'id' | 'job_sheet_id' | 'created_at'>
  ): Promise<JobSheetSignature> {
    try {
      const { data, error } = await supabase
        .from('job_sheet_signatures')
        .insert({
          job_sheet_id: sheetId,
          ...signatureData
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

  // =============================================
  // APPROVALS MANAGEMENT
  // =============================================

  static async submitForApproval(
    sheetId: string,
    approvalLevel: number = 1
  ): Promise<JobSheet> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .update({
          status: 'pending_review',
          updated_at: new Date().toISOString()
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
          approval_notes: approvalNotes
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
          updated_at: new Date().toISOString()
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
          required_changes: requiredChanges
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // Update job sheet status
      const { error: updateError } = await supabase
        .from('job_sheets')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', sheetId);

      if (updateError) throw updateError;

      return approval;
    } catch (error) {
      console.error('Error rejecting job sheet:', error);
      throw new Error('Failed to reject job sheet');
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

  // =============================================
  // ANALYTICS AND REPORTING
  // =============================================

  static async getJobSheetSummaryStats(contractorId: string): Promise<JobSheetSummaryStats> {
    try {
      const { data, error } = await supabase
        .from('job_sheets')
        .select('status, completed_at, due_date, quality_score, created_at, started_at')
        .eq('contractor_id', contractorId);

      if (error) throw error;

      const sheets = data || [];
      const totalSheets = sheets.length;
      const completedSheets = sheets.filter(s => s.status === 'completed' || s.status === 'approved').length;
      const pendingSheets = sheets.filter(s => ['created', 'in_progress', 'pending_review'].includes(s.status)).length;
      
      const now = new Date();
      const overdueSheets = sheets.filter(s => 
        s.due_date && 
        new Date(s.due_date) < now && 
        !['completed', 'approved'].includes(s.status)
      ).length;

      // Calculate average completion time (in hours)
      const completedWithTimes = sheets.filter(s => s.started_at && s.completed_at);
      const avgCompletionTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, s) => {
            const start = new Date(s.started_at!).getTime();
            const end = new Date(s.completed_at!).getTime();
            return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
          }, 0) / completedWithTimes.length
        : 0;

      // Calculate average quality score
      const sheetsWithQuality = sheets.filter(s => s.quality_score !== null);
      const avgQualityScore = sheetsWithQuality.length > 0
        ? sheetsWithQuality.reduce((sum, s) => sum + (s.quality_score || 0), 0) / sheetsWithQuality.length
        : 0;

      // Calculate completion rate
      const completionRate = totalSheets > 0 ? (completedSheets / totalSheets) * 100 : 0;

      // Calculate on-time completion rate
      const completedOnTime = sheets.filter(s => 
        s.completed_at && 
        s.due_date && 
        new Date(s.completed_at) <= new Date(s.due_date)
      ).length;
      const onTimeCompletionRate = completedSheets > 0 ? (completedOnTime / completedSheets) * 100 : 0;

      return {
        total_sheets: totalSheets,
        completed_sheets: completedSheets,
        pending_sheets: pendingSheets,
        overdue_sheets: overdueSheets,
        average_completion_time: avgCompletionTime,
        average_quality_score: avgQualityScore,
        completion_rate: completionRate,
        on_time_completion_rate: onTimeCompletionRate
      };
    } catch (error) {
      console.error('Error fetching job sheet summary stats:', error);
      throw new Error('Failed to fetch job sheet summary stats');
    }
  }

  static async createFormAnalytics(
    contractorId: string,
    analyticsData: Partial<FormAnalytics>
  ): Promise<FormAnalytics> {
    try {
      const { data, error } = await supabase
        .from('form_analytics')
        .insert({
          contractor_id: contractorId,
          ...analyticsData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating form analytics:', error);
      throw new Error('Failed to create form analytics');
    }
  }

  // =============================================
  // DIGITAL CHECKLISTS
  // =============================================

  static async createDigitalChecklist(
    templateId: string,
    checklistData: Omit<DigitalChecklist, 'id' | 'template_id' | 'usage_count' | 'created_at' | 'updated_at'>
  ): Promise<DigitalChecklist> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .insert({
          template_id: templateId,
          ...checklistData,
          usage_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating digital checklist:', error);
      throw new Error('Failed to create digital checklist');
    }
  }

  static async getDigitalChecklists(templateId: string): Promise<DigitalChecklist[]> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching digital checklists:', error);
      throw new Error('Failed to fetch digital checklists');
    }
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

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
        notes: originalSheet.notes
      };

      return await this.createJobSheet(originalSheet.contractor_id, duplicateData);
    } catch (error) {
      console.error('Error duplicating job sheet:', error);
      throw new Error('Failed to duplicate job sheet');
    }
  }

  static async calculateFormCompletionPercentage(sheetId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_form_completion_percentage', { sheet_id: sheetId });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error calculating form completion percentage:', error);
      return 0;
    }
  }

  static validateFormData(formData: any, fields: FormField[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of fields) {
      const value = formData[field.field_name];

      // Check required fields
      if (field.is_required && (!value || value === '')) {
        errors.push(`${field.field_label} is required`);
        continue;
      }

      // Skip validation if field is empty and not required
      if (!value || value === '') continue;

      // Validate based on field type
      switch (field.field_type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field.field_label} must be a valid email address`);
          }
          break;

        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            errors.push(`${field.field_label} must be a valid phone number`);
          }
          break;

        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${field.field_label} must be a valid number`);
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`${field.field_label} must be a valid URL`);
          }
          break;
      }

      // Apply validation rules
      if (field.validation_rules) {
        const rules = field.validation_rules;
        
        if (rules.min_length && value.length < rules.min_length) {
          errors.push(`${field.field_label} must be at least ${rules.min_length} characters long`);
        }
        
        if (rules.max_length && value.length > rules.max_length) {
          errors.push(`${field.field_label} must be no more than ${rules.max_length} characters long`);
        }
        
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            errors.push(`${field.field_label} format is invalid`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}