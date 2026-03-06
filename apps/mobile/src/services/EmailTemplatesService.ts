/**
 * EmailTemplatesService — facade
 * All implementation lives in services/email-templates/
 */

export type { EmailTemplate, TemplateVariable, EmailHistory, EmailAnalytics } from './email-templates/types';
export { createTemplate, getTemplates, getTemplatesByCategory, getTemplate, updateTemplate, deleteTemplate, duplicateTemplate } from './email-templates/TemplateCRUD';
export { processTemplate, replaceVariables, validateTemplate, extractVariablesFromContent } from './email-templates/TemplateProcessor';
export { sendEmail, getEmailHistory } from './email-templates/EmailSender';
export { getAvailableVariables, getVariablesByCategory, getEmailAnalytics, generateAnalyticsReport } from './email-templates/EmailAnalyticsService';

import {
  createTemplate, getTemplates, getTemplatesByCategory, getTemplate, updateTemplate,
  deleteTemplate, duplicateTemplate,
} from './email-templates/TemplateCRUD';
import { processTemplate, replaceVariables, validateTemplate, extractVariablesFromContent } from './email-templates/TemplateProcessor';
import { sendEmail, getEmailHistory } from './email-templates/EmailSender';
import { getAvailableVariables, getVariablesByCategory, getEmailAnalytics, generateAnalyticsReport } from './email-templates/EmailAnalyticsService';

export class EmailTemplatesService {
  static createTemplate = createTemplate;
  static getTemplates = getTemplates;
  static getTemplatesByCategory = getTemplatesByCategory;
  static getTemplate = getTemplate;
  static updateTemplate = updateTemplate;
  static deleteTemplate = deleteTemplate;
  static duplicateTemplate = duplicateTemplate;
  static processTemplate = processTemplate;
  static replaceVariables = replaceVariables;
  static validateTemplate = validateTemplate;
  static extractVariablesFromContent = extractVariablesFromContent;
  static sendEmail = sendEmail;
  static getEmailHistory = getEmailHistory;
  static getAvailableVariables = getAvailableVariables;
  static getVariablesByCategory = getVariablesByCategory;
  static getEmailAnalytics = getEmailAnalytics;
  static generateAnalyticsReport = generateAnalyticsReport;
}
