import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ✅ TYPE SAFETY: Proper interfaces for database records
interface JobRecord {
    id: string;
    title: string;
    category: string;
    status: string;
    updated_at: string;
    city: string;
    homeowner_id: string;
    contractor_id?: string;
}

interface BidRecord {
    job_id: string;
    created_at: string;
}

interface UserRecord {
    id: string;
    first_name: string;
    last_name: string;
    city?: string;
}

/**
 * Public API endpoint to fetch live activity feed for the landing page
 * Returns recent job activities: completed jobs, hired contractors, quotes received
 */
export async function GET() {
    try {
        const now = new Date();
        // Try multiple time windows: 1 hour, 24 hours, 7 days
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch recent completed jobs - try 1 hour, then 24 hours, then 7 days
        let completedJobs: JobRecord[] | null = null;
        let timeWindow = oneHourAgo;
        
        for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
            const { data, error } = await serverSupabase
                .from('jobs')
                .select(`
                    id,
                    title,
                    category,
                    status,
                    updated_at,
                    city,
                    homeowner_id
                `)
                .eq('status', 'completed')
                .gte('updated_at', window.toISOString())
                .order('updated_at', { ascending: false })
                .limit(10);
            
            if (!error && data && data.length > 0) {
                completedJobs = data as JobRecord[];
                timeWindow = window;
                break;
            }
        }

        // Fetch recently assigned jobs (hired) - try same windows
        let hiredJobs: JobRecord[] | null = null;
        for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
            const { data, error } = await serverSupabase
                .from('jobs')
                .select(`
                    id,
                    title,
                    category,
                    status,
                    updated_at,
                    city,
                    homeowner_id,
                    contractor_id
                `)
                .eq('status', 'assigned')
                .gte('updated_at', window.toISOString())
                .order('updated_at', { ascending: false })
                .limit(10);
            
            if (!error && data && data.length > 0) {
                hiredJobs = data as JobRecord[];
                break;
            }
        }

        // Fetch jobs with multiple bids (quotes received) - try same windows
        let jobsWithBids: BidRecord[] | null = null;
        for (const window of [oneHourAgo, oneDayAgo, sevenDaysAgo]) {
            const { data, error } = await serverSupabase
                .from('bids')
                .select(`
                    job_id,
                    created_at
                `)
                .gte('created_at', window.toISOString())
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (!error && data && data.length > 0) {
                jobsWithBids = data as BidRecord[];
                break;
            }
        }

        // Fetch homeowner and contractor information separately
        const homeownerIds = new Set<string>();
        const contractorIds = new Set<string>();
        const jobIds = new Set<string>();

        completedJobs?.forEach((job: JobRecord) => {
            if (job.homeowner_id) homeownerIds.add(job.homeowner_id);
            if (job.id) jobIds.add(job.id);
        });

        hiredJobs?.forEach((job: JobRecord) => {
            if (job.homeowner_id) homeownerIds.add(job.homeowner_id);
            if (job.contractor_id) contractorIds.add(job.contractor_id);
            if (job.id) jobIds.add(job.id);
        });

        jobsWithBids?.forEach((bid: BidRecord) => {
            if (bid.job_id) jobIds.add(bid.job_id);
        });

        // Fetch user information
        const allUserIds = [...homeownerIds, ...contractorIds];
        const { data: users } = allUserIds.length > 0 ? await serverSupabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', allUserIds) : { data: [] };

        const userMap = new Map((users || []).map((u: UserRecord) => [u.id, u]));

        // Fetch job information for bids
        const { data: bidJobs } = jobIds.size > 0 ? await serverSupabase
            .from('jobs')
            .select('id, title, category, city, homeowner_id')
            .in('id', Array.from(jobIds)) : { data: [] };

        const jobMap = new Map((bidJobs || []).map((j: Pick<JobRecord, 'id' | 'title' | 'category' | 'city' | 'homeowner_id'>) => [j.id, j as JobRecord]));

        // Group bids by job_id to count quotes
        const quotesByJob = new Map<string, number>();
        jobsWithBids?.forEach((bid: BidRecord) => {
            const jobId = bid.job_id;
            quotesByJob.set(jobId, (quotesByJob.get(jobId) || 0) + 1);
        });

        // Build activities array
        const activities: Array<{
            name: string;
            action: string;
            location: string;
            time: string;
            timestamp: Date;
        }> = [];

        // Add completed jobs
        completedJobs?.forEach((job: JobRecord) => {
            const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
            const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
            const firstName = name.split(' ')[0];
            const location = job.city || 'UK';
            const category = job.category || 'project';
            
            activities.push({
                name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''),
                action: `completed a ${category}`,
                location: location,
                time: formatTimeAgo(new Date(job.updated_at)),
                timestamp: new Date(job.updated_at),
            });
        });

        // Add hired jobs
        hiredJobs?.forEach((job: JobRecord) => {
            const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
            const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
            const firstName = name.split(' ')[0];
            const location = job.city || 'UK';
            const category = job.category || 'contractor';
            
            // Determine contractor type from category
            const contractorType = getContractorType(category);
            
            activities.push({
                name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''),
                action: `hired a ${contractorType}`,
                location: location,
                time: formatTimeAgo(new Date(job.updated_at)),
                timestamp: new Date(job.updated_at),
            });
        });

        // Add quotes received (only jobs with 3+ quotes)
        jobsWithBids?.forEach((bid: BidRecord) => {
            const job = jobMap.get(bid.job_id) as JobRecord | undefined;
            if (!job) return;
            
            const quoteCount = quotesByJob.get(job.id) || 0;
            if (quoteCount < 3) return; // Only show if 3+ quotes

            const homeowner = userMap.get(job.homeowner_id) as UserRecord | undefined;
            const name = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || 'Someone';
            const firstName = name.split(' ')[0];
            const location = job.city || 'UK';
            
            activities.push({
                name: firstName + (name.includes(' ') ? ' ' + name.split(' ')[1].charAt(0) + '.' : ''),
                action: `received ${quoteCount} quotes`,
                location: location,
                time: formatTimeAgo(new Date(bid.created_at)),
                timestamp: new Date(bid.created_at),
            });
        });

        // Sort by timestamp (most recent first) and limit to 20
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const recentActivities = activities.slice(0, 20);

        // Calculate active users count (users who have activity in last hour)
        const activeUserIds = new Set<string>();
        completedJobs?.forEach((job: JobRecord) => {
            if (job.homeowner_id) activeUserIds.add(job.homeowner_id);
        });
        hiredJobs?.forEach((job: JobRecord) => {
            if (job.homeowner_id) activeUserIds.add(job.homeowner_id);
            if (job.contractor_id) activeUserIds.add(job.contractor_id);
        });
        jobsWithBids?.forEach((bid: BidRecord) => {
            const job = jobMap.get(bid.job_id) as JobRecord | undefined;
            if (job?.homeowner_id) activeUserIds.add(job.homeowner_id);
        });

        // Calculate active users count - expand to 24 hours for more realistic count
        const activeUserIds24h = new Set<string>();
        const oneDayAgoForCount = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Get all jobs from last 24 hours for active user count
        const { data: recentJobs24h } = await serverSupabase
            .from('jobs')
            .select('homeowner_id, contractor_id')
            .gte('updated_at', oneDayAgoForCount.toISOString())
            .limit(100);
        
        recentJobs24h?.forEach((job: Pick<JobRecord, 'homeowner_id' | 'contractor_id'>) => {
            if (job.homeowner_id) activeUserIds24h.add(job.homeowner_id);
            if (job.contractor_id) activeUserIds24h.add(job.contractor_id);
        });

        const activeUserCount = activeUserIds24h.size > 0 ? activeUserIds24h.size : 0;

        return NextResponse.json({
            activities: recentActivities,
            activeUserCount,
            hasRealData: recentActivities.length > 0,
        });

    } catch (error) {
        logger.error('Activity feed API error', error, {
            service: 'activity-feed-api',
        });
        
        // Return empty array for graceful degradation
        return NextResponse.json({
            activities: [],
            activeUserCount: 0,
            hasRealData: false,
        });
    }
}

/**
 * Format timestamp as "X min ago" or "X hours ago"
 */
function formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Get contractor type from job category
 */
function getContractorType(category: string): string {
    const categoryMap: Record<string, string> = {
        'plumbing': 'plumber',
        'electrical': 'electrician',
        'painting': 'painter',
        'carpentry': 'carpenter',
        'roofing': 'roofer',
        'hvac': 'HVAC technician',
        'landscaping': 'landscaper',
        'kitchen': 'kitchen specialist',
        'bathroom': 'bathroom specialist',
    };
    
    const normalized = category.toLowerCase();
    return categoryMap[normalized] || 'contractor';
}

