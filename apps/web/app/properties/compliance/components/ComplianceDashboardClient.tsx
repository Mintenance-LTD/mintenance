'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  Upload,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building2,
  FileText,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface ComplianceCert {
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
}

interface PropertyWithCompliance {
  id: string;
  property_name: string;
  address: string;
  certMap: Record<string, ComplianceCert | null>;
  additionalCerts: ComplianceCert[];
  overallStatus: string;
  certCount: number;
}

interface ComplianceSummary {
  totalProperties: number;
  totalCerts: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  missingCount: number;
}

interface Props {
  properties: PropertyWithCompliance[];
  summary: ComplianceSummary;
}

// ── Constants ────────────────────────────────────────────────────────

const CERT_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety (CP12)',
  eicr: 'EICR',
  epc: 'EPC',
  smoke_alarm: 'Smoke Alarms',
  co_detector: 'CO Detector',
};

const CERT_DESCRIPTIONS: Record<string, string> = {
  gas_safety: 'Annual gas safety check by Gas Safe engineer',
  eicr: 'Electrical Installation Condition Report (every 5 years)',
  epc: 'Energy Performance Certificate (valid 10 years)',
  smoke_alarm: 'Working smoke alarms on every floor',
  co_detector: 'CO detector in rooms with solid fuel appliance',
};

// ── Helpers ──────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusColor(status: string) {
  switch (status) {
    case 'valid': return 'text-green-700 bg-green-50 border-green-200';
    case 'expiring': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'expired': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'valid': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'expiring': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case 'expired': return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
  }
}

function overallBadge(status: string) {
  switch (status) {
    case 'green': return { label: 'Compliant', className: 'bg-green-100 text-green-800' };
    case 'amber': return { label: 'Action Needed', className: 'bg-amber-100 text-amber-800' };
    case 'red': return { label: 'Non-Compliant', className: 'bg-red-100 text-red-800' };
    default: return { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
  }
}

// ── Component ────────────────────────────────────────────────────────

export function ComplianceDashboardClient({ properties, summary }: Props) {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null
  );

  const toggleExpand = (id: string) => {
    setExpandedProperty(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Track gas safety, electrical, EPC and other compliance certificates across your properties.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          label="Properties"
          value={summary.totalProperties}
          bgColor="bg-blue-50"
        />
        <SummaryCard
          icon={<ShieldCheck className="w-5 h-5 text-green-600" />}
          label="Valid"
          value={summary.validCount}
          bgColor="bg-green-50"
        />
        <SummaryCard
          icon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
          label="Expiring Soon"
          value={summary.expiringCount}
          bgColor="bg-amber-50"
        />
        <SummaryCard
          icon={<ShieldX className="w-5 h-5 text-red-600" />}
          label="Expired / Missing"
          value={summary.expiredCount + summary.missingCount}
          bgColor="bg-red-50"
        />
      </div>

      {/* Empty State */}
      {properties.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
          <p className="text-gray-500 mb-6">Add a property to start tracking compliance certificates.</p>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Properties
          </Link>
        </div>
      )}

      {/* Property Cards */}
      <div className="space-y-4">
        {properties.map(property => {
          const isExpanded = expandedProperty === property.id;
          const badge = overallBadge(property.overallStatus);

          return (
            <div
              key={property.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Property Header */}
              <button
                type="button"
                onClick={() => toggleExpand(property.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {property.property_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{property.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {property.certCount}/5
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Certificate Grid */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(CERT_LABELS).map(([type, label]) => {
                      const cert = property.certMap[type];
                      const days = cert ? daysUntil(cert.expiry_date) : null;

                      return (
                        <div
                          key={type}
                          className={`rounded-lg border p-4 ${cert ? statusColor(cert.status) : 'bg-gray-50 border-gray-200 border-dashed'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {cert ? statusIcon(cert.status) : <HelpCircle className="w-4 h-4 text-gray-400" />}
                              <span className="font-medium text-sm">{label}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 mb-3">
                            {CERT_DESCRIPTIONS[type]}
                          </p>

                          {cert ? (
                            <div className="space-y-1">
                              {cert.expiry_date && (
                                <p className="text-xs">
                                  <span className="text-gray-500">Expires:</span>{' '}
                                  <span className="font-medium">
                                    {new Date(cert.expiry_date).toLocaleDateString('en-GB', {
                                      day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                  </span>
                                  {days !== null && (
                                    <span className={`ml-1 ${days <= 0 ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                                      ({days <= 0 ? 'EXPIRED' : `${days}d left`})
                                    </span>
                                  )}
                                </p>
                              )}
                              {cert.issuer_name && (
                                <p className="text-xs text-gray-500">
                                  By: {cert.issuer_name}
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                {cert.document_url && (
                                  <a
                                    href={cert.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/80 rounded border border-current/20 hover:bg-white transition-colors"
                                  >
                                    <FileText className="w-3 h-3" />
                                    View
                                  </a>
                                )}
                                {(cert.status === 'expired' || cert.status === 'expiring') && (
                                  <Link
                                    href={`/jobs/create?property=${property.id}&category=${type}`}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/80 rounded border border-current/20 hover:bg-white transition-colors"
                                  >
                                    <Wrench className="w-3 h-3" />
                                    Book Renewal
                                  </Link>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-3">No certificate uploaded</p>
                              <Link
                                href={`/api/properties/${property.id}/compliance?action=upload&type=${type}`}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Upload className="w-3 h-3" />
                                Upload Certificate
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Certs */}
                  {property.additionalCerts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Certificates</h4>
                      <div className="space-y-2">
                        {property.additionalCerts.map(cert => (
                          <div key={cert.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {statusIcon(cert.status)}
                              <span className="capitalize">{cert.cert_type.replace(/_/g, ' ')}</span>
                            </div>
                            {cert.expiry_date && (
                              <span className="text-xs text-gray-500">
                                Expires {new Date(cert.expiry_date).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-gray-100`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
