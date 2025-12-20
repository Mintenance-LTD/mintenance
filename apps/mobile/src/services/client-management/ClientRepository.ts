/**
 * ClientRepository
 * 
 * Handles all database operations for client management, including CRUD operations,
 * filtering, searching, and data import/export functionality.
 */

import { supabase } from '../../config/supabase';
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientFilters,
  ClientSortOptions,
  ClientSearchParams,
  ClientImportData,
  ClientExportOptions,
  ClientFollowUpTask,
} from './types';

export class ClientRepository {
  /**
   * Create a new client in the database
   */
  async createClient(request: CreateClientRequest): Promise<Client> {
    const { data, error } = await supabase
      .from('contractor_clients')
      .insert({
        contractor_id: request.contractorId,
        type: request.type,
        first_name: request.firstName,
        last_name: request.lastName,
        email: request.email,
        phone: request.phone,
        company_name: request.companyName,
        address: request.address,
        status: request.status || 'prospect',
        priority: request.priority || 'medium',
        source: request.source,
        tags: request.tags || [],
        notes: request.notes || '',
        preferences: request.preferences || {
          communicationMethod: 'email',
          bestTimeToContact: '9:00 AM - 5:00 PM',
          serviceTypes: [],
          budgetRange: [0, 10000],
          urgencyPreference: 'flexible',
          paymentMethod: 'card',
        },
        lifecycle: {
          stage: 'lead',
          stageDate: new Date().toISOString(),
          totalJobs: 0,
          totalValue: 0,
          avgJobValue: 0,
          lifetimeValue: 0,
          satisfactionScore: 0,
          retentionRisk: 0,
        },
        financials: {
          totalSpent: 0,
          outstandingBalance: 0,
          paymentHistory: [],
          averagePaymentTime: 0,
          paymentRating: 5,
        },
        properties: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get clients for a contractor with filtering and sorting
   */
  async getClients(
    contractorId: string,
    params?: ClientSearchParams
  ): Promise<{ clients: Client[]; total: number }> {
    let query = supabase
      .from('contractor_clients')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    // Apply filters
    if (params?.filters) {
      const filters = params.filters;
      
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.type?.length) {
        query = query.in('type', filters.type);
      }
      
      if (filters.tags?.length) {
        query = query.overlaps('tags', filters.tags);
      }
      
      if (filters.lifecycleStage?.length) {
        query = query.in('lifecycle->stage', filters.lifecycleStage);
      }
      
      if (filters.source?.length) {
        query = query.in('source', filters.source);
      }
      
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }
      
      if (filters.financialRange) {
        query = query
          .gte('financials->totalSpent', filters.financialRange.minSpent)
          .lte('financials->totalSpent', filters.financialRange.maxSpent);
      }
    }

    // Apply search query
    if (params?.query) {
      query = query.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,email.ilike.%${params.query}%,company_name.ilike.%${params.query}%`);
    }

    // Apply sorting
    if (params?.sort) {
      const { field, direction } = params.sort;
      query = query.order(field, { ascending: direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      clients: data || [],
      total: count || 0,
    };
  }

  /**
   * Get a specific client by ID
   */
  async getClientById(clientId: string): Promise<Client> {
    const { data, error } = await supabase
      .from('contractor_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing client
   */
  async updateClient(request: UpdateClientRequest): Promise<Client> {
    const updateData = {
      ...request.updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contractor_clients')
      .update(updateData)
      .eq('id', request.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('contractor_clients')
      .delete()
      .eq('id', clientId);

    if (error) throw error;
  }

  /**
   * Update client lifecycle stage
   */
  async updateClientLifecycle(
    clientId: string,
    stage: Client['lifecycle']['stage'],
    notes?: string
  ): Promise<Client> {
    const { data: client, error: fetchError } = await supabase
      .from('contractor_clients')
      .select('lifecycle')
      .eq('id', clientId)
      .single();

    if (fetchError) throw fetchError;

    const updatedLifecycle = {
      ...client.lifecycle,
      stage,
      stageDate: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contractor_clients')
      .update({
        lifecycle: updatedLifecycle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add client interaction
   */
  async addClientInteraction(
    clientId: string,
    interactionData: {
      type: 'call' | 'email' | 'meeting' | 'job' | 'follow_up' | 'complaint' | 'compliment';
      subject: string;
      description: string;
      outcome?: string;
      nextAction?: string;
      scheduledDate?: string;
      duration?: number;
      attachments?: string[];
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('client_interactions')
      .insert({
        client_id: clientId,
        type: interactionData.type,
        subject: interactionData.subject,
        description: interactionData.description,
        outcome: interactionData.outcome,
        next_action: interactionData.nextAction,
        scheduled_date: interactionData.scheduledDate,
        duration: interactionData.duration,
        attachments: interactionData.attachments || [],
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Import clients from external data
   */
  async importClients(
    contractorId: string,
    importData: ClientImportData
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const clientData of importData.clients) {
      try {
        // Check for duplicates if skipDuplicates is enabled
        if (importData.options.skipDuplicates) {
          const { data: existingClient } = await supabase
            .from('contractor_clients')
            .select('id')
            .eq('contractor_id', contractorId)
            .eq('email', clientData.email)
            .single();

          if (existingClient) {
            results.skipped++;
            continue;
          }
        }

        // Create client
        await this.createClient({
          ...clientData,
          contractorId,
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import client ${clientData.email}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Export clients data
   */
  async exportClients(
    contractorId: string,
    options: ClientExportOptions
  ): Promise<string> {
    const { data: clients, error } = await supabase
      .from('contractor_clients')
      .select('*')
      .eq('contractor_id', contractorId);

    if (error) throw error;

    // Apply filters if provided
    let filteredClients = clients || [];
    if (options.filters) {
      // Apply the same filtering logic as getClients
      // This would be implemented based on the specific filter requirements
    }

    // Format data based on export options
    const exportData = filteredClients.map(client => {
      const baseData = {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
        companyName: client.company_name,
        status: client.status,
        priority: client.priority,
        source: client.source,
        tags: client.tags.join(', '),
        notes: client.notes,
        createdAt: client.created_at,
      };

      if (options.includeProperties) {
        baseData.properties = client.properties;
      }

      if (options.includeFinancials) {
        baseData.financials = client.financials;
      }

      if (options.includeInteractions) {
        // This would require a separate query to get interactions
        baseData.interactions = [];
      }

      return baseData;
    });

    // Convert to requested format
    switch (options.format) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'xlsx':
        return this.convertToXLSX(exportData);
      case 'json':
        return JSON.stringify(exportData, null, 2);
      default:
        throw new Error('Unsupported export format');
    }
  }

  /**
   * Get follow-up tasks for clients
   */
  async getFollowUpTasks(contractorId: string): Promise<ClientFollowUpTask[]> {
    const { data, error } = await supabase
      .from('client_follow_up_tasks')
      .select(`
        *,
        contractor_clients!inner(contractor_id)
      `)
      .eq('contractor_clients.contractor_id', contractorId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create follow-up task
   */
  async createFollowUpTask(
    clientId: string,
    taskData: {
      type: 'call' | 'email' | 'meeting' | 'quote' | 'check_in';
      title: string;
      description: string;
      dueDate: string;
      priority: 'low' | 'medium' | 'high';
    }
  ): Promise<ClientFollowUpTask> {
    const { data, error } = await supabase
      .from('client_follow_up_tasks')
      .insert({
        client_id: clientId,
        type: taskData.type,
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate,
        priority: taskData.priority,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Complete follow-up task
   */
  async completeFollowUpTask(
    taskId: string,
    notes?: string
  ): Promise<ClientFollowUpTask> {
    const { data, error } = await supabase
      .from('client_follow_up_tasks')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
        notes: notes,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to XLSX format (simplified - would use a proper library in production)
   */
  private convertToXLSX(data: any[]): string {
    // This is a simplified implementation
    // In production, you would use a library like 'xlsx' or 'exceljs'
    return JSON.stringify(data, null, 2);
  }
}
