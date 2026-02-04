/**
 * Materials Database Types
 * Phase 2: Material Cost Tracking
 */

/**
 * Material category types matching UK construction industry standards
 */
export type MaterialCategory =
  | 'lumber'      // Timber, plywood, MDF
  | 'concrete'    // Cement, sand, aggregates
  | 'brick'       // Bricks, blocks, mortar
  | 'tile'        // Ceramic, porcelain, stone tiles
  | 'insulation'  // Loft, cavity wall, pipe insulation
  | 'drywall'     // Plasterboard, joint compound, beading
  | 'paint'       // Emulsion, masonry, primer, woodwork
  | 'roofing'     // Tiles, felt, ridge, flashing
  | 'plumbing'    // Pipes, fittings, radiators, taps
  | 'electrical'  // Cable, sockets, switches, consumer units
  | 'hardware'    // Screws, nails, brackets, hinges
  | 'glass'       // Windows, double glazing, mirrors
  | 'sealants'    // Silicone, mastic, foam, tape
  | 'fasteners'   // Bolts, wall plugs, anchors
  | 'other';      // Miscellaneous materials

/**
 * Material unit types for pricing and quantities
 */
export type MaterialUnit =
  | 'each'    // Individual items
  | 'meter'   // Linear meters
  | 'sqm'     // Square meters
  | 'liter'   // Litres (paint, sealants)
  | 'kg'      // Kilograms (dry goods)
  | 'bundle'  // Bundled items
  | 'box'     // Boxed quantities
  | 'sqft'    // Square feet
  | 'sheet';  // Sheet materials

/**
 * Material specifications - flexible attributes
 * Examples: {color: "White", finish: "Matt", coverage: "12m² per litre"}
 */
export type MaterialSpecifications = Record<string, string | number | boolean>;

/**
 * Complete material record from database
 */
export interface Material {
  id: string;

  // Core Information
  name: string;
  category: MaterialCategory;
  description?: string;

  // Pricing
  unit_price: number;
  unit: MaterialUnit;
  bulk_quantity?: number;
  bulk_unit_price?: number;

  // Product Identification
  sku?: string;
  barcode?: string;
  brand?: string;

  // Availability
  in_stock: boolean;
  stock_quantity?: number;
  lead_time_days: number;

  // Additional Data
  specifications: MaterialSpecifications;
  image_url?: string;
  supplier_name?: string;
  supplier_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Material creation payload (subset of Material for INSERT operations)
 */
export interface CreateMaterialInput {
  name: string;
  category: MaterialCategory;
  description?: string;
  unit_price: number;
  unit: MaterialUnit;
  bulk_quantity?: number;
  bulk_unit_price?: number;
  sku?: string;
  barcode?: string;
  brand?: string;
  in_stock?: boolean;
  stock_quantity?: number;
  lead_time_days?: number;
  specifications?: MaterialSpecifications;
  image_url?: string;
  supplier_name?: string;
  supplier_id?: string;
}

/**
 * Material update payload (partial Material for UPDATE operations)
 */
export type UpdateMaterialInput = Partial<Omit<Material, 'id' | 'created_at' | 'updated_at' | 'created_by'>>;

/**
 * Material query filters for GET requests
 */
export interface MaterialQueryFilters {
  category?: MaterialCategory;
  in_stock?: boolean;
  supplier_id?: string;
  search?: string; // Name search
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'unit_price' | 'created_at' | 'category';
  sort_order?: 'asc' | 'desc';
}

/**
 * Materials list response with pagination
 */
export interface MaterialsListResponse {
  materials: Material[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Human-readable material category labels
 */
export const MaterialCategoryLabels: Record<MaterialCategory, string> = {
  lumber: 'Timber & Wood Products',
  concrete: 'Concrete & Aggregates',
  brick: 'Bricks & Blocks',
  tile: 'Tiles & Flooring',
  insulation: 'Insulation Materials',
  drywall: 'Plasterboard & Drywall',
  paint: 'Paints & Coatings',
  roofing: 'Roofing Materials',
  plumbing: 'Plumbing Supplies',
  electrical: 'Electrical Components',
  hardware: 'Hardware & Fixings',
  glass: 'Glass & Glazing',
  sealants: 'Sealants & Adhesives',
  fasteners: 'Fasteners & Fixings',
  other: 'Other Materials',
};

/**
 * Human-readable material unit labels
 */
export const MaterialUnitLabels: Record<MaterialUnit, string> = {
  each: 'Each',
  meter: 'Meter (m)',
  sqm: 'Square Meter (m²)',
  liter: 'Litre (L)',
  kg: 'Kilogram (kg)',
  bundle: 'Bundle',
  box: 'Box',
  sqft: 'Square Foot (ft²)',
  sheet: 'Sheet',
};

/**
 * Helper function to format price with currency
 */
export function formatMaterialPrice(price: number, currency = '£'): string {
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Helper function to format unit price display
 */
export function formatMaterialUnitPrice(material: Material): string {
  const price = formatMaterialPrice(material.unit_price);
  const unit = MaterialUnitLabels[material.unit];
  return `${price} per ${unit}`;
}

/**
 * Helper function to calculate effective unit price (considering bulk discounts)
 */
export function getEffectiveUnitPrice(material: Material, quantity: number): number {
  if (
    material.bulk_quantity &&
    material.bulk_unit_price &&
    quantity >= material.bulk_quantity
  ) {
    return material.bulk_unit_price;
  }
  return material.unit_price;
}

/**
 * Helper function to calculate total cost
 */
export function calculateMaterialCost(material: Material, quantity: number): number {
  const effectivePrice = getEffectiveUnitPrice(material, quantity);
  return effectivePrice * quantity;
}
