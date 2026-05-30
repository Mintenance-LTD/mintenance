/**
 * Shared types for the compliance dashboard.
 *
 * Extracted from ComplianceDashboardClient.tsx 2026-05-21 to keep the
 * client component under the 500-line pre-commit budget after adding
 * Property Rooms Slice 4 (`property_room` link on each cert).
 */

export interface ComplianceCert {
  id: string;
  property_id: string;
  cert_type: string;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  issuer_name: string | null;
  status: string;
  document_url: string | null;
  renewal_job_id: string | null;
  // Property Rooms Slice 4: optional link to a specific room
  // ("EICR for kitchen sub-circuit"). Joined in the compliance API
  // response when present.
  property_room_id?: string | null;
  property_room?: {
    id: string;
    name: string;
    room_type: string;
  } | null;
}

export interface PropertyWithCompliance {
  id: string;
  property_name: string;
  address: string;
  certMap: Record<string, ComplianceCert | null>;
  additionalCerts: ComplianceCert[];
  overallStatus: string;
  certCount: number;
}

export interface ComplianceSummary {
  totalProperties: number;
  totalCerts: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  missingCount: number;
}
