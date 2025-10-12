import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

export interface FormField {
  id: string;
  template_id: string;
  field_name: string;
  field_label: string;
  field_type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'decimal'
    | 'date'
    | 'time'
    | 'datetime'
    | 'email'
    | 'phone'
    | 'url'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'boolean'
    | 'rating'
    | 'slider'
    | 'signature'
    | 'photo'
    | 'file'
    | 'location'
    | 'barcode'
    | 'section_header'
    | 'html_content';
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

export class FormFieldService {
  static async createFormField(
    templateId: string,
    fieldData: Omit<FormField, 'id' | 'template_id' | 'created_at' | 'updated_at'>
  ): Promise<FormField> {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .insert({
          template_id: templateId,
          ...fieldData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating form field', error);
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
      logger.error('Error fetching form fields', error);
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', fieldId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating form field', error);
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
      logger.error('Error deleting form field', error);
      throw new Error('Failed to delete form field');
    }
  }

  static async reorderFormFields(
    templateId: string,
    fieldOrders: { id: string; sort_order: number }[]
  ): Promise<void> {
    try {
      const updates = fieldOrders.map(({ id, sort_order }) =>
        supabase
          .from('form_fields')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(updates);
    } catch (error) {
      logger.error('Error reordering form fields', error);
      throw new Error('Failed to reorder form fields');
    }
  }

  static validateFormData(
    formData: any,
    fields: FormField[]
  ): { isValid: boolean; errors: string[] } {
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
          errors.push(
            `${field.field_label} must be at least ${rules.min_length} characters long`
          );
        }

        if (rules.max_length && value.length > rules.max_length) {
          errors.push(
            `${field.field_label} must be no more than ${rules.max_length} characters long`
          );
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
      errors,
    };
  }
}