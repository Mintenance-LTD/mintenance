import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
import {
  type Supplier,
  type PurchaseOrderItem,
  type DatabaseSupplierRow,
  mapSupplier,
} from './types';

export class SupplierService {
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

        return mapSupplier(data as DatabaseSupplierRow);
      },
      { service: 'SupplierService', method: 'addSupplier' }
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

        return (data as DatabaseSupplierRow[]).map(mapSupplier);
      },
      { service: 'SupplierService', method: 'getSuppliers' }
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
            delivery_date: SupplierService.calculateDeliveryDate(supplierRow.delivery_time),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderRow = order as { id: string; [key: string]: unknown };
        await SupplierService.sendPurchaseOrderEmail(orderRow.id, supplierRow.email);

        return orderRow.id;
      },
      { service: 'SupplierService', method: 'createPurchaseOrder' }
    );

    if (!result.success || !result.data) {
      throw result.error || new Error('Failed to create purchase order');
    }

    return result.data;
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
}
