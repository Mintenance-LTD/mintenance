import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { sanitizeIlikePattern } from '@/lib/utils/sanitize-postgrest';
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
  // Postgres NUMERIC columns. supabase-js serialises NUMERIC as strings
  // to preserve precision, so the row may carry either type — `toNum`
  // below normalises before we leak it to API consumers (mobile
  // JobsScreen sums these for the "AVG VALUE" KPI; a string would
  // produce NaN via the `+=` operator).
  budget?: number | string | null;
  budget_min?: number | string | null;
  budget_max?: number | string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  created_at: string;
  updated_at: string;
  homeowner?: UserData;
  contractor?: UserData | null;
  bids?: Array<{ count: number }>;
  building_assessments?: AIAssessmentData[] | null;
};

// Coerce a Postgres-NUMERIC-as-string into a real JS number, or null
// if it doesn't parse cleanly. Keeps the `typeof === 'number'` checks
// downstream honest.
const toNum = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
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
  budget_min,
  budget_max,
  location,
  latitude,
  longitude,
  created_at,
  updated_at,
  homeowner:profiles!homeowner_id(id,first_name,last_name,email,profile_image_url),
  contractor:profiles!contractor_id(id,first_name,last_name,email),
  bids(count)
`
  .replace(/\s+/g, ' ')
  .trim();

const mapRowToJobSummary = (
  row: JobRow
): JobSummary & {
  homeownerName?: string;
  contractorName?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  homeowner_id?: string;
  contractor_id?: string;
  category?: string;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  bidCount?: number;
} => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  homeowner_id: row.homeowner_id,
  contractor_id: row.contractor_id ?? undefined,
  homeownerName: row.homeowner
    ? `${row.homeowner.first_name} ${row.homeowner.last_name}`
    : undefined,
  contractorName: row.contractor
    ? `${row.contractor.first_name} ${row.contractor.last_name}`
    : undefined,
  category: row.category ?? undefined,
  budget: toNum(row.budget),
  budget_min: toNum(row.budget_min),
  budget_max: toNum(row.budget_max),
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
  propertyId?: string;
  search?: string;
  category?: string;
  minBudget?: number;
  maxBudget?: number;
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
    items: (JobSummary & {
      photos?: string[];
      view_count?: number;
      ai_assessment?: AIAssessmentData | null;
    })[];
    nextCursor?: string;
  }> {
    const query = this.buildJobQuery(
      user,
      params.status,
      params.propertyId,
      params.search,
      params.category,
      params.minBudget,
      params.maxBudget
    );
    const { rows, nextCursor } = await this.fetchJobs(
      query,
      params.limit,
      params.cursor
    );

    const jobIds = rows.map((row) => row.id);
    const [
      attachmentsByJobId,
      viewCountsByJobId,
      assessmentsByJobId,
      metadataPhotosByJobId,
    ] = await Promise.all([
      this.fetchAttachments(jobIds),
      this.fetchViewCounts(jobIds),
      this.fetchAssessments(jobIds),
      this.fetchMetadataPhotos(jobIds),
    ]);

    // Build raw photos arrays per job, then re-sign every Job-storage
    // URL in one batch. Stale `public` URLs returned after the
    // 2026-04-17 bucket flip would otherwise render as gray thumbnails
    // on every list view that calls this service (web /jobs,
    // /contractor/jobs via /api/jobs, web/mobile JobService callers).
    // External CDN URLs pass through resignJobStorageUrls untouched.
    //
    // 2026-04-27 audit: production data showed most jobs have zero
    // job_attachments rows (homeowners skipped photos at creation time)
    // but completed jobs DO have job_photos_metadata rows from the
    // before/after lifecycle photos. Fall back to those so the homeowner
    // job list shows a real thumbnail instead of an empty card.
    const rawItems = rows.map((row) => {
      const jobAttachments = attachmentsByJobId.get(row.id) || [];
      const attachmentPhotos = jobAttachments
        .filter((att) => att.file_type === 'image')
        .map((att) => att.file_url);
      const metadataPhotos = metadataPhotosByJobId.get(row.id) || [];
      // Prefer creation-time attachments — that's the homeowner's
      // intent for the listing thumbnail. If none exist, surface
      // before/after photos so completed jobs aren't blank.
      const photos =
        attachmentPhotos.length > 0 ? attachmentPhotos : metadataPhotos;
      const viewCount = viewCountsByJobId.get(row.id) || 0;
      const jobSummary = mapRowToJobSummary(row);
      const aiAssessment = assessmentsByJobId.get(row.id) || null;
      return {
        jobSummary,
        photos,
        viewCount,
        aiAssessment,
      };
    });
    const allRawPhotos = rawItems.flatMap((i) => i.photos);
    const allSignedPhotos = await resignJobStorageUrls(allRawPhotos);
    // Re-chunk the flat signed array back per-item using the same
    // slice offsets we implicitly built when flattening.
    let offset = 0;
    const items = rawItems.map((i) => {
      const signed = allSignedPhotos.slice(offset, offset + i.photos.length);
      offset += i.photos.length;
      return {
        ...i.jobSummary,
        photos: signed.length > 0 ? signed : undefined,
        view_count: i.viewCount > 0 ? i.viewCount : undefined,
        ai_assessment: i.aiAssessment,
      };
    });

    logger.info('Jobs list retrieved', {
      service: 'jobs',
      userId: user.id,
      jobCount: items.length,
      hasMore: Boolean(nextCursor),
    });

    return { items, nextCursor };
  }

  private buildJobQuery(
    user: Pick<User, 'id' | 'role'>,
    status?: string[],
    propertyId?: string,
    search?: string,
    category?: string,
    minBudget?: number,
    maxBudget?: number
  ) {
    let query = serverSupabase.from('jobs').select(jobSelectFields);

    const isContractorViewingAvailableJobs =
      user.role === 'contractor' && status?.includes('posted');
    if (isContractorViewingAvailableJobs) {
      query = query.eq('status', 'posted').is('contractor_id', null);
    } else if (user.role === 'homeowner') {
      query = query.eq('homeowner_id', user.id);

      if (status?.length) {
        query = query.in('status', status);
      }
    } else {
      // contractor or admin: see jobs they own or are assigned to
      query = query.or(
        `homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`
      );

      if (status?.length) {
        query = query.in('status', status);
      }
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (search) {
      // Audit P2 (2026-04-23): the previous template literal interpolated
      // user-controlled `search` directly into the PostgREST OR-DSL string,
      // letting an attacker inject extra `.or()` clauses via a comma
      // (e.g. `foo,status.eq.cancelled`) to read jobs they shouldn't see,
      // or wildcard the whole table with `%%%`. Sanitize first; skip the
      // filter entirely if nothing usable survives.
      const safeSearch = sanitizeIlikePattern(search);
      if (safeSearch) {
        query = query.or(
          `title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
        );
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (minBudget !== undefined) {
      query = query.gte('budget', minBudget);
    }

    if (maxBudget !== undefined) {
      query = query.lte('budget', maxBudget);
    }

    return query;
  }

  private async fetchJobs(
    query: unknown,
    limit: number,
    cursor?: string
  ): Promise<{ rows: JobRow[]; nextCursor?: string }> {
    type QueryBuilder = {
      order: (
        column: string,
        options?: { ascending?: boolean }
      ) => QueryBuilder;
      limit: (count: number) => QueryBuilder;
      lt: (column: string, value: string) => QueryBuilder;
    };

    const queryBuilder = query as QueryBuilder;

    let pagedQuery = queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      pagedQuery = pagedQuery.lt('created_at', cursor);
    }

    const { data: jobsData, error } = await (pagedQuery as unknown as Promise<{
      data: JobRow[] | null;
      error: unknown;
    }>);
    if (error || !jobsData) {
      logger.error('Failed to load jobs', error, { service: 'jobs' });
      throw error || new Error('Failed to load jobs');
    }

    const rows = jobsData as unknown as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore
      ? (limitedRows[limitedRows.length - 1]?.created_at ?? undefined)
      : undefined;

    return { rows: limitedRows, nextCursor };
  }

  private async fetchAttachments(
    jobIds: string[]
  ): Promise<Map<string, JobAttachment[]>> {
    const attachmentsByJobId = new Map<string, JobAttachment[]>();
    if (jobIds.length === 0) {
      return attachmentsByJobId;
    }

    const { data } = await serverSupabase
      .from('job_attachments')
      .select('job_id, file_url, file_type')
      .in('job_id', jobIds)
      .eq('file_type', 'image');

    (data ?? []).forEach(
      (att: { job_id: string; file_url: string; file_type: string }) => {
        if (!attachmentsByJobId.has(att.job_id)) {
          attachmentsByJobId.set(att.job_id, []);
        }
        attachmentsByJobId.get(att.job_id)!.push({
          file_url: att.file_url,
          file_type: att.file_type,
        });
      }
    );

    return attachmentsByJobId;
  }

  /**
   * Pull lifecycle photos (before/after) for jobs that are missing
   * creation-time `job_attachments`. Sorted so that 'after' photos
   * lead — completed jobs benefit most from showing the finished state
   * as the thumbnail. Within each photo_type, newer wins so the most
   * recent upload becomes the lead image.
   */
  private async fetchMetadataPhotos(
    jobIds: string[]
  ): Promise<Map<string, string[]>> {
    const photosByJobId = new Map<string, string[]>();
    if (jobIds.length === 0) {
      return photosByJobId;
    }

    const { data, error } = await serverSupabase
      .from('job_photos_metadata')
      .select('job_id, photo_url, photo_type, created_at')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return photosByJobId;
    }

    type Row = {
      job_id: string;
      photo_url: string;
      photo_type: string | null;
      created_at: string;
    };
    const grouped = new Map<string, Row[]>();
    (data as Row[]).forEach((r) => {
      if (!grouped.has(r.job_id)) grouped.set(r.job_id, []);
      grouped.get(r.job_id)!.push(r);
    });

    grouped.forEach((rows, jobId) => {
      // 'after' photos lead so completed jobs show the finished work,
      // then 'before' photos. Anything else (rare lifecycle types) falls
      // through to the end.
      const order = (t: string | null): number =>
        t === 'after' ? 0 : t === 'before' ? 1 : 2;
      const sorted = [...rows].sort((a, b) => {
        const oa = order(a.photo_type);
        const ob = order(b.photo_type);
        if (oa !== ob) return oa - ob;
        return b.created_at.localeCompare(a.created_at);
      });
      photosByJobId.set(
        jobId,
        sorted.map((r) => r.photo_url)
      );
    });

    return photosByJobId;
  }

  private async fetchViewCounts(
    jobIds: string[]
  ): Promise<Map<string, number>> {
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

    viewCountsMap.forEach((count, job_id) =>
      viewCountsByJobId.set(job_id, count)
    );
    return viewCountsByJobId;
  }

  private async fetchAssessments(
    jobIds: string[]
  ): Promise<Map<string, AIAssessmentData>> {
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
        .select(
          'id, job_id, severity, damage_type, confidence, urgency, assessment_data, created_at'
        )
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      (data ?? []).forEach((assessment: AssessmentData) => {
        if (assessment.job_id && !assessmentsByJobId.has(assessment.job_id)) {
          assessmentsByJobId.set(assessment.job_id, {
            id: assessment.id,
            severity:
              (assessment.severity as 'early' | 'midway' | 'full') || 'midway',
            damage_type: assessment.damage_type || '',
            confidence: assessment.confidence || 0,
            urgency:
              (assessment.urgency as
                | 'immediate'
                | 'urgent'
                | 'soon'
                | 'planned'
                | 'monitor') || 'monitor',
            assessment_data: assessment.assessment_data,
            created_at: assessment.created_at,
          });
        }
      });
    } catch (error) {
      logger.debug(
        'Building assessments not available (migration may be pending)',
        { error }
      );
    }

    return assessmentsByJobId;
  }

  mapRowToJobDetail(row: JobRow): JobDetail {
    return mapRowToJobDetail(row);
  }
}
