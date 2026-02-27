import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { supabase } from '../../../config/supabase';
import {
  type Equipment,
  type MaintenanceRecord,
  type DatabaseEquipmentRow,
  type DatabaseMaintenanceRecordRow,
  mapEquipment,
  mapMaintenanceRecord,
} from './types';

export class EquipmentService {
  static async addEquipment(equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('equipment')
          .insert({
            contractor_id: equipment.contractorId,
            name: equipment.name,
            type: equipment.type,
            model: equipment.model,
            serial_number: equipment.serialNumber,
            purchase_date: equipment.purchaseDate,
            purchase_price: equipment.purchasePrice,
            current_value: equipment.currentValue,
            status: equipment.status,
            condition: equipment.condition,
            next_maintenance_date: equipment.nextMaintenanceDate,
            last_maintenance_date: equipment.lastMaintenanceDate,
            maintenance_cost: equipment.maintenanceCost,
            warranty_expiry: equipment.warrantyExpiry,
            location: equipment.location,
            utilization: equipment.utilization,
          })
          .select()
          .single();

        if (error) throw error;

        return mapEquipment(data as DatabaseEquipmentRow);
      },
      { service: 'EquipmentService', method: 'addEquipment' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to add equipment');
    }

    return result.data;
  }

  static async getEquipment(contractorId: string): Promise<Equipment[]> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('contractor_id', contractorId)
          .order('name');

        if (error) throw error;

        return (data as DatabaseEquipmentRow[]).map(mapEquipment);
      },
      { service: 'EquipmentService', method: 'getEquipment' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to get equipment');
    }

    return result.data;
  }

  static async scheduleMaintenanceCheck(): Promise<Equipment[]> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .lte('next_maintenance_date', nextWeek.toISOString())
          .eq('status', 'operational');

        if (error) throw error;

        return (data as DatabaseEquipmentRow[]).map(mapEquipment);
      },
      { service: 'EquipmentService', method: 'scheduleMaintenanceCheck' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to schedule maintenance check');
    }

    return result.data;
  }

  static async recordMaintenance(maintenance: Omit<MaintenanceRecord, 'id' | 'createdAt'>): Promise<MaintenanceRecord> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('maintenance_records')
          .insert({
            equipment_id: maintenance.equipmentId,
            type: maintenance.type,
            description: maintenance.description,
            cost: maintenance.cost,
            performed_by: maintenance.performedBy,
            performed_date: maintenance.performedDate,
            next_due_date: maintenance.nextDueDate,
            parts_used: maintenance.partsUsed,
            downtime: maintenance.downtime,
            notes: maintenance.notes,
            attachments: maintenance.attachments,
          })
          .select()
          .single();

        if (error) throw error;

        if (maintenance.nextDueDate) {
          await supabase
            .from('equipment')
            .update({
              last_maintenance_date: maintenance.performedDate,
              next_maintenance_date: maintenance.nextDueDate,
              maintenance_cost: maintenance.cost,
            })
            .eq('id', maintenance.equipmentId);
        }

        return mapMaintenanceRecord(data as DatabaseMaintenanceRecordRow);
      },
      { service: 'EquipmentService', method: 'recordMaintenance' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to record maintenance');
    }

    return result.data;
  }

  static async updateEquipmentUtilization(equipmentId: string, hours: number): Promise<void> {
    const { data: equipment, error: fetchError } = await supabase
      .from('equipment')
      .select('utilization')
      .eq('id', equipmentId)
      .single();

    if (fetchError || !equipment) return;

    const equipmentRow = equipment as { utilization: number };
    const newUtilization = Math.min(equipmentRow.utilization + hours, 100);

    await supabase
      .from('equipment')
      .update({ utilization: newUtilization })
      .eq('id', equipmentId);
  }
}
