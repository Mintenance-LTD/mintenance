import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
import {
  type InventoryItem,
  type PurchaseOrderItem,
  type DatabaseInventoryRow,
  mapInventoryItem,
} from './types';
import { SupplierService } from './SupplierService';

export class InventoryService {
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

        return mapInventoryItem(data as DatabaseInventoryRow);
      },
      { service: 'InventoryService', method: 'addInventoryItem' }
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

        return (data as DatabaseInventoryRow[]).map(mapInventoryItem);
      },
      { service: 'InventoryService', method: 'getInventoryItems' }
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

        await InventoryService.checkLowStockThreshold(itemId);
      },
      { service: 'InventoryService', method: 'updateInventoryQuantity' }
    );

    if (!result.success) {
      throw result.error || new Error('Failed to update inventory quantity');
    }
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
            const orderItem: PurchaseOrderItem = {
              inventoryItemId: item.id,
              quantity: orderQuantity,
              unitCost: item.unit_cost,
              description: `Auto-reorder for ${item.name}`,
            };

            try {
              const orderId = await SupplierService.createPurchaseOrder(
                contractorId,
                item.supplier_id,
                [orderItem]
              );
              orderIds.push(orderId);
            } catch (orderError) {
              logger.error(`Failed to create auto-reorder for item ${item.id}`, orderError as Error);
            }
          }
        }

        return orderIds;
      },
      { service: 'InventoryService', method: 'autoReorderLowStock' }
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
}
