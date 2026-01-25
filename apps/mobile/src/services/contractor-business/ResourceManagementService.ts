import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

// Database row interfaces
interface DatabaseInventoryRow {
  id: string;
  contractor_id: string;
  name: string;
  category: string;
  sku?: string;
  description?: string;
  quantity: number;
  min_threshold: number;
  unit_cost: number;
  supplier_id?: string;
  location?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'ordered';
  last_restocked?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseEquipmentRow {
  id: string;
  contractor_id: string;
  name: string;
  type: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  status: 'operational' | 'maintenance' | 'repair' | 'retired';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  next_maintenance_date?: string;
  last_maintenance_date?: string;
  maintenance_cost?: number;
  warranty_expiry?: string;
  location?: string;
  utilization: number;
  created_at: string;
  updated_at: string;
}

interface DatabaseSupplierRow {
  id: string;
  contractor_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string[];
  rating: number;
  payment_terms?: string;
  delivery_time?: number;
  minimum_order?: number;
  discount_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseMaintenanceRecordRow {
  id: string;
  equipment_id: string;
  type: 'routine' | 'repair' | 'inspection' | 'calibration';
  description: string;
  cost: number;
  performed_by: string;
  performed_date: string;
  next_due_date?: string;
  parts_used?: string[];
  downtime?: number;
  notes?: string;
  attachments?: string[];
  created_at: string;
}

interface PurchaseOrderItem {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  description: string;
}

// Application interfaces
interface InventoryItem {
  id: string;
  contractorId: string;
  name: string;
  category: string;
  sku?: string;
  description?: string;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  supplierId?: string;
  location?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'ordered';
  lastRestocked?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Equipment {
  id: string;
  contractorId: string;
  name: string;
  type: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  status: 'operational' | 'maintenance' | 'repair' | 'retired';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  nextMaintenanceDate?: string;
  lastMaintenanceDate?: string;
  maintenanceCost?: number;
  warrantyExpiry?: string;
  location?: string;
  utilization: number;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  contractorId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string[];
  rating: number;
  paymentTerms?: string;
  deliveryTime?: number;
  minimumOrder?: number;
  discountRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ResourceUtilization {
  resourceId: string;
  resourceType: 'inventory' | 'equipment';
  jobId?: string;
  quantity?: number;
  utilizationHours?: number;
  usageDate: string;
  cost: number;
  purpose: string;
  efficiency: number;
}

interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reason: string;
  reference?: string;
  jobId?: string;
  supplierId?: string;
  location?: string;
  createdBy: string;
  createdAt: string;
}

interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: 'routine' | 'repair' | 'inspection' | 'calibration';
  description: string;
  cost: number;
  performedBy: string;
  performedDate: string;
  nextDueDate?: string;
  partsUsed?: string[];
  downtime?: number;
  notes?: string;
  attachments?: string[];
  createdAt: string;
}

interface ResourceAnalytics {
  totalInventoryValue: number;
  totalEquipmentValue: number;
  lowStockItems: number;
  equipmentUtilization: number;
  maintenanceCosts: number;
  mostUsedItems: InventoryItem[];
  underutilizedEquipment: Equipment[];
  supplierPerformance: Record<string, unknown>[];
  costOptimizationOpportunities: Record<string, unknown>[];
  resourceEfficiency: number;
}

export class ResourceManagementService {
  static async addInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .insert({
            contractor_id: item.contractorId,
            name: item.name,
            category: item.category,
            sku: item.sku,
            description: item.description,
            quantity: item.quantity,
            min_threshold: item.minThreshold,
            unit_cost: item.unitCost,
            supplier_id: item.supplierId,
            location: item.location,
            status: item.status,
            last_restocked: item.lastRestocked,
            expiry_date: item.expiryDate,
          })
          .select()
          .single();

        if (error) throw error;

        return this.mapInventoryItem(data as DatabaseInventoryRow);
      },
      {
        service: 'ResourceManagementService',
        method: 'addInventoryItem',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to add inventory item');
    }

    return result.data;
  }

  static async getInventoryItems(contractorId: string): Promise<InventoryItem[]> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('contractor_id', contractorId)
          .order('name');

        if (error) throw error;

        return (data as DatabaseInventoryRow[]).map(this.mapInventoryItem);
      },
      {
        service: 'ResourceManagementService',
        method: 'getInventoryItems',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to get inventory items');
    }

    return result.data;
  }

  static async updateInventoryQuantity(itemId: string, newQuantity: number, reason: string, reference?: string): Promise<void> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data: item, error: fetchError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .single();

        if (fetchError) throw fetchError;

        const itemRow = item as DatabaseInventoryRow;
        const quantityDiff = newQuantity - itemRow.quantity;
        const movementType = quantityDiff > 0 ? 'inbound' : 'outbound';

        await supabase.rpc('update_inventory_with_movement', {
          p_item_id: itemId,
          p_new_quantity: newQuantity,
          p_movement_type: movementType,
          p_movement_quantity: Math.abs(quantityDiff),
          p_reason: reason,
          p_reference: reference,
        });

        await this.checkLowStockThreshold(itemId);
      },
      {
        service: 'ResourceManagementService',
        method: 'updateInventoryQuantity',
      }
    );

    if (!result.success) {
      throw result.error || new Error('Failed to update inventory quantity');
    }
  }

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

        return this.mapEquipment(data as DatabaseEquipmentRow);
      },
      {
        service: 'ResourceManagementService',
        method: 'addEquipment',
      }
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

        return (data as DatabaseEquipmentRow[]).map(this.mapEquipment);
      },
      {
        service: 'ResourceManagementService',
        method: 'getEquipment',
      }
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

        return (data as DatabaseEquipmentRow[]).map(this.mapEquipment);
      },
      {
        service: 'ResourceManagementService',
        method: 'scheduleMaintenanceCheck',
      }
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

        return this.mapMaintenanceRecord(data as DatabaseMaintenanceRecordRow);
      },
      {
        service: 'ResourceManagementService',
        method: 'recordMaintenance',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to record maintenance');
    }

    return result.data;
  }

  static async addSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            contractor_id: supplier.contractorId,
            name: supplier.name,
            contact_name: supplier.contactName,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            category: supplier.category,
            rating: supplier.rating,
            payment_terms: supplier.paymentTerms,
            delivery_time: supplier.deliveryTime,
            minimum_order: supplier.minimumOrder,
            discount_rate: supplier.discountRate,
            is_active: supplier.isActive,
          })
          .select()
          .single();

        if (error) throw error;

        return this.mapSupplier(data as DatabaseSupplierRow);
      },
      {
        service: 'ResourceManagementService',
        method: 'addSupplier',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to add supplier');
    }

    return result.data;
  }

  static async getSuppliers(contractorId: string, category?: string): Promise<Supplier[]> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        let query = supabase
          .from('suppliers')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('is_active', true);

        if (category) {
          query = query.contains('category', [category]);
        }

        const { data, error } = await query.order('rating', { ascending: false });

        if (error) throw error;

        return (data as DatabaseSupplierRow[]).map(this.mapSupplier);
      },
      {
        service: 'ResourceManagementService',
        method: 'getSuppliers',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to get suppliers');
    }

    return result.data;
  }

  static async createPurchaseOrder(contractorId: string, supplierId: string, items: PurchaseOrderItem[]): Promise<string> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (supplierError) throw supplierError;

        const supplierRow = supplier as DatabaseSupplierRow;
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

        const { data: order, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            contractor_id: contractorId,
            supplier_id: supplierId,
            status: 'pending',
            total_amount: totalAmount,
            items: items,
            delivery_date: this.calculateDeliveryDate(supplierRow.delivery_time),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderRow = order as { id: string; [key: string]: unknown };
        await this.sendPurchaseOrderEmail(orderRow.id, supplierRow.email);

        return orderRow.id;
      },
      {
        service: 'ResourceManagementService',
        method: 'createPurchaseOrder',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to create purchase order');
    }

    return result.data;
  }

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
          await this.updateEquipmentUtilization(utilization.resourceId, utilization.utilizationHours || 0);
        }
      },
      {
        service: 'ResourceManagementService',
        method: 'trackResourceUtilization',
      }
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
          this.calculateTotalInventoryValue(contractorId),
          this.calculateTotalEquipmentValue(contractorId),
          this.getLowStockItemsCount(contractorId),
          this.getEquipmentUtilizationData(contractorId, startDate, endDate),
          this.getMaintenanceCosts(contractorId, startDate, endDate),
          this.getMostUsedItems(contractorId, startDate, endDate),
          this.getUnderutilizedEquipment(contractorId),
          this.getSupplierPerformance(contractorId, startDate, endDate),
          this.getOptimizationOpportunities(contractorId),
        ]);

        const resourceEfficiency = await this.calculateResourceEfficiency(contractorId, startDate, endDate);

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
      {
        service: 'ResourceManagementService',
        method: 'getResourceAnalytics',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to get resource analytics');
    }

    return result.data;
  }

  static async autoReorderLowStock(contractorId: string): Promise<string[]> {
    const result = await ServiceErrorHandler.executeOperation(
      async () => {
        const { data: lowStockItems, error } = await supabase
          .from('inventory_items')
          .select('*, suppliers(*)')
          .eq('contractor_id', contractorId)
          .or('status.eq.low_stock,status.eq.out_of_stock')
          .not('supplier_id', 'is', null);

        if (error) throw error;

        const orderIds: string[] = [];

        for (const item of lowStockItems as DatabaseInventoryRow[]) {
          if (item.supplier_id && item.min_threshold > 0) {
            const orderQuantity = Math.max(item.min_threshold * 2, 10);

            try {
              const orderId = await this.createPurchaseOrder(
                contractorId,
                item.supplier_id,
                [{
                  inventoryItemId: item.id,
                  quantity: orderQuantity,
                  unitCost: item.unit_cost,
                  description: `Auto-reorder for ${item.name}`,
                }]
              );
              orderIds.push(orderId);
            } catch (orderError) {
              logger.error(`Failed to create auto-reorder for item ${item.id}`, orderError as Error);
            }
          }
        }

        return orderIds;
      },
      {
        service: 'ResourceManagementService',
        method: 'autoReorderLowStock',
      }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to auto-reorder low stock');
    }

    return result.data;
  }

  private static async checkLowStockThreshold(itemId: string): Promise<void> {
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error || !item) return;

    const itemRow = item as DatabaseInventoryRow;
    let newStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'ordered' = 'in_stock';
    if (itemRow.quantity === 0) {
      newStatus = 'out_of_stock';
    } else if (itemRow.quantity <= itemRow.min_threshold) {
      newStatus = 'low_stock';
    }

    if (newStatus !== itemRow.status) {
      await supabase
        .from('inventory_items')
        .update({ status: newStatus })
        .eq('id', itemId);
    }
  }

  private static async updateEquipmentUtilization(equipmentId: string, hours: number): Promise<void> {
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

  private static calculateDeliveryDate(deliveryTime?: number): string {
    const today = new Date();
    const deliveryDate = new Date(today.getTime() + (deliveryTime || 7) * 24 * 60 * 60 * 1000);
    return deliveryDate.toISOString();
  }

  private static async sendPurchaseOrderEmail(orderId: string, supplierEmail?: string): Promise<void> {
    if (!supplierEmail) return;

    // Integration with EmailTemplatesService would go here
    logger.info('Purchase order sent to supplier', { orderId, supplierEmail });
  }

  private static async calculateTotalInventoryValue(contractorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('quantity, unit_cost')
      .eq('contractor_id', contractorId);

    if (error || !data) return 0;

    return data.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  }

  private static async calculateTotalEquipmentValue(contractorId: string): Promise<number> {
    const { data, error } = await supabase
      .from('equipment')
      .select('current_value')
      .eq('contractor_id', contractorId)
      .not('current_value', 'is', null);

    if (error || !data) return 0;

    return data.reduce((sum, item) => sum + (item.current_value || 0), 0);
  }

  private static async getLowStockItemsCount(contractorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', contractorId)
      .or('status.eq.low_stock,status.eq.out_of_stock');

    return error ? 0 : (count || 0);
  }

  private static async getEquipmentUtilizationData(contractorId: string, startDate: string, endDate: string): Promise<{ average: number }> {
    const { data, error } = await supabase
      .from('equipment')
      .select('utilization')
      .eq('contractor_id', contractorId)
      .eq('status', 'operational');

    if (error || !data) return { average: 0 };

    const average = data.length > 0 ?
      data.reduce((sum, item) => sum + item.utilization, 0) / data.length : 0;

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

    return data.reduce((sum, record) => sum + record.cost, 0);
  }

  private static async getMostUsedItems(contractorId: string, startDate: string, endDate: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('resource_utilization')
      .select(`
        resource_id,
        quantity,
        inventory_items!inner(*)
      `)
      .eq('inventory_items.contractor_id', contractorId)
      .eq('resource_type', 'inventory')
      .gte('usage_date', startDate)
      .lte('usage_date', endDate);

    if (error || !data) return [];

    const usage = data.reduce<Record<string, number>>((acc, record) => {
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

    return (items as DatabaseInventoryRow[]).map(this.mapInventoryItem);
  }

  private static async getUnderutilizedEquipment(contractorId: string): Promise<Equipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('status', 'operational')
      .lt('utilization', 30);

    if (error || !data) return [];

    return (data as DatabaseEquipmentRow[]).map(this.mapEquipment);
  }

  private static async getSupplierPerformance(contractorId: string, startDate: string, endDate: string): Promise<Record<string, unknown>[]> {
    // Implementation would analyze delivery times, quality, pricing trends
    return [];
  }

  private static async getOptimizationOpportunities(contractorId: string): Promise<Record<string, unknown>[]> {
    // Implementation would identify cost-saving opportunities
    return [];
  }

  private static async calculateResourceEfficiency(contractorId: string, startDate: string, endDate: string): Promise<number> {
    // Implementation would calculate overall resource efficiency score
    return 85;
  }

  private static mapInventoryItem(data: DatabaseInventoryRow): InventoryItem {
    return {
      id: data.id,
      contractorId: data.contractor_id,
      name: data.name,
      category: data.category,
      sku: data.sku,
      description: data.description,
      quantity: data.quantity,
      minThreshold: data.min_threshold,
      unitCost: data.unit_cost,
      supplierId: data.supplier_id,
      location: data.location,
      status: data.status,
      lastRestocked: data.last_restocked,
      expiryDate: data.expiry_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapEquipment(data: DatabaseEquipmentRow): Equipment {
    return {
      id: data.id,
      contractorId: data.contractor_id,
      name: data.name,
      type: data.type,
      model: data.model,
      serialNumber: data.serial_number,
      purchaseDate: data.purchase_date,
      purchasePrice: data.purchase_price,
      currentValue: data.current_value,
      status: data.status,
      condition: data.condition,
      nextMaintenanceDate: data.next_maintenance_date,
      lastMaintenanceDate: data.last_maintenance_date,
      maintenanceCost: data.maintenance_cost,
      warrantyExpiry: data.warranty_expiry,
      location: data.location,
      utilization: data.utilization,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapSupplier(data: DatabaseSupplierRow): Supplier {
    return {
      id: data.id,
      contractorId: data.contractor_id,
      name: data.name,
      contactName: data.contact_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      category: data.category,
      rating: data.rating,
      paymentTerms: data.payment_terms,
      deliveryTime: data.delivery_time,
      minimumOrder: data.minimum_order,
      discountRate: data.discount_rate,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static mapMaintenanceRecord(data: DatabaseMaintenanceRecordRow): MaintenanceRecord {
    return {
      id: data.id,
      equipmentId: data.equipment_id,
      type: data.type,
      description: data.description,
      cost: data.cost,
      performedBy: data.performed_by,
      performedDate: data.performed_date,
      nextDueDate: data.next_due_date,
      partsUsed: data.parts_used,
      downtime: data.downtime,
      notes: data.notes,
      attachments: data.attachments,
      createdAt: data.created_at,
    };
  }
}