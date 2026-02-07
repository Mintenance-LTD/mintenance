'use client';

import { Shield, CheckCircle, AlertTriangle, X, Download, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  documentUrl?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  verified: boolean;
  category: string;
}

interface CertificationCardProps {
  cert: Certification;
  onDelete: (id: string, name: string) => void;
}

function getStatusColor(status: Certification['status']) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'expiring_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'expired': return 'bg-red-100 text-red-800 border-red-200';
  }
}

function calculateDaysUntilExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function CertificationCard({ cert, onDelete }: CertificationCardProps) {
  const daysUntilExpiry = calculateDaysUntilExpiry(cert.expiryDate);

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                {cert.verified && <CheckCircle className="w-5 h-5 text-green-600" />}
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(cert.status)}`}>
                  {cert.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{cert.issuer}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="text-gray-500">Issue Date: </span>
                  <span className="font-medium text-gray-900">{new Date(cert.issueDate).toLocaleDateString('en-GB')}</span>
                </div>
                {cert.expiryDate && (
                  <div>
                    <span className="text-gray-500">Expiry Date: </span>
                    <span className="font-medium text-gray-900">{new Date(cert.expiryDate).toLocaleDateString('en-GB')}</span>
                    {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                      <span className="ml-2 text-xs text-gray-500">({daysUntilExpiry} days)</span>
                    )}
                  </div>
                )}
                {cert.credentialId && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Credential ID: </span>
                    <span className="font-medium text-gray-900">{cert.credentialId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cert.documentUrl && (
            <button onClick={() => toast.success('Downloading certificate...')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Download className="w-4 h-4" />Download
            </button>
          )}
          <button onClick={() => toast.success('Edit functionality coming soon')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Edit className="w-4 h-4" />Edit
          </button>
          <button onClick={() => onDelete(cert.id, cert.name)} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
            <Trash2 className="w-4 h-4" />Delete
          </button>
        </div>
      </div>
    </div>
  );
}
