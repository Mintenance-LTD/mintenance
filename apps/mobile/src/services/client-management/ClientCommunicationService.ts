/**
 * ClientCommunicationService
 * 
 * Handles all communication-related functionality for client management,
 * including templates, bulk messaging, and communication tracking.
 */

import { supabase } from '../../config/supabase';
import { Client, ClientCommunicationTemplate } from './types';

export class ClientCommunicationService {
  /**
   * Send welcome message to new client
   */
  async sendWelcomeMessage(client: Client): Promise<void> {
    try {
      const template = await this.getDefaultTemplate('welcome');
      if (!template) return;

      const personalizedContent = this.personalizeTemplate(template, client);

      await this.createCommunicationRecord({
        clientId: client.id,
        contractorId: client.contractorId,
        type: 'email',
        subject: personalizedContent.subject,
        content: personalizedContent.content,
        templateId: template.id,
      });

      // Increment template usage
      await this.incrementTemplateUsage(template.id);
    } catch (error) {
      console.error('Failed to send welcome message:', error);
    }
  }

  /**
   * Send lifecycle update notification
   */
  async sendLifecycleUpdateNotification(
    client: Client,
    newStage: Client['lifecycle']['stage']
  ): Promise<void> {
    try {
      const template = await this.getDefaultTemplate('lifecycle_update');
      if (!template) return;

      const personalizedContent = this.personalizeTemplate(template, client, {
        newStage,
        previousStage: client.lifecycle.stage,
      });

      await this.createCommunicationRecord({
        clientId: client.id,
        contractorId: client.contractorId,
        type: 'email',
        subject: personalizedContent.subject,
        content: personalizedContent.content,
        templateId: template.id,
      });

      await this.incrementTemplateUsage(template.id);
    } catch (error) {
      console.error('Failed to send lifecycle update notification:', error);
    }
  }

  /**
   * Get communication templates for contractor
   */
  async getCommunicationTemplates(contractorId: string): Promise<ClientCommunicationTemplate[]> {
    const { data, error } = await supabase
      .from('client_communication_templates')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create communication template
   */
  async createCommunicationTemplate(
    contractorId: string,
    templateData: {
      name: string;
      type: 'email' | 'sms' | 'letter';
      subject?: string;
      content: string;
      variables: string[];
    }
  ): Promise<ClientCommunicationTemplate> {
    const { data, error } = await supabase
      .from('client_communication_templates')
      .insert({
        contractor_id: contractorId,
        name: templateData.name,
        type: templateData.type,
        subject: templateData.subject,
        content: templateData.content,
        variables: templateData.variables,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Send bulk communication to client segment
   */
  async sendBulkCommunication(
    segmentId: string,
    templateId: string,
    customizations?: Record<string, any>
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Get segment clients
      const clients = await this.getClientsInSegment(segmentId);
      
      // Get template
      const template = await this.getTemplateById(templateId);
      if (!template) throw new Error('Template not found');

      let sent = 0;
      let failed = 0;

      // Send to each client
      for (const client of clients) {
        try {
          const personalizedContent = this.personalizeTemplate(template, client, customizations);

          await this.createCommunicationRecord({
            clientId: client.id,
            contractorId: client.contractorId,
            type: template.type,
            subject: personalizedContent.subject,
            content: personalizedContent.content,
            templateId: template.id,
          });

          sent++;
        } catch (error) {
          console.error(`Failed to send to client ${client.id}:`, error);
          failed++;
        }
      }

      // Increment template usage
      await this.incrementTemplateUsage(templateId);

      return { sent, failed };
    } catch (error) {
      throw new Error(`Failed to send bulk communication: ${error.message}`);
    }
  }

  /**
   * Get communication history for client
   */
  async getClientCommunicationHistory(clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('client_communications')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Clean up client communications
   */
  async cleanupClientCommunications(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('client_communications')
      .delete()
      .eq('client_id', clientId);

    if (error) throw error;
  }

  /**
   * Get default template by type
   */
  private async getDefaultTemplate(type: string): Promise<ClientCommunicationTemplate | null> {
    const { data, error } = await supabase
      .from('client_communication_templates')
      .select('*')
      .eq('name', type)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get template by ID
   */
  private async getTemplateById(templateId: string): Promise<ClientCommunicationTemplate | null> {
    const { data, error } = await supabase
      .from('client_communication_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Personalize template content
   */
  private personalizeTemplate(
    template: ClientCommunicationTemplate,
    client: Client,
    customData?: Record<string, any>
  ): { subject?: string; content: string } {
    let content = template.content;
    let subject = template.subject;

    // Replace variables with client data
    const variables = {
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: `${client.firstName} ${client.lastName}`,
      companyName: client.companyName || '',
      email: client.email,
      phone: client.phone || '',
      ...customData,
    };

    // Replace variables in content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value || ''));
      if (subject) {
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value || ''));
      }
    });

    return { subject, content };
  }

  /**
   * Create communication record
   */
  private async createCommunicationRecord(data: {
    clientId: string;
    contractorId: string;
    type: string;
    subject?: string;
    content: string;
    templateId?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('client_communications')
      .insert({
        client_id: data.clientId,
        contractor_id: data.contractorId,
        type: data.type,
        subject: data.subject,
        content: data.content,
        template_id: data.templateId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Increment template usage count
   */
  private async incrementTemplateUsage(templateId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) throw error;
  }

  /**
   * Get clients in segment
   */
  private async getClientsInSegment(segmentId: string): Promise<Client[]> {
    // This would typically use the segmentation service
    // For now, we'll return a simplified implementation
    const { data, error } = await supabase
      .from('client_segments')
      .select('criteria')
      .eq('id', segmentId)
      .single();

    if (error) throw error;

    // Apply segment criteria to get clients
    // This is simplified - in production, you'd use the segmentation service
    const { data: clients, error: clientError } = await supabase
      .from('contractor_clients')
      .select('*');

    if (clientError) throw clientError;
    return clients || [];
  }
}
