import { InventoryService } from './resource-management/InventoryService';
import { EquipmentService } from './resource-management/EquipmentService';
import { SupplierService } from './resource-management/SupplierService';
import { AnalyticsService } from './resource-management/AnalyticsService';

// Re-export all public types for backward compatibility
export type {
  InventoryItem, Equipment, Supplier, MaintenanceRecord,
  ResourceUtilization, StockMovement, ResourceAnalytics, PurchaseOrderItem,
} from './resource-management/types';

/**
 * ResourceManagementService - Facade that composes inventory, equipment, supplier,
 * and analytics capabilities. Split from 978-line monolith into focused modules.
 */
export class ResourceManagementService {
  static addInventoryItem = InventoryService.addInventoryItem.bind(InventoryService);
  static getInventoryItems = InventoryService.getInventoryItems.bind(InventoryService);
  static updateInventoryQuantity = InventoryService.updateInventoryQuantity.bind(InventoryService);
  static autoReorderLowStock = InventoryService.autoReorderLowStock.bind(InventoryService);

  static addEquipment = EquipmentService.addEquipment.bind(EquipmentService);
  static getEquipment = EquipmentService.getEquipment.bind(EquipmentService);
  static scheduleMaintenanceCheck = EquipmentService.scheduleMaintenanceCheck.bind(EquipmentService);
  static recordMaintenance = EquipmentService.recordMaintenance.bind(EquipmentService);

  static addSupplier = SupplierService.addSupplier.bind(SupplierService);
  static getSuppliers = SupplierService.getSuppliers.bind(SupplierService);
  static createPurchaseOrder = SupplierService.createPurchaseOrder.bind(SupplierService);

  static trackResourceUtilization = AnalyticsService.trackResourceUtilization.bind(AnalyticsService);
  static getResourceAnalytics = AnalyticsService.getResourceAnalytics.bind(AnalyticsService);
}

export default ResourceManagementService;
