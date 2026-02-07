import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { JobDetail, JobSummary, User } from '@mintenance/types';

interface AssessmentData {
  job_id?: string;
  id: string;
  severity?: string;
  damage_type?: string;
  confidence?: number;
  urgency?: string;
  assessment_data?: Record<string, unknown>;
  created_at: string;
}

type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string | null;
};

type JobAttachment = {
  file_url: string;
  file_type: string;
};

type AIAssessmentData = {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  assessment_data?: unknown;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
  homeowner?: UserData;
  contractor?: UserData | null;
  bids?: Array<{ count: number }>;
  building_assessments?: AIAssessmentData[] | null;
};

const jobSelectFields = `
  id,
  title,
  description,
  status,
  homeowner_id,
  contractor_id,
  category,
  budget,
  location,
  latitude,
  longitude,
  created_at,
  updated_at,
  homeowner:profiles!homeowner_id(id,first_name,last_name,email,profile_image_url),
  contractor:profiles!contractor_id(id,first_name,last_name,email),
  bids(count)
`.replace(/\s+/g, ' ').trim();

const mapRowToJobSummary = (row: JobRow): JobSummary & {
  homeownerName?: string;
  contractorName?: string;
  category?: string;
  budget?: number;
  location?: string;
  bidCount?: number;
} => ({
  id: row.id,
  title: row.title,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  homeownerName: row.homeowner ? `${row.homeowner.first_name} ${row.homeowner.last_name}` : undefined,
  contractorName: row.contractor ? `${row.contractor.first_name} ${row.contractor.last_name}` : undefined,
  category: row.category ?? undefined,
  budget: row.budget ?? undefined,
  location: row.location ?? undefined,
  bidCount: row.bids?.[0]?.count ?? 0,
});

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

interface JobListParams {
  limit: number;
  cursor?: string;
  status?: string[];
}

export class JobQueryService {
  private static instance: JobQueryService;
  private constructor() {}

  static getInstance(): JobQueryService {
    if (!JobQueryService.instance) {
      JobQueryService.instance = new JobQueryService();
    }
    return JobQueryService.instance;
  }

  async listJobs(
    user: Pick<User, 'id' | 'role'>,
    params: JobListParams
  ): Promise<{
    items: (JobSummary & { photos?: string[]; view_count?: number; ai_assessment?: AIAssessmentData | null })[];
    nextCursor?: string;
  }> {
    const query = this.buildJobQuery(user, params.status);
    const { rows, nextCursor } = await this.fetchJobs(query, params.limit, params.cursor);

    const jobIds = rows.map(row => row.id);
    const [attachmentsByJobId, viewCountsByJobId, assessmentsByJobId] = await Promise.all([
      this.fetchAttachments(jobIds),
      this.fetchViewCounts(jobIds),
      this.fetchAssessments(jobIds),
    ]);

    const items = rows.map(row => {
      const jobAttachments = attachmentsByJobId.get(row.id) || [];
      const photos = jobAttachments
        .filter(att => att.file_type === 'image')
        .map(att => att.file_url);
      const viewCount = viewCountsByJobId.get(row.id) || 0;
      const jobSummary = mapRowToJobSummary(row);
      const aiAssessment = assessmentsByJobId.get(row.id) || null;

      return {
        ...jobSummary,
        photos: photos.length > 0 ? photos : undefined,
        view_count: viewCount > 0 ? viewCount : undefined,
        ai_assessment: aiAssessment,
      };
    });

    logger.info('Jobs list retrieved', {
      service: 'jobs',
      userId: user.id,
      jobCount: items.length,
      hasMore: Boolean(nextCursor)
    });

    return { items, nextCursor };
  }

  private buildJobQuery(user: Pick<User, 'id' | 'role'>, status?: string[]) {
    let query = serverSupabase
      .from('jobs')
      .select(jobSelectFields);

    const isContractorViewingAvailableJobs = user.role === 'contractor' && status?.includes('posted');
    if (isContractorViewingAvailableJobs) {
      query = query
        .eq('status', 'posted')
        .is('contractor_id', null);
    } else {
      query = query
        .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);

      if (status?.length) {
        query = query.in('status', status);
      }
    }

    return query;
  }

  private async fetchJobs(
    query: ReturnType<typeof serverSupabase.from>,
    limit: number,
    cursor?: string
  ): Promise<{ rows: JobRow[]; nextCursor?: string }> {
    let pagedQuery = query
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      pagedQuery = pagedQuery.lt('created_at', cursor);
    }

    const { data: jobsData, error } = await pagedQuery;
    if (error || !jobsData) {
      logger.error('Failed to load jobs', error, { service: 'jobs' });
      throw error || new Error('Failed to load jobs');
    }

    const rows = jobsData as unknown as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore ? limitedRows[limitedRows.length - 1]?.created_at ?? undefined : undefined;

    return { rows: limitedRows, nextCursor };
  }

  private async fetchAttachments(jobIds: string[]): Promise<Map<string, JobAttachment[]>> {
    const attachmentsByJobId = new Map<string, JobAttachment[]>();
    if (jobIds.length === 0) {
      return attachmentsByJobId;
    }

    const { data } = await serverSupabase
      .from('job_attachments')
      .select('job_id, file_url, file_type')
      .in('job_id', jobIds)
      .eq('file_type', 'image');

    (data ?? []).forEach((att: { job_id: string; file_url: string; file_type: string }) => {
      if (!attachmentsByJobId.has(att.job_id)) {
        attachmentsByJobId.set(att.job_id, []);
      }
      attachmentsByJobId.get(att.job_id)!.push({
        file_url: att.file_url,
        file_type: att.file_type,
      });
    });

    return attachmentsByJobId;
  }

  private async fetchViewCounts(jobIds: string[]): Promise<Map<string, number>> {
    const viewCountsByJobId = new Map<string, number>();
    if (jobIds.length === 0) {
      return viewCountsByJobId;
    }

    const { data } = await serverSupabase
      .from('job_views')
      .select('job_id')
      .in('job_id', jobIds);

    const viewCountsMap = new Map<string, number>();
    (data ?? []).forEach((view: { job_id: string }) => {
      viewCountsMap.set(view.job_id, (viewCountsMap.get(view.job_id) || 0) + 1);
    });

    viewCountsMap.forEach((count, job_id) => viewCountsByJobId.set(job_id, count));
    return viewCountsByJobId;
  }

  private async fetchAssessments(jobIds: string[]): Promise<Map<string, AIAssessmentData>> {
    const assessmentsByJobId = new Map<string, AIAssessmentData>();
    if (jobIds.length === 0) {
      return assessmentsByJobId;
    }

    try {
      const { data: columnCheck } = await serverSupabase
        .from('building_assessments')
        .select('job_id')
        .limit(0);

      if (columnCheck === null) {
        return assessmentsByJobId;
      }

      const { data } = await serverSupabase
        .from('building_assessments')
        .select('id, job_id, severity, damage_type, confidence, urgency, assessment_data, created_at')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      (data ?? []).forEach((assessment: AssessmentData) => {
        if (assessment.job_id && !assessmentsByJobId.has(assessment.job_id)) {
          assessmentsByJobId.set(assessment.job_id, {
            id: assessment.id,
            severity: (assessment.severity as 'early' | 'midway' | 'full') || 'midway',
            damage_type: assessment.damage_type || '',
            confidence: assessment.confidence || 0,
            urgency: (assessment.urgency as 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor') || 'monitor',
            assessment_data: assessment.assessment_data,
            created_at: assessment.created_at,
          });
        }
      });
    } catch (error) {
      logger.debug('Building assessments not available (migration may be pending)', { error });
    }

    return assessmentsByJobId;
  }

  mapRowToJobDetail(row: JobRow): JobDetail {
    return mapRowToJobDetail(row);
  }
}
