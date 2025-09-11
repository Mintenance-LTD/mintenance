import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// =====================================================
// SERVICE AREAS INTERFACES
// =====================================================

export interface ServiceArea {
  id: string;
  contractor_id: string;
  area_name: string;
  description?: string;
  area_type: 'radius' | 'polygon' | 'postal_codes' | 'cities';
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
  boundary_coordinates?: any; // GeoJSON
  postal_codes?: string[];
  cities?: string[];
  base_travel_charge: number;
  per_km_rate: number;
  minimum_job_value: number;
  priority_level: number;
  is_primary_area: boolean;
  is_active: boolean;
  max_distance_km?: number;
  response_time_hours: number;
  weekend_surcharge: number;
  evening_surcharge: number;
  emergency_available: boolean;
  emergency_surcharge: number;
  preferred_days: string[];
  preferred_hours: {
    start: string;
    end: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ServiceAreaCoverage {
  id: string;
  service_area_id: string;
  job_id?: string;
  client_location_lat: number;
  client_location_lng: number;
  calculated_distance: number;
  travel_time_minutes?: number;
  travel_charge: number;
  was_accepted: boolean;
  decline_reason?: string;
  created_at: string;
}

export interface AreaPerformance {
  id: string;
  service_area_id: string;
  period_start: string;
  period_end: string;
  total_jobs: number;
  total_revenue: number;
  total_travel_time_hours: number;
  average_travel_distance: number;
  conversion_rate: number;
  customer_satisfaction: number;
  profitability_score: number;
  created_at: string;
}

export interface ContractorLocation {
  contractor_id: string;
  area_name: string;
  distance_km: number;
  travel_charge: number;
  priority_level: number;
}

export interface ServiceRoute {
  id: string;
  contractor_id: string;
  route_name: string;
  route_date: string;
  estimated_duration_minutes?: number;
  total_distance_km?: number;
  total_travel_cost?: number;
  jobs: string[];
  waypoints: any[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVICE AREAS SERVICE CLASS
// =====================================================

export class ServiceAreasService {
  // =====================================================
  // SERVICE AREA MANAGEMENT
  // =====================================================

  static async createServiceArea(areaData: {
    contractor_id: string;
    area_name: string;
    description?: string;
    area_type: 'radius' | 'polygon' | 'postal_codes' | 'cities';
    center_latitude?: number;
    center_longitude?: number;
    radius_km?: number;
    boundary_coordinates?: any;
    postal_codes?: string[];
    cities?: string[];
    base_travel_charge?: number;
    per_km_rate?: number;
    minimum_job_value?: number;
    priority_level?: number;
    is_primary_area?: boolean;
    max_distance_km?: number;
    response_time_hours?: number;
    weekend_surcharge?: number;
    evening_surcharge?: number;
    emergency_available?: boolean;
    emergency_surcharge?: number;
    preferred_days?: string[];
    preferred_hours?: { start: string; end: string };
  }): Promise<ServiceArea> {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .insert([{
          ...areaData,
          base_travel_charge: areaData.base_travel_charge || 0,
          per_km_rate: areaData.per_km_rate || 0,
          minimum_job_value: areaData.minimum_job_value || 0,
          priority_level: areaData.priority_level || 1,
          is_primary_area: areaData.is_primary_area || false,
          response_time_hours: areaData.response_time_hours || 24,
          weekend_surcharge: areaData.weekend_surcharge || 0,
          evening_surcharge: areaData.evening_surcharge || 0,
          emergency_available: areaData.emergency_available || false,
          emergency_surcharge: areaData.emergency_surcharge || 0,
          preferred_days: areaData.preferred_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          preferred_hours: areaData.preferred_hours || { start: '09:00', end: '17:00' }
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating service area:', error);
      throw error;
    }
  }

  static async getServiceAreas(contractorId: string): Promise<ServiceArea[]> {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('priority_level', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching service areas:', error);
      throw error;
    }
  }

  static async updateServiceArea(areaId: string, updates: Partial<ServiceArea>): Promise<ServiceArea> {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .update(updates)
        .eq('id', areaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating service area:', error);
      throw error;
    }
  }

  static async deleteServiceArea(areaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', areaId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting service area:', error);
      throw error;
    }
  }

  // =====================================================
  // GEOGRAPHICAL CALCULATIONS
  // =====================================================

  static async calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_distance_km', {
          lat1, lng1, lat2, lng2
        });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error calculating distance:', error);
      // Fallback to JavaScript calculation
      return this.haversineDistance(lat1, lng1, lat2, lng2);
    }
  }

  static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static async isLocationInServiceArea(
    areaId: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_location_in_service_area', {
          p_area_id: areaId,
          p_latitude: latitude,
          p_longitude: longitude
        });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error checking location in service area:', error);
      return false;
    }
  }

  static async findContractorsForLocation(
    latitude: number,
    longitude: number,
    maxDistance: number = 50
  ): Promise<ContractorLocation[]> {
    try {
      const { data, error } = await supabase
        .rpc('find_contractors_for_location', {
          p_latitude: latitude,
          p_longitude: longitude,
          p_max_distance: maxDistance
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error finding contractors for location:', error);
      return [];
    }
  }

  // =====================================================
  // TRAVEL COST CALCULATIONS
  // =====================================================

  static calculateTravelCharge(
    baseCharge: number,
    perKmRate: number,
    distance: number,
    isWeekend: boolean = false,
    isEvening: boolean = false,
    isEmergency: boolean = false,
    weekendSurcharge: number = 0,
    eveningSurcharge: number = 0,
    emergencySurcharge: number = 0
  ): number {
    let charge = baseCharge + (perKmRate * distance);
    
    if (isWeekend) {
      charge += charge * (weekendSurcharge / 100);
    }
    
    if (isEvening) {
      charge += charge * (eveningSurcharge / 100);
    }
    
    if (isEmergency) {
      charge += charge * (emergencySurcharge / 100);
    }
    
    return Math.round(charge * 100) / 100; // Round to 2 decimal places
  }

  // =====================================================
  // SERVICE AREA ANALYTICS
  // =====================================================

  static async getAreaPerformance(
    areaId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<AreaPerformance | null> {
    try {
      const { data, error } = await supabase
        .from('area_performance')
        .select('*')
        .eq('service_area_id', areaId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching area performance:', error);
      return null;
    }
  }

  static async recordCoverage(coverageData: {
    service_area_id: string;
    job_id?: string;
    client_location_lat: number;
    client_location_lng: number;
    calculated_distance: number;
    travel_time_minutes?: number;
    travel_charge: number;
    was_accepted: boolean;
    decline_reason?: string;
  }): Promise<ServiceAreaCoverage> {
    try {
      const { data, error } = await supabase
        .from('service_area_coverage')
        .insert([coverageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error recording coverage:', error);
      throw error;
    }
  }

  // =====================================================
  // ROUTE OPTIMIZATION
  // =====================================================

  static async createRoute(routeData: {
    contractor_id: string;
    route_name: string;
    route_date: string;
    jobs?: string[];
  }): Promise<ServiceRoute> {
    try {
      const { data, error } = await supabase
        .from('service_routes')
        .insert([{
          ...routeData,
          jobs: routeData.jobs || [],
          waypoints: [],
          status: 'planned'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating route:', error);
      throw error;
    }
  }

  static async optimizeRoute(routeId: string, jobLocations: Array<{
    job_id: string;
    latitude: number;
    longitude: number;
  }>): Promise<{
    optimized_order: string[];
    total_distance: number;
    estimated_time: number;
  }> {
    // This is a simplified optimization algorithm
    // In production, you'd use Google Maps API or similar service
    
    if (jobLocations.length <= 1) {
      return {
        optimized_order: jobLocations.map(loc => loc.job_id),
        total_distance: 0,
        estimated_time: 0
      };
    }

    // Simple nearest neighbor algorithm
    const unvisited = [...jobLocations];
    const visited: typeof jobLocations = [];
    let currentLocation = unvisited.shift()!;
    visited.push(currentLocation);
    
    let totalDistance = 0;
    
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      
      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.haversineDistance(
          currentLocation.latitude, currentLocation.longitude,
          unvisited[i].latitude, unvisited[i].longitude
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      
      totalDistance += nearestDistance;
      currentLocation = unvisited.splice(nearestIndex, 1)[0];
      visited.push(currentLocation);
    }
    
    return {
      optimized_order: visited.map(loc => loc.job_id),
      total_distance: Math.round(totalDistance * 100) / 100,
      estimated_time: Math.round(totalDistance * 2) // Rough estimate: 2 minutes per km
    };
  }

  static async getRoutes(contractorId: string): Promise<ServiceRoute[]> {
    try {
      const { data, error } = await supabase
        .from('service_routes')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('route_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching routes:', error);
      throw error;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  static async validateServiceArea(areaData: Partial<ServiceArea>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    if (!areaData.area_name || areaData.area_name.trim().length === 0) {
      errors.push('Area name is required');
    }
    
    if (areaData.area_type === 'radius') {
      if (!areaData.center_latitude || !areaData.center_longitude) {
        errors.push('Center coordinates are required for radius areas');
      }
      if (!areaData.radius_km || areaData.radius_km <= 0) {
        errors.push('Radius must be greater than 0');
      }
    }
    
    if (areaData.area_type === 'postal_codes') {
      if (!areaData.postal_codes || areaData.postal_codes.length === 0) {
        errors.push('At least one postal code is required');
      }
    }
    
    if (areaData.area_type === 'cities') {
      if (!areaData.cities || areaData.cities.length === 0) {
        errors.push('At least one city is required');
      }
    }
    
    if (areaData.per_km_rate && areaData.per_km_rate < 0) {
      errors.push('Per-km rate cannot be negative');
    }
    
    if (areaData.priority_level && (areaData.priority_level < 1 || areaData.priority_level > 5)) {
      errors.push('Priority level must be between 1 and 5');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static formatServiceArea(data: any): ServiceArea {
    return {
      id: data.id,
      contractor_id: data.contractor_id,
      area_name: data.area_name,
      description: data.description,
      area_type: data.area_type,
      center_latitude: data.center_latitude,
      center_longitude: data.center_longitude,
      radius_km: data.radius_km,
      boundary_coordinates: data.boundary_coordinates,
      postal_codes: data.postal_codes,
      cities: data.cities,
      base_travel_charge: data.base_travel_charge,
      per_km_rate: data.per_km_rate,
      minimum_job_value: data.minimum_job_value,
      priority_level: data.priority_level,
      is_primary_area: data.is_primary_area,
      is_active: data.is_active,
      max_distance_km: data.max_distance_km,
      response_time_hours: data.response_time_hours,
      weekend_surcharge: data.weekend_surcharge,
      evening_surcharge: data.evening_surcharge,
      emergency_available: data.emergency_available,
      emergency_surcharge: data.emergency_surcharge,
      preferred_days: data.preferred_days,
      preferred_hours: data.preferred_hours,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}