import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import type { AgentResult, AgentContext } from './types';

interface WeatherData {
  condition: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
}

/**
 * Agent for intelligent job scheduling and weather-based auto-rescheduling
 */
export class SchedulingAgent {
  /**
   * Suggest optimal time slots for a job
   */
  static async suggestOptimalSchedule(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Get job details
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select(
          'id, status, contractor_id, homeowner_id, scheduled_start_date, category, location'
        )
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for schedule suggestion', {
          service: 'SchedulingAgent',
          jobId,
          error: error?.message,
        });
        return null;
      }

      // Only suggest for assigned jobs
      if (job.status !== 'assigned') {
        return null;
      }

      // Get contractor performance by time/day
      const contractorPerformance = await this.getContractorPerformanceByTime(
        job.contractor_id || ''
      );

      // Get weather forecast if outdoor job
      const isOutdoorJob = this.isOutdoorJob(job.category || '');
      let weatherData: WeatherData | null = null;
      if (isOutdoorJob && job.location) {
        weatherData = await this.getWeatherForecast(job.location);
      }

      // Suggest optimal time slots
      const suggestions = this.calculateOptimalSlots(
        contractorPerformance,
        weatherData,
        job.scheduled_start_date ? new Date(job.scheduled_start_date) : null
      );

      if (suggestions.length === 0) {
        return null;
      }

      // Log the suggestion
      const decision = {
        jobId,
        userId: job.homeowner_id,
        agentName: 'scheduling' as const,
        decisionType: 'schedule-suggestion' as const,
        actionTaken: 'schedule-suggested' as const,
        confidence: 70,
        reasoning: `Suggested ${suggestions.length} optimal time slot(s) based on contractor performance${weatherData ? ' and weather forecast' : ''}`,
        metadata: {
          suggestions,
          contractorPerformance,
          weatherData,
        },
      };

      await AgentLogger.logDecision(decision);

      return {
        success: true,
        decision,
        metadata: {
          suggestions,
        },
      };
    } catch (error) {
      logger.error('Error suggesting optimal schedule', error, {
        service: 'SchedulingAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Auto-reschedule outdoor jobs based on weather
   */
  static async evaluateWeatherReschedule(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Get job details
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select(
          'id, status, contractor_id, homeowner_id, scheduled_start_date, category, location'
        )
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for weather reschedule evaluation', {
          service: 'SchedulingAgent',
          jobId,
          error: error?.message,
        });
        return null;
      }

      // Only evaluate assigned jobs with scheduled dates
      if (job.status !== 'assigned' || !job.scheduled_start_date) {
        return null;
      }

      // Check if user has auto-reschedule enabled
      const autoRescheduleEnabled = await AutomationPreferencesService.isEnabled(
        job.homeowner_id,
        'autoRescheduleWeather'
      );

      if (!autoRescheduleEnabled) {
        return null;
      }

      // Check if job is outdoor
      if (!this.isOutdoorJob(job.category || '')) {
        return null;
      }

      // Get weather forecast
      if (!job.location) {
        return null;
      }

      const weatherData = await this.getWeatherForecast(job.location);
      if (!weatherData) {
        return null;
      }

      const scheduledDate = new Date(job.scheduled_start_date);
      const isBadWeather = this.isBadWeatherForJob(weatherData, job.category || '');

      if (isBadWeather) {
        // Find next good weather day
        const nextGoodDay = await this.findNextGoodWeatherDay(
          job.location,
          scheduledDate,
          job.category || ''
        );

        if (nextGoodDay) {
          // Update job schedule
          const { error: updateError } = await serverSupabase
            .from('jobs')
            .update({
              scheduled_start_date: nextGoodDay.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          if (updateError) {
            logger.error('Failed to reschedule job', {
              service: 'SchedulingAgent',
              jobId,
              error: updateError.message,
            });
            return null;
          }

          // Notify both parties
          await serverSupabase.from('notifications').insert([
            {
              user_id: job.homeowner_id,
              title: 'Job Rescheduled Due to Weather',
              message: `Your job has been automatically rescheduled due to poor weather conditions.`,
              type: 'job_rescheduled',
              read: false,
              action_url: `/jobs/${jobId}`,
              created_at: new Date().toISOString(),
            },
            {
              user_id: job.contractor_id,
              title: 'Job Rescheduled Due to Weather',
              message: `A job has been automatically rescheduled due to poor weather conditions.`,
              type: 'job_rescheduled',
              read: false,
              action_url: `/contractor/jobs/${jobId}`,
              created_at: new Date().toISOString(),
            },
          ]);

          // Log the decision
          const decision = {
            jobId,
            userId: job.homeowner_id,
            agentName: 'scheduling' as const,
            decisionType: 'schedule-suggestion' as const,
            actionTaken: 'schedule-suggested' as const,
            confidence: 80,
            reasoning: `Auto-rescheduled due to bad weather: ${weatherData.condition}`,
            metadata: {
              originalDate: job.scheduled_start_date,
              newDate: nextGoodDay.toISOString(),
              weatherData,
            },
          };

          await AgentLogger.logDecision(decision);

          return {
            success: true,
            decision,
            metadata: {
              originalDate: job.scheduled_start_date,
              newDate: nextGoodDay.toISOString(),
            },
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error evaluating weather reschedule', error, {
        service: 'SchedulingAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Get contractor performance by time of day and day of week
   */
  private static async getContractorPerformanceByTime(
    contractorId: string
  ): Promise<Record<string, number>> {
    try {
      // Get contractor's completed jobs with timestamps
      const { data: jobs, error } = await serverSupabase
        .from('jobs')
        .select('id, scheduled_start_date, status, updated_at')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed');

      if (error || !jobs || jobs.length === 0) {
        return {};
      }

      // Calculate performance by time/day
      const performance: Record<string, number> = {};

      jobs.forEach((job) => {
        if (!job.scheduled_start_date) return;

        const date = new Date(job.scheduled_start_date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = date.getHours();

        const key = `${dayOfWeek}-${hour}`;
        performance[key] = (performance[key] || 0) + 1;
      });

      return performance;
    } catch (error) {
      logger.error('Error getting contractor performance', error, {
        service: 'SchedulingAgent',
      });
      return {};
    }
  }

  /**
   * Check if a job category is outdoor
   */
  private static isOutdoorJob(category: string): boolean {
    const outdoorCategories = [
      'roofing',
      'gardening',
      'landscaping',
      'outdoor',
      'exterior',
      'painting',
      'fencing',
    ];

    return outdoorCategories.some((cat) =>
      category.toLowerCase().includes(cat.toLowerCase())
    );
  }

  /**
   * Get weather forecast for a location
   */
  private static async getWeatherForecast(location: string): Promise<WeatherData | null> {
    try {
      // Use OpenWeatherMap API or similar
      // For now, return mock data - this should be replaced with actual API call
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        logger.warn('OpenWeather API key not configured', {
          service: 'SchedulingAgent',
        });
        return null;
      }

      // Geocode location to get coordinates
      // Then fetch weather forecast
      // This is a placeholder - actual implementation would call OpenWeatherMap API
      logger.info('Weather forecast requested', {
        service: 'SchedulingAgent',
        location,
      });

      // Mock weather data for now
      return {
        condition: 'rain',
        temperature: 15,
        precipitation: 80,
        windSpeed: 10,
      };
    } catch (error) {
      logger.error('Error getting weather forecast', error, {
        service: 'SchedulingAgent',
      });
      return null;
    }
  }

  /**
   * Check if weather is bad for the job type
   */
  private static isBadWeatherForJob(
    weather: WeatherData,
    category: string
  ): boolean {
    // Heavy rain is bad for outdoor work
    if (weather.precipitation > 50 && this.isOutdoorJob(category)) {
      return true;
    }

    // Strong wind is bad for roofing, scaffolding work
    if (weather.windSpeed > 20 && (category.includes('roofing') || category.includes('exterior'))) {
      return true;
    }

    // Very cold temperatures are bad for outdoor work
    if (weather.temperature < 0 && this.isOutdoorJob(category)) {
      return true;
    }

    return false;
  }

  /**
   * Find the next day with good weather
   */
  private static async findNextGoodWeatherDay(
    location: string,
    startDate: Date,
    category: string
  ): Promise<Date | null> {
    // Check weather for next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);

      const weather = await this.getWeatherForecast(location);
      if (weather && !this.isBadWeatherForJob(weather, category)) {
        return checkDate;
      }
    }

    return null;
  }

  /**
   * Calculate optimal time slots
   */
  private static calculateOptimalSlots(
    contractorPerformance: Record<string, number>,
    weatherData: WeatherData | null,
    currentSchedule: Date | null
  ): Array<{ date: Date; score: number; reason: string }> {
    const suggestions: Array<{ date: Date; score: number; reason: string }> = [];
    const now = new Date();

    // Generate suggestions for next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      // Skip if current schedule and this is the same day
      if (
        currentSchedule &&
        date.toDateString() === currentSchedule.toDateString()
      ) {
        continue;
      }

      // Calculate score based on contractor performance
      const dayOfWeek = date.getDay();
      const hour = 9; // Default to 9 AM
      const key = `${dayOfWeek}-${hour}`;
      const performanceScore = contractorPerformance[key] || 0;

      // Adjust score based on weather (if outdoor)
      let weatherScore = 1.0;
      if (weatherData && this.isBadWeatherForJob(weatherData, '')) {
        weatherScore = 0.3; // Bad weather significantly reduces score
      }

      const totalScore = performanceScore * weatherScore;

      if (totalScore > 0) {
        suggestions.push({
          date,
          score: totalScore,
          reason: `Good contractor performance at this time${weatherData ? ' and favorable weather' : ''}`,
        });
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}

