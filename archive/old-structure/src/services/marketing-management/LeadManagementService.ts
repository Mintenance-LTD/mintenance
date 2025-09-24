/**
 * LeadManagementService
 * 
 * Handles lead management functionality including creation, tracking, and conversion.
 */

import { supabase } from '../../config/supabase';
import { Lead, LeadSearchParams } from './types';

export class LeadManagementService {
  async createLead(leadData: {
    contractorId: string;
    campaignId?: string;
    source: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    serviceInterest: string[];
    urgency: 'low' | 'medium' | 'high';
    notes?: string;
  }): Promise<Lead> {
    const { data, error } = await supabase
      .from('marketing_leads')
      .insert({
        contractor_id: leadData.contractorId,
        campaign_id: leadData.campaignId,
        source: leadData.source,
        first_name: leadData.firstName,
        last_name: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone,
        service_interest: leadData.serviceInterest,
        urgency: leadData.urgency,
        status: 'new',
        score: this.calculateLeadScore(leadData),
        notes: leadData.notes || '',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLeads(
    contractorId: string,
    params?: LeadSearchParams
  ): Promise<{ leads: Lead[]; total: number }> {
    let query = supabase
      .from('marketing_leads')
      .select('*', { count: 'exact' })
      .eq('contractor_id', contractorId);

    if (params?.status?.length) {
      query = query.in('status', params.status);
    }

    if (params?.source?.length) {
      query = query.in('source', params.source);
    }

    if (params?.urgency?.length) {
      query = query.in('urgency', params.urgency);
    }

    if (params?.assignedTo?.length) {
      query = query.in('assigned_to', params.assignedTo);
    }

    if (params?.scoreRange) {
      query = query
        .gte('score', params.scoreRange.min)
        .lte('score', params.scoreRange.max);
    }

    if (params?.dateRange) {
      query = query
        .gte('created_at', params.dateRange.start)
        .lte('created_at', params.dateRange.end);
    }

    if (params?.query) {
      query = query.or(`first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,email.ilike.%${params.query}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      leads: data || [],
      total: count || 0,
    };
  }

  async updateLeadStatus(
    leadId: string,
    status: Lead['status'],
    notes?: string
  ): Promise<Lead> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'contacted') {
      updateData.last_contact_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('marketing_leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private calculateLeadScore(leadData: any): number {
    let score = 0;

    // Base score
    score += 10;

    // Email provided
    if (leadData.email) score += 10;

    // Phone provided
    if (leadData.phone) score += 15;

    // Service interest
    score += leadData.serviceInterest.length * 5;

    // Urgency
    switch (leadData.urgency) {
      case 'high':
        score += 20;
        break;
      case 'medium':
        score += 10;
        break;
      case 'low':
        score += 5;
        break;
    }

    // Company provided
    if (leadData.company) score += 10;

    return Math.min(score, 100);
  }
}
