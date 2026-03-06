import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { supabase } from '../../../config/supabase';
import {
  type ResourceUtilization,
  type ResourceAnalytics,
  type InventoryItem,
  type Equipment,
  type DatabaseInventoryRow,
  type DatabaseEquipmentRow,
  mapInventoryItem,
  mapEquipment,
} from './types';
import { EquipmentService } from './EquipmentService';

export class AnalyticsService {
  static async trackResourceUtilization(utilization: ResourceUtilization): Promise<void> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { error } = await supabase
          .from('resource_utilization')
          .insert({
            resource_id: utilization.resourceId,
            resource_type: utilization.resourceType,
            job_id: utilization.jobId,
            quantity: utilization.quantity,
            utilization_hours: utilization.utilizationHours,
            usage_date: utilization.usageDate,
            cost: utilization.cost,
            purpose: utilization.purpose,
            efficiency: utilization.efficiency,
          });

        if (error) throw error;

        if (utilization.resourceType === 'equipment') {
          await EquipmentService.updateEquipmentUtilization(
            utilization.resourceId,
            utilization.utilizationHours || 0
          );
        }
      },
      { service: 'AnalyticsService', method: 'trackResourceUtilization' }
    );

    if (!result.success) {
      throw result.error || new Error('Failed to track resource utilization');
    }
  }

  static async getResourceAnalytics(contractorId: string, startDate: string, endDate: string): Promise<ResourceAnalytics> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const [
          inventoryValue,
          equipmentValue,
          lowStockCount,
          utilizationData,
          maintenanceCosts,
          mostUsed,
          underutilized,
          supplierPerf,
          optimizationOps,
        ] = await Promise.all([
          AnalyticsService.calculateTotalInventoryValue(contractorId),
          AnalyticsService.calculateTotalEquipmentValue(contractorId),
          AnalyticsService.getLowStockItemsCount(contractorId),
          AnalyticsService.getEquipmentUtilizationData(contractorId, startDate, endDate),
          AnalyticsService.getMaintenanceCosts(contractorId, startDate, endDate),
          AnalyticsService.getMostUsedItems(contractorId, startDate, endDate),
          AnalyticsService.getUnderutilizedEquipment(contractorId),
          AnalyticsService.getSupplierPerformance(contractorId, startDate, endDate),
          AnalyticsService.getOptimizationOpportunities(contractorId),
        ]);

        const resourceEfficiency = await AnalyticsService.calculateResourceEfficiency(contractorId, startDate, endDate);

        return {
          totalInventoryValue: inventoryValue,
          totalEquipmentValue: equipmentValue,
          lowStockItems: lowStockCount,
          equipmentUtilization: utilizationData.average,
          maintenanceCosts: maintenanceCosts,
          mostUsedItems: mostUsed,
          underutilizedEquipment: underutilized,
          supplierPerformance: supplierPerf,
          costOptimizationOpportunities: optimizationOps,
          resourceEfficiency: resourceEfficiency,
        };
      },
      { service: 'AnalyticsService', method: 'getResourceAnalytics' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to get resource analytics');
    }

    return result.data;
  }

  private static async calculateTotalInventoryValue(contractorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('quantity, unit_cost')
      .eq('contractor_id', contractorId);

    if (error || !data) return 0;

    return data.reduce((sum: number, item: { quantity: number; unit_cost: number }) => sum + (item.quantity * item.unit_cost), 0);
  }

  private static async calculateTotalEquipmentValue(contractorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('equipment')
      .select('current_value')
      .eq('contractor_id', contractorId)
      .not('current_value', 'is', null);

    if (error || !data) return 0;

    return data.reduce((sum: number, item: { current_value: number | null }) => sum + (item.current_value || 0), 0);
  }

  private static async getLowStockItemsCount(contractorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)
      .or('status.eq.low_stock,status.eq.out_of_stock');

    return error ? 0 : (count || 0);
  }

  private static async getEquipmentUtilizationData(contractorId: string, _startDate: string, _endDate: string): Promise<{ average: number }> {
    const { data, error } = await supabase
      .from('equipment')
      .select('utilization')
      .eq('contractor_id', contractorId)
      .eq('status', 'operational');

    if (error || !data) return { average: 0 };

    const average = data.length > 0 ?
      data.reduce((sum: number, item: { utilization: number }) => sum + item.utilization, 0) / data.length : 0;

    return { average };
  }

  private static async getMaintenanceCosts(contractorId: string, startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('cost, equipment!inner(contractor_id)')
      .eq('equipment.contractor_id', contractorId)
      .gte('performed_date', startDate)
      .lte('performed_date', endDate);

    if (error || !data) return 0;

    return data.reduce((sum: number, record: { cost: number }) => sum + record.cost, 0);
  }

  private static async getMostUsedItems(contractorId: string, startDate: string, endDate: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select(`resource_id, quantity, inventory_items!inner(*)`)
      .eq('inventory_items.contractor_id', contractorId)
      .eq('resource_type', 'inventory')
      .gte('usage_date', startDate)
      .lte('usage_date', endDate);

    if (error || !data) return [];

    const usage = data.reduce<Record<string, number>>((acc: Record<string, number>, record: Record<string, unknown>) => {
      const typedRecord = record as { resource_id: string; quantity?: number };
      acc[typedRecord.resource_id] = (acc[typedRecord.resource_id] || 0) + (typedRecord.quantity || 0);
      return acc;
    }, {});

    const topItems = Object.entries(usage)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([resourceId]) => resourceId);

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .in('id', topItems);

    if (itemsError || !items) return [];

    return (items as DatabaseInventoryRow[]).map(mapInventoryItem);
  }

  private static async getUnderutilizedEquipment(contractorId: string): Promise<Equipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('status', 'operational')
      .lt('utilization', 30);

    if (error || !data) return [];

    return (data as DatabaseEquipmentRow[]).map(mapEquipment);
  }

  private static async getSupplierPerformance(_contractorId: string, _startDate: string, _endDate: string): Promise<Record<string, unknown>[]> {
    // Implementation would analyze delivery times, quality, pricing trends
    return [];
  }

  private static async getOptimizationOpportunities(_contractorId: string): Promise<Record<string, unknown>[]> {
    // Implementation would identify cost-saving opportunities
    return [];
  }

  private static async calculateResourceEfficiency(_contractorId: string, _startDate: string, _endDate: string): Promise<number> {
    // Implementation would calculate overall resource efficiency score
    return 85;
  }
}
