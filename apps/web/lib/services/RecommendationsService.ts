import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface MaintenanceRecommendation {
  id: string;
  type: 'maintenance_schedule' | 'seasonal' | 'cost_saving' | 'preventive';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedDate?: Date;
  estimatedCost?: number;
  potentialSavings?: number;
  category?: string;
  actionUrl?: string;
}

interface UserJobHistory {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  updated_at?: string;
  budget?: number;
}

interface UserSubscription {
  id: string;
  name: string;
  category?: string;
  next_billing_date?: string;
  frequency?: string;
}

/**
 * Service to generate personalized maintenance recommendations
 */
export class RecommendationsService {
  /**
   * Get personalized recommendations for a homeowner
   */
  static async getRecommendations(userId: string): Promise<MaintenanceRecommendation[]> {
    try {
      // Fetch user's job history
      const { data: jobs } = await serverSupabase
        .from('jobs')
        .select('id, title, category, status, created_at, updated_at, budget')
        .eq('homeowner_id', userId)
        .order('created_at', { ascending: false });

      // Fetch user's subscriptions
      const { data: subscriptions } = await serverSupabase
        .from('subscriptions')
        .select('id, name, category, next_billing_date, frequency')
        .eq('user_id', userId)
        .eq('status', 'active');

      // Fetch user's properties if available (table might not exist)
      let properties: any[] = [];
      try {
        const { data: propertiesData } = await serverSupabase
          .from('properties')
          .select('id, property_type, built_year')
          .eq('user_id', userId)
          .limit(5);
        properties = propertiesData || [];
      } catch (error) {
        // Properties table might not exist, continue without it
        logger.warn('Properties table not found, skipping property-based recommendations', { service: 'recommendations' });
      }

      const recommendations: MaintenanceRecommendation[] = [];

      // Generate recommendations based on data
      recommendations.push(...this.generateMaintenanceScheduleRecommendations(jobs || [], subscriptions || []));
      recommendations.push(...this.generateSeasonalRecommendations(properties || [], jobs || [])); // Pass jobs for personalization
      recommendations.push(...this.generateCostSavingRecommendations(jobs || []));
      recommendations.push(...this.generatePreventiveRecommendations(jobs || [], properties || []));

      // Sort by priority (high first) and limit to top 10
      return recommendations
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, 10);

    } catch (error) {
      logger.error('Failed to generate recommendations', error, { service: 'recommendations', userId });
      return [];
    }
  }

  /**
   * Generate maintenance schedule recommendations based on job history
   */
  private static generateMaintenanceScheduleRecommendations(
    jobs: UserJobHistory[],
    subscriptions: UserSubscription[]
  ): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    const now = new Date();

    // Analyze job categories and frequencies
    const categoryFrequency = new Map<string, { count: number; lastDate: Date }>();
    
    jobs.forEach(job => {
      if (job.category && job.status === 'completed') {
        // Use updated_at if available, otherwise created_at
        const lastDate = job.updated_at ? new Date(job.updated_at) : new Date(job.created_at);
        const existing = categoryFrequency.get(job.category);
        
        if (!existing || lastDate > existing.lastDate) {
          categoryFrequency.set(job.category, {
            count: (existing?.count || 0) + 1,
            lastDate
          });
        }
      }
    });

    // Generate maintenance schedules based on category patterns
    categoryFrequency.forEach((data, category) => {
      const monthsSinceLastService = this.getMonthsDifference(data.lastDate, now);
      
      // Common maintenance intervals (in months)
      const maintenanceIntervals: Record<string, number> = {
        'plumbing': 12,
        'electrical': 24,
        'hvac': 6,
        'roofing': 24,
        'heating': 12,
        'cooling': 12,
        'appliance': 12,
        'general': 12,
      };

      const interval = maintenanceIntervals[category.toLowerCase()] || 12;
      
      if (monthsSinceLastService >= interval - 1) {
        const suggestedDate = new Date(data.lastDate);
        suggestedDate.setMonth(suggestedDate.getMonth() + interval);

        recommendations.push({
          id: `maintenance-${category}-${data.lastDate.getTime()}`,
          type: 'maintenance_schedule',
          title: `${this.formatCategory(category)} Maintenance Due`,
          description: `Based on your service history, it's time for routine ${category.toLowerCase()} maintenance. Last service was ${this.formatDate(data.lastDate)}.`,
          priority: monthsSinceLastService >= interval ? 'high' : 'medium',
          suggestedDate,
          category,
          actionUrl: '/jobs/create?category=' + encodeURIComponent(category),
        });
      }
    });

    // Check subscription renewal dates
    subscriptions.forEach(sub => {
      if (sub.next_billing_date) {
        const nextDate = new Date(sub.next_billing_date);
        const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 30 && daysUntil > 0) {
          recommendations.push({
            id: `subscription-${sub.id}`,
            type: 'maintenance_schedule',
            title: `${sub.name} Renewal Coming Up`,
            description: `Your ${sub.name} subscription is due for renewal in ${daysUntil} days.`,
            priority: daysUntil <= 7 ? 'high' : 'medium',
            suggestedDate: nextDate,
            category: sub.category,
            actionUrl: '/financials',
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Generate seasonal recommendations based on current time, property data, and job history
   */
  private static generateSeasonalRecommendations(properties: any[], jobs: UserJobHistory[]): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    const now = new Date();
    const month = now.getMonth(); // 0-11

    // Analyze user's job history to see what categories they've used
    const userCategories = new Set(jobs.map(job => job.category?.toLowerCase()).filter(Boolean));
    const hasCompletedJobs = jobs.some(job => job.status === 'completed');
    
    // Only show seasonal recommendations if user has actual job history OR properties
    // This makes recommendations more personalized
    if (!hasCompletedJobs && properties.length === 0) {
      return []; // Don't show generic seasonal recommendations for new users
    }

    // Spring (March-May) - months 2-4
    if (month >= 2 && month <= 4) {
      recommendations.push({
        id: 'seasonal-spring-gutter',
        type: 'seasonal',
        title: 'Spring Gutter Cleaning',
        description: 'Clear winter debris from gutters to prevent water damage. Spring is the perfect time for outdoor maintenance.',
        priority: 'medium',
        category: 'roofing',
        actionUrl: '/jobs/create?category=roofing',
      });

      // Only suggest AC check if user has HVAC/cooling jobs or properties
      if (userCategories.has('hvac') || userCategories.has('cooling') || properties.length > 0) {
        recommendations.push({
          id: 'seasonal-spring-hvac',
          type: 'seasonal',
          title: 'AC System Check',
          description: 'Schedule an AC inspection before summer heat arrives. Early maintenance can prevent costly breakdowns.',
          priority: 'high',
          category: 'hvac',
          actionUrl: '/jobs/create?category=hvac',
        });
      }

      recommendations.push({
        id: 'seasonal-spring-outdoor',
        type: 'seasonal',
        title: 'Outdoor Maintenance',
        description: 'Spring is ideal for outdoor projects like painting, deck repairs, and garden work.',
        priority: 'low',
        category: 'general',
        actionUrl: '/jobs/create',
      });
    }

    // Summer (June-August) - months 5-7
    if (month >= 5 && month <= 7) {
      recommendations.push({
        id: 'seasonal-summer-cooling',
        type: 'seasonal',
        title: 'Cooling System Maintenance',
        description: 'Ensure your cooling systems are running efficiently during peak summer months.',
        priority: 'high',
        category: 'hvac',
        actionUrl: '/jobs/create?category=hvac',
      });

      recommendations.push({
        id: 'seasonal-summer-outdoor',
        type: 'seasonal',
        title: 'Outdoor Space Preparation',
        description: 'Perfect weather for patio, deck, and outdoor space improvements.',
        priority: 'low',
        category: 'general',
        actionUrl: '/jobs/create',
      });
    }

    // Autumn (September-November) - months 8-10
    if (month >= 8 && month <= 10) {
      // Only suggest heating check if user has heating jobs, HVAC jobs, or properties
      // This makes it personalized to their actual needs
      if (userCategories.has('heating') || userCategories.has('hvac') || properties.length > 0) {
        // Check if they've had heating work done recently (within last 12 months)
        const recentHeatingJobs = jobs.filter(job => 
          (job.category?.toLowerCase().includes('heating') || job.category?.toLowerCase().includes('hvac')) &&
          job.status === 'completed'
        );
        
        const lastHeatingJob = recentHeatingJobs
          .map(job => job.updated_at ? new Date(job.updated_at) : new Date(job.created_at))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        
        const monthsSinceLastHeating = lastHeatingJob 
          ? this.getMonthsDifference(lastHeatingJob, now)
          : 999;
        
        // Only suggest if it's been 6+ months since last heating work
        if (monthsSinceLastHeating >= 6 || !lastHeatingJob) {
          recommendations.push({
            id: 'seasonal-autumn-heating',
            type: 'seasonal',
            title: 'Heating System Check',
            description: lastHeatingJob 
              ? `Prepare for winter by having your heating system serviced. Last service was ${this.formatDate(lastHeatingJob)}.`
              : 'Prepare for winter by having your heating system serviced before cold weather arrives.',
            priority: 'high',
            category: 'heating',
            actionUrl: '/jobs/create?category=heating',
          });
        }
      }

      recommendations.push({
        id: 'seasonal-autumn-insulation',
        type: 'seasonal',
        title: 'Winter Preparation',
        description: 'Check insulation, seal drafts, and prepare your home for winter. Can save on heating costs.',
        priority: 'medium',
        category: 'general',
        actionUrl: '/jobs/create',
      });

      recommendations.push({
        id: 'seasonal-autumn-gutter',
        type: 'seasonal',
        title: 'Pre-Winter Gutter Clean',
        description: 'Clear gutters before winter to prevent ice dams and water damage.',
        priority: 'medium',
        category: 'roofing',
        actionUrl: '/jobs/create?category=roofing',
      });
    }

    // Winter (December-February) - months 11, 0, 1
    if (month === 11 || month <= 1) {
      recommendations.push({
        id: 'seasonal-winter-indoor',
        type: 'seasonal',
        title: 'Indoor Projects',
        description: 'Winter is ideal for indoor renovations, painting, and improvements.',
        priority: 'low',
        category: 'general',
        actionUrl: '/jobs/create',
      });

      recommendations.push({
        id: 'seasonal-winter-emergency',
        type: 'seasonal',
        title: 'Emergency Preparedness',
        description: 'Ensure heating systems, pipes, and emergency equipment are in working order.',
        priority: 'high',
        category: 'heating',
        actionUrl: '/jobs/create?category=heating',
      });
    }

    // Property age-based recommendations
    properties.forEach(property => {
      if (property.built_year) {
        const age = now.getFullYear() - property.built_year;
        
        if (age >= 20 && month >= 8 && month <= 10) {
          recommendations.push({
            id: `property-age-${property.id}`,
            type: 'seasonal',
            title: 'Property Health Check',
            description: `Your property is ${age} years old. Consider a comprehensive inspection to identify potential issues early.`,
            priority: 'medium',
            category: 'general',
            actionUrl: '/jobs/create',
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Generate cost-saving recommendations
   */
  private static generateCostSavingRecommendations(jobs: UserJobHistory[]): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    
    // Analyze job patterns for bundling opportunities
    const recentJobs = jobs
      .filter(job => {
        const jobDate = new Date(job.created_at);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return jobDate >= sixMonthsAgo;
      })
      .slice(0, 10);

    // Group jobs by category
    const categoryGroups = new Map<string, UserJobHistory[]>();
    recentJobs.forEach(job => {
      if (job.category) {
        const existing = categoryGroups.get(job.category) || [];
        existing.push(job);
        categoryGroups.set(job.category, existing);
      }
    });

    // Suggest bundling if multiple jobs in same category
    categoryGroups.forEach((categoryJobs, category) => {
      if (categoryJobs.length >= 2) {
        const totalCost = categoryJobs.reduce((sum, job) => sum + (job.budget || 0), 0);
        const potentialSavings = Math.round(totalCost * 0.15); // Estimate 15% savings

        recommendations.push({
          id: `cost-saving-bundle-${category}`,
          type: 'cost_saving',
          title: `Bundle ${category} Jobs`,
          description: `You've had ${categoryJobs.length} ${category.toLowerCase()} jobs recently. Consider bundling similar work to save approximately ${this.formatMoney(potentialSavings)}.`,
          priority: 'medium',
          potentialSavings,
          category,
          actionUrl: '/jobs/create?category=' + encodeURIComponent(category),
        });
      }
    });

    // Suggest preventive maintenance if user has many emergency repairs
    const emergencyJobs = jobs.filter(job => 
      job.status === 'completed' && 
      (job.title.toLowerCase().includes('emergency') || 
       job.title.toLowerCase().includes('urgent') ||
       job.title.toLowerCase().includes('leak') ||
       job.title.toLowerCase().includes('broken'))
    );

    if (emergencyJobs.length >= 3) {
      const emergencyCost = emergencyJobs.reduce((sum, job) => sum + (job.budget || 0), 0);
      const estimatedPreventiveCost = Math.round(emergencyCost * 0.6); // Preventive is typically 60% of emergency cost
      const potentialSavings = emergencyCost - estimatedPreventiveCost;

      recommendations.push({
        id: 'cost-saving-preventive',
        type: 'cost_saving',
        title: 'Preventive Maintenance Can Save Money',
        description: `You've had ${emergencyJobs.length} emergency repairs. Regular preventive maintenance could save you approximately ${this.formatMoney(potentialSavings)} annually.`,
        priority: 'high',
        potentialSavings,
        actionUrl: '/jobs/create',
      });
    }

    // Suggest energy-efficient upgrades if user has high heating/cooling costs
    const hvacJobs = jobs.filter(job => 
      job.category && 
      (job.category.toLowerCase().includes('hvac') || 
       job.category.toLowerCase().includes('heating') ||
       job.category.toLowerCase().includes('cooling'))
    );

    if (hvacJobs.length >= 2) {
      recommendations.push({
        id: 'cost-saving-energy',
        type: 'cost_saving',
        title: 'Energy Efficiency Upgrade',
        description: 'Consider upgrading to energy-efficient systems. Can reduce monthly utility bills by 20-30%.',
        priority: 'medium',
        estimatedCost: 2000,
        potentialSavings: 600, // Annual savings estimate
        category: 'hvac',
        actionUrl: '/jobs/create?category=hvac',
      });
    }

    return recommendations;
  }

  /**
   * Generate preventive maintenance recommendations
   */
  private static generatePreventiveRecommendations(
    jobs: UserJobHistory[],
    properties: any[]
  ): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];
    const now = new Date();

    // Check if user has had any preventive maintenance
    const hasPreventiveMaintenance = jobs.some(job =>
      job.title.toLowerCase().includes('inspection') ||
      job.title.toLowerCase().includes('service') ||
      job.title.toLowerCase().includes('maintenance')
    );

    if (!hasPreventiveMaintenance && jobs.length >= 2) {
      recommendations.push({
        id: 'preventive-first',
        type: 'preventive',
        title: 'Start Preventive Maintenance',
        description: 'Regular preventive maintenance can extend the life of your home systems and prevent costly emergency repairs.',
        priority: 'high',
        actionUrl: '/jobs/create',
      });
    }

    // Property age-based preventive recommendations
    properties.forEach(property => {
      if (property.built_year) {
        const age = now.getFullYear() - property.built_year;
        
        if (age >= 15 && age < 20) {
          recommendations.push({
            id: `preventive-age-${property.id}`,
            type: 'preventive',
            title: '15-Year Property Inspection',
            description: `Your property is ${age} years old. Consider a comprehensive inspection to catch issues before they become major problems.`,
            priority: 'medium',
            estimatedCost: 300,
            actionUrl: '/jobs/create',
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Helper: Get months difference between two dates
   */
  private static getMonthsDifference(date1: Date, date2: Date): number {
    const yearDiff = date2.getFullYear() - date1.getFullYear();
    const monthDiff = date2.getMonth() - date1.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  /**
   * Helper: Format category name
   */
  private static formatCategory(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Helper: Format date
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  /**
   * Helper: Format money
   */
  private static formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

