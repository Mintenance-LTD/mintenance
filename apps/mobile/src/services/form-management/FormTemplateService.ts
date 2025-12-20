import { supabase } from '../../config/supabase';
import { handleDatabaseOperation, validateRequired } from '../../utils/serviceHelper';
import { logger } from '../../utils/logger';

export interface FormTemplate {
  id: string;
  contractor_id: string;
  template_name: string;
  description?: string;
  category:
    | 'inspection'
    | 'maintenance'
    | 'installation'
    | 'repair'
    | 'safety_check'
    | 'compliance'
    | 'quality_assurance'
    | 'site_survey'
    | 'completion_report'
    | 'custom';
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

export class FormTemplateService {
  static async createFormTemplate(
    contractorId: string,
    templateData: CreateFormTemplateData
  ): Promise<FormTemplate> {
    const context = {
      service: 'FormTemplateService',
      method: 'createFormTemplate',
      params: { contractorId, templateData }
    };

    // Validate required fields
    validateRequired(contractorId, 'contractorId', context);
    validateRequired(templateData.template_name, 'template_name', context);

    return handleDatabaseOperation(
      () => supabase
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
          version: 1,
        })
        .select()
        .single(),
      context
    );
  }

  static async getFormTemplates(contractorId: string): Promise<FormTemplate[]> {
    const context = {
      service: 'FormTemplateService',
      method: 'getFormTemplates',
      params: { contractorId }
    };

    validateRequired(contractorId, 'contractorId', context);

    const result = await handleDatabaseOperation(
      () => supabase
        .from('form_templates')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false }),
      context
    );

    return result || [];
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
      logger.error('Error fetching form template', error);
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating form template', error);
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
      logger.error('Error deleting form template', error);
      throw new Error('Failed to delete form template');
    }
  }
}