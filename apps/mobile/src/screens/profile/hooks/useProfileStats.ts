import { useState, useEffect } from 'react';
import { JobService } from '../../../services/JobService';
import { UserService } from '../../../services/UserService';
import { Job } from '@mintenance/types';
import { logger } from '../../../utils/logger';

interface UserStats {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  rating: number;
  responseTime: string;
  joinDate: string;
}

interface AuthUser {
  id: string;
  role: string;
  createdAt?: string;
}

const DEFAULT_STATS: UserStats = {
  totalJobs: 0,
  completedJobs: 0,
  activeJobs: 0,
  rating: 0,
  responseTime: 'N/A',
  joinDate: '',
};

export function useProfileStats(user: AuthUser | null) {
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const joinDate = new Date(user.createdAt || Date.now()).toLocaleDateString(
          'en-US',
          { year: 'numeric', month: 'long' }
        );

        if (user.role === 'contractor') {
          const stats = await UserService.getContractorStats(user.id);
          setUserStats({
            totalJobs: stats.totalJobs || stats.totalJobsCompleted || 0,
            completedJobs: stats.completedJobs || 0,
            activeJobs: stats.activeJobs || 0,
            rating: stats.rating || 0,
            responseTime: stats.responseTime || 'N/A',
            joinDate,
          });
        } else {
          const jobs: Job[] = await JobService.getJobsByHomeowner(user.id);
          setUserStats({
            totalJobs: jobs.length,
            completedJobs: jobs.filter((job) => job.status === 'completed').length,
            activeJobs: jobs.filter(
              (job) => job.status === 'in_progress' || job.status === 'assigned'
            ).length,
            rating: 0,
            responseTime: 'N/A',
            joinDate,
          });
        }
      } catch (error) {
        logger.error('Failed to load user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  return { userStats, loading };
}
