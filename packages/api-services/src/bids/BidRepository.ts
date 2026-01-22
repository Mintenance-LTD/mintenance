import { SupabaseClient } from '@supabase/supabase-js';
import { BidRecord, BidStatus, BidListParams } from './types';
import { logger } from '@mintenance/shared';

export class BidRepository {
  private readonly bidFields = `
    *,
    contractor:contractor_id(id, first_name, last_name, avatar_url, rating),
    job:job_id(id, title, status, homeowner_id)
  `;

  constructor(private supabase: SupabaseClient) { }

  async getJob(jobId: string) {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('id, status, homeowner_id, required_licenses, latitude, longitude')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getContractorBidForJob(jobId: string, contractorId: string): Promise<BidRecord | null> {
    const { data, error } = await this.supabase
      .from('bids')
      .select('*')
      .eq('job_id', jobId)
      .eq('contractor_id', contractorId)
      .maybeSingle();

    if (error) throw error;
    return data as BidRecord;
  }

  async createBid(data: any): Promise<BidRecord> {
    const { data: bid, error } = await this.supabase
      .from('bids')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return bid as BidRecord;
  }

  async getBidById(bidId: string): Promise<BidRecord | null> {
    const { data, error } = await this.supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .maybeSingle();

    if (error) throw error;
    return data as BidRecord;
  }

  async updateBid(bidId: string, data: any): Promise<BidRecord> {
    const { data: bid, error } = await this.supabase
      .from('bids')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', bidId)
      .select()
      .single();

    if (error) throw error;
    return bid as BidRecord;
  }

  async updateBidStatus(bidId: string, status: BidStatus, reason?: string): Promise<BidRecord> {
    const { data, error } = await this.supabase
      .from('bids')
      .update({
        status,
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', bidId)
      .select()
      .single();

    if (error) throw error;
    return data as BidRecord;
  }

  buildBidsQuery(params: {
    contractorId?: string;
    jobId?: string;
    status?: string;
    limit: number;
    offset: number;
    includeContractorDetails?: boolean;
  }) {
    let query = this.supabase
      .from('bids')
      .select(params.includeContractorDetails ? this.bidFields : '*', { count: 'exact' });

    if (params.contractorId) query = query.eq('contractor_id', params.contractorId);
    if (params.jobId) query = query.eq('job_id', params.jobId);
    if (params.status) query = query.eq('status', params.status);

    return query
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);
  }

  async incrementJobBidCount(jobId: string) {
    await this.supabase.rpc('increment_job_bid_count', { p_job_id: jobId });
  }

  async decrementJobBidCount(jobId: string) {
    await this.supabase.rpc('decrement_job_bid_count', { p_job_id: jobId });
  }

  async getContractor(contractorId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, is_verified, rating')
      .eq('id', contractorId)
      .single();

    if (error) throw error;
    return data;
  }

  async checkContractorLicenses(contractorId: string, licenses: string[]) {
    // This would typically join with a licenses table
    const { data, error } = await this.supabase
      .from('contractor_licenses')
      .select('license_type')
      .eq('contractor_id', contractorId)
      .in('license_type', licenses);

    if (error) return false;
    return data.length >= licenses.length;
  }

  async checkContractorServiceArea(contractorId: string, lat: number, lng: number) {
    // Simple mock for now - in production this would use PostGIS or a service
    return true;
  }

  async createItemizedQuote(bidId: string, items: any[]) {
    const { error } = await this.supabase
      .from('bid_itemized_quotes')
      .insert(items.map(item => ({ ...item, bid_id: bidId })));
    if (error) throw error;
  }

  async createBidAttachments(bidId: string, urls: string[]) {
    const { error } = await this.supabase
      .from('bid_attachments')
      .insert(urls.map(url => ({ url, bid_id: bidId })));
    if (error) throw error;
  }

  async getItemizedQuote(bidId: string) {
    const { data, error } = await this.supabase
      .from('bid_itemized_quotes')
      .select('*')
      .eq('bid_id', bidId);
    if (error) throw error;
    return data || [];
  }

  async getBidAttachments(bidId: string) {
    const { data, error } = await this.supabase
      .from('bid_attachments')
      .select('url')
      .eq('bid_id', bidId);
    if (error) throw error;
    return data?.map(d => d.url) || [];
  }

  async getBidWithJob(bidId: string) {
    const { data, error } = await this.supabase
      .from('bids')
      .select(`
        *,
        job:job_id(id, title, status, homeowner_id)
      `)
      .eq('id', bidId)
      .single();

    if (error) throw error;
    return data;
  }

  async getContractByBidId(bidId: string) {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('bid_id', bidId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateJobStatus(jobId: string, status: string, contractorId?: string) {
    const { error } = await this.supabase
      .from('jobs')
      .update({ status, contractor_id: contractorId })
      .eq('id', jobId);
    if (error) throw error;
  }

  async rejectOtherBids(jobId: string, acceptedBidId: string) {
    const { error } = await this.supabase
      .from('bids')
      .update({ status: 'rejected', rejection_reason: 'Job awarded to another contractor' })
      .eq('job_id', jobId)
      .neq('id', acceptedBidId)
      .eq('status', 'pending');
    if (error) throw error;
  }

  async updateItemizedQuote(bidId: string, items: any[]) {
    // Simple approach: delete and re-insert
    await this.supabase.from('bid_itemized_quotes').delete().eq('bid_id', bidId);
    await this.createItemizedQuote(bidId, items);
  }

  async isPhoneVerified(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', userId)
      .single();
    return !error && data?.phone_verified;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    return !error && !!data;
  }
}
