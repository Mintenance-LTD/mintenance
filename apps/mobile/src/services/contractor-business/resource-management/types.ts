// Database row interfaces (internal - match DB column names)
export interface DatabaseInventoryRow {
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

export interface DatabaseEquipmentRow {
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

export interface DatabaseSupplierRow {
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

export interface DatabaseMaintenanceRecordRow {
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

export interface PurchaseOrderItem {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  description: string;
}

// Application-level interfaces (camelCase)
export interface InventoryItem {
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

export interface Equipment {
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

export interface Supplier {
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

export interface ResourceUtilization {
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

export interface StockMovement {
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

export interface MaintenanceRecord {
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

export interface ResourceAnalytics {
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

// Mapper functions (DB row → application type)
export function mapInventoryItem(data: DatabaseInventoryRow): InventoryItem {
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

export function mapEquipment(data: DatabaseEquipmentRow): Equipment {
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

export function mapSupplier(data: DatabaseSupplierRow): Supplier {
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

export function mapMaintenanceRecord(data: DatabaseMaintenanceRecordRow): MaintenanceRecord {
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
