import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { EmailTemplate } from './types';
import { getTemplate } from './TemplateCRUD';

export async function processTemplate(
  templateId: string,
  variables: Record<string, unknown>
): Promise<{ subject_line: string; html_content?: string; text_content: string }> {
  try {
    const template = await getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const { data: missingVars } = await supabase.rpc('validate_template_variables', {
      template_id: templateId, provided_variables: variables,
    });
    if (missingVars && missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    const { data: processedSubject } = await supabase.rpc('replace_template_variables', {
      template_content: template.subject_line, variables,
    });
    const { data: processedText } = await supabase.rpc('replace_template_variables', {
      template_content: template.text_content, variables,
    });

    let processedHtml: string | undefined;
    if (template.html_content) {
      const { data: htmlData } = await supabase.rpc('replace_template_variables', {
        template_content: template.html_content, variables,
      });
      processedHtml = htmlData;
    }

    return {
      subject_line: processedSubject || template.subject_line,
      text_content: processedText || template.text_content,
      html_content: processedHtml,
    };
  } catch (error) { logger.error('Error processing template:', error); throw error; }
}

export function replaceVariables(content: string, variables: Record<string, unknown>): string {
  return Object.keys(variables).reduce((result, key) => {
    return result.split(`{{${key}}}`).join(String(variables[key] || ''));
  }, content);
}

export function validateTemplate(template: Partial<EmailTemplate>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!template.template_name || template.template_name.trim().length === 0) errors.push('Template name is required');
  if (!template.subject_line || template.subject_line.trim().length === 0) errors.push('Subject line is required');
  if (!template.text_content || template.text_content.trim().length === 0) errors.push('Text content is required');
  if (template.subject_line && template.subject_line.length > 200) errors.push('Subject line should be under 200 characters');
  if (template.preview_text && template.preview_text.length > 150) errors.push('Preview text should be under 150 characters');
  return { isValid: errors.length === 0, errors };
}

export function extractVariablesFromContent(content: string): string[] {
  const matches = Array.from(content.matchAll(/\{\{([^}]+)\}\}/g));
  const seen = new Set<string>();
  const variables: string[] = [];
  for (const match of matches) {
    const variable = match[1].trim();
    if (!seen.has(variable)) { seen.add(variable); variables.push(variable); }
  }
  return variables;
}
