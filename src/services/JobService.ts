import { supabase } from '../config/supabase';
import { Job, Bid } from '../types';
import { sanitizeText } from '../utils/sanitize';

export class JobService {
  // Job management
  static async createJob(jobData: {
    title: string;
    description: string;
    location: string;
    budget: number;
    homeownerId: string;
    category?: string;
    subcategory?: string;
    priority?: 'low' | 'medium' | 'high';
    photos?: string[];
  }): Promise<Job> {
    // Basic input sanitization
    const safeTitle = sanitizeText(jobData.title).trim();
    const safeDescription = sanitizeText(jobData.description).trim();
    const safeLocation = sanitizeText(jobData.location).trim();

    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        title: safeTitle,
        description: safeDescription,
        location: safeLocation,
        budget: jobData.budget,
        homeowner_id: jobData.homeownerId,
        category: jobData.category,
        subcategory: jobData.subcategory,
        priority: jobData.priority,
        photos: jobData.photos,
        status: 'posted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return this.formatJob(data);
  }

  static async getJobsByHomeowner(homeownerId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('homeowner_id', homeownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatJob);
  }

  static async getUserJobs(userId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('homeowner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatJob);
  }

  static async getAvailableJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'posted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatJob);
  }

  static async getJobById(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this.formatJob(data);
  }

  static async updateJobStatus(jobId: string, status: Job['status'], contractorId?: string): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (contractorId) {
      updateData.contractor_id = contractorId;
    }

    const { error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) throw error;
  }

  static async startJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  static async completeJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  static async getJobsByStatus(status: Job['status'], userId?: string): Promise<Job[]> {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', status);

    if (userId) {
      query = query.or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatJob);
  }

  // Bidding system
  static async submitBid(bidData: {
    jobId: string;
    contractorId: string;
    amount: number;
    description: string;
  }): Promise<Bid> {
    const { data, error } = await supabase
      .from('bids')
      .insert([{
        job_id: bidData.jobId,
        contractor_id: bidData.contractorId,
        amount: bidData.amount,
        description: bidData.description,
        status: 'pending',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return this.formatBid(data);
  }

  static async getBidsByJob(jobId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        contractor:users(first_name, last_name, email)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatBid);
  }

  static async getBidsByContractor(contractorId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        job:jobs(title, description, location, budget)
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.formatBid);
  }

  static async acceptBid(bidId: string): Promise<void> {
    // Start transaction
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('job_id, contractor_id')
      .eq('id', bidId)
      .single();

    if (bidError) throw bidError;

    // Accept the bid
    const { error: updateBidError } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (updateBidError) throw updateBidError;

    // Update job status and assign contractor
    const { error: updateJobError } = await supabase
      .from('jobs')
      .update({
        status: 'assigned',
        contractor_id: bid.contractor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bid.job_id);

    if (updateJobError) throw updateJobError;

    // Reject other bids
    const { error: rejectBidsError } = await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', bid.job_id)
      .neq('id', bidId);

    if (rejectBidsError) throw rejectBidsError;
  }

  // Generic job retrieval with pagination
  static async getJobs(limit: number = 20, offset: number = 0): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data.map(this.formatJob);
  }

  // Search jobs by title, description, location, or category
  static async searchJobs(query: string, limit: number = 20): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('status', 'posted')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(this.formatJob);
  }

  // Get single job (alias for getJobById for consistency)
  static async getJob(jobId: string): Promise<Job | null> {
    return this.getJobById(jobId);
  }

  // Helper methods
  private static formatJob(data: any): Job {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      location: data.location,
      homeowner_id: data.homeowner_id,
      contractor_id: data.contractor_id,
      status: data.status,
      budget: data.budget,
      category: data.category,
      subcategory: data.subcategory,
      priority: data.priority,
      photos: data.photos,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Computed fields for backward compatibility
      homeownerId: data.homeowner_id,
      contractorId: data.contractor_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static formatBid(data: any): Bid {
    return {
      id: data.id,
      jobId: data.job_id,
      contractorId: data.contractor_id,
      amount: data.amount,
      description: data.description,
      createdAt: data.created_at,
      status: data.status,
      ...(data.contractor && {
        contractorName: `${data.contractor.first_name} ${data.contractor.last_name}`,
        contractorEmail: data.contractor.email,
      }),
      ...(data.job && {
        jobTitle: data.job.title,
        jobDescription: data.job.description,
        jobLocation: data.job.location,
        jobBudget: data.job.budget,
      }),
    };
  }
}
