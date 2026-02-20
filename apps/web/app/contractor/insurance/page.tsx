'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  PoundSterling,
  Phone,
  Mail,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface Insurance {
  id: string;
  type: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premium: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expiring_soon' | 'expired';
  documentUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

interface License {
  id: string;
  name: string;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string | null;
  status: 'active' | 'expiring_soon' | 'expired';
  documentUrl?: string | null;
}

export default function InsuranceLicensingPage() {
  const [activeTab, setActiveTab] = useState<'insurance' | 'licenses'>('insurance');
  const [showAddModal, setShowAddModal] = useState(false);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Insurance form state
  const [insType, setInsType] = useState('');
  const [insProvider, setInsProvider] = useState('');
  const [insPolicyNumber, setInsPolicyNumber] = useState('');
  const [insCoverage, setInsCoverage] = useState('');
  const [insPremium, setInsPremium] = useState('');
  const [insStartDate, setInsStartDate] = useState('');
  const [insExpiryDate, setInsExpiryDate] = useState('');
  const [insContactName, setInsContactName] = useState('');
  const [insContactPhone, setInsContactPhone] = useState('');
  const [insContactEmail, setInsContactEmail] = useState('');

  // License form state
  const [licName, setLicName] = useState('');
  const [licNumber, setLicNumber] = useState('');
  const [licIssuer, setLicIssuer] = useState('');
  const [licIssueDate, setLicIssueDate] = useState('');
  const [licExpiryDate, setLicExpiryDate] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractor/insurance', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInsurances(data.insurances || []);
      setLicenses(data.licenses || []);
    } catch (error) {
      logger.error('Error fetching insurance data:', error, { service: 'app' });
      toast.error('Failed to load insurance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetInsuranceForm = () => {
    setInsType(''); setInsProvider(''); setInsPolicyNumber('');
    setInsCoverage(''); setInsPremium('');
    setInsStartDate(''); setInsExpiryDate('');
    setInsContactName(''); setInsContactPhone(''); setInsContactEmail('');
  };

  const resetLicenseForm = () => {
    setLicName(''); setLicNumber(''); setLicIssuer('');
    setLicIssueDate(''); setLicExpiryDate('');
  };

  const handleAddInsurance = async () => {
    if (!insType.trim() || !insProvider.trim() || !insStartDate || !insExpiryDate) {
      toast.error('Type, provider, start date and expiry date are required');
      return;
    }
    setSubmitting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          itemType: 'insurance',
          type: insType.trim(),
          provider: insProvider.trim(),
          policyNumber: insPolicyNumber.trim() || undefined,
          coverageAmount: insCoverage ? parseFloat(insCoverage) : 0,
          premium: insPremium ? parseFloat(insPremium) : 0,
          startDate: insStartDate,
          expiryDate: insExpiryDate,
          contactName: insContactName.trim() || undefined,
          contactPhone: insContactPhone.trim() || undefined,
          contactEmail: insContactEmail.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add insurance');
      toast.success('Insurance added');
      setShowAddModal(false);
      resetInsuranceForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add insurance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLicense = async () => {
    if (!licName.trim() || !licIssuer.trim() || !licIssueDate) {
      toast.error('Name, issuer and issue date are required');
      return;
    }
    setSubmitting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          itemType: 'license',
          name: licName.trim(),
          number: licNumber.trim() || undefined,
          issuer: licIssuer.trim(),
          issueDate: licIssueDate,
          expiryDate: licExpiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add licence');
      toast.success('Licence added');
      setShowAddModal(false);
      resetLicenseForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add licence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, type: 'insurance' | 'license', label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    if (type === 'insurance') {
      const prev = insurances;
      setInsurances(insurances.filter((i) => i.id !== id));
      try {
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch(`/api/contractor/insurance?id=${id}&type=insurance`, { method: 'DELETE', headers: csrfHeaders, credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        toast.success('Insurance deleted');
      } catch { setInsurances(prev); toast.error('Failed to delete'); }
    } else {
      const prev = licenses;
      setLicenses(licenses.filter((l) => l.id !== id));
      try {
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch(`/api/contractor/insurance?id=${id}&type=license`, { method: 'DELETE', headers: csrfHeaders, credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        toast.success('Licence deleted');
      } catch { setLicenses(prev); toast.error('Failed to delete'); }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const diffMs = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const totalAnnualPremium = useMemo(() =>
    insurances.filter((i) => i.status === 'active').reduce((sum, i) => sum + i.premium, 0),
  [insurances]);

  const totalCoverage = useMemo(() =>
    insurances.filter((i) => i.status === 'active').reduce((sum, i) => sum + i.coverageAmount, 0),
  [insurances]);

  if (loading) {
    return (
      <div className="min-h-0 bg-gray-50 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Header */}
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Insurance & Licensing</h1>
              <p className="text-gray-600 mt-1">Manage your business insurance and professional licences</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
              <Plus className="w-5 h-5" />
              Add {activeTab === 'insurance' ? 'Insurance' : 'Licence'}
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <MotionDiv variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <Shield className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Total Coverage</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{totalCoverage > 1000000 ? `${(totalCoverage / 1000000).toFixed(1)}M` : totalCoverage.toLocaleString()}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <PoundSterling className="w-5 h-5 text-teal-600 mb-2" />
            <p className="text-sm text-gray-600">Annual Premium</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{totalAnnualPremium.toLocaleString()}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <p className="text-2xl font-bold text-gray-900">{insurances.filter((i) => i.status === 'expiring_soon').length}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <FileText className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Active Licences</p>
            <p className="text-2xl font-bold text-gray-900">{licenses.filter((l) => l.status === 'active').length}</p>
          </MotionDiv>
        </MotionDiv>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {(['insurance', 'licenses'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 border-b-2 font-medium transition-colors ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Insurance Tab */}
            {activeTab === 'insurance' && (
              <div className="space-y-6">
                {insurances.length === 0 && (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No insurance policies</h3>
                    <p className="text-gray-600">Add your first insurance policy to track coverage</p>
                  </div>
                )}
                {insurances.map((ins) => {
                  const daysUntilExpiry = calculateDaysUntilExpiry(ins.expiryDate);
                  return (
                    <MotionDiv key={ins.id} variants={staggerItem} className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Shield className="w-6 h-6 text-teal-600" />
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900">{ins.type}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ins.status)}`}>
                                  {ins.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{ins.provider}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Policy Number</p>
                              <p className="font-medium text-gray-900">{ins.policyNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Coverage</p>
                              <p className="font-medium text-gray-900">{'\u00A3'}{ins.coverageAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Annual Premium</p>
                              <p className="font-medium text-gray-900">{'\u00A3'}{ins.premium.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Start Date</p>
                              <p className="font-medium text-gray-900">{new Date(ins.startDate).toLocaleDateString('en-GB')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                              <p className="font-medium text-gray-900">
                                {new Date(ins.expiryDate).toLocaleDateString('en-GB')}
                                {daysUntilExpiry > 0 && daysUntilExpiry <= 90 && (
                                  <span className="ml-2 text-xs text-yellow-600">({daysUntilExpiry} days)</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {ins.contactName && (
                            <div className="pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">Contact Information</p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-gray-700"><FileText className="w-4 h-4 text-gray-400" />{ins.contactName}</span>
                                {ins.contactPhone && <span className="flex items-center gap-1.5 text-gray-700"><Phone className="w-4 h-4 text-gray-400" />{ins.contactPhone}</span>}
                                {ins.contactEmail && <span className="flex items-center gap-1.5 text-gray-700"><Mail className="w-4 h-4 text-gray-400" />{ins.contactEmail}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDelete(ins.id, 'insurance', ins.type)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </MotionDiv>
                  );
                })}
              </div>
            )}

            {/* Licenses Tab */}
            {activeTab === 'licenses' && (
              <div className="space-y-6">
                {licenses.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No licences</h3>
                    <p className="text-gray-600">Add your professional licences and certifications</p>
                  </div>
                )}
                {licenses.map((lic) => {
                  const daysUntilExpiry = lic.expiryDate ? calculateDaysUntilExpiry(lic.expiryDate) : null;
                  return (
                    <MotionDiv key={lic.id} variants={staggerItem} className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900">{lic.name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lic.status)}`}>
                                  {lic.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{lic.issuer}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Licence Number</p>
                              <p className="font-medium text-gray-900">{lic.number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Issue Date</p>
                              <p className="font-medium text-gray-900">{new Date(lic.issueDate).toLocaleDateString('en-GB')}</p>
                            </div>
                            {lic.expiryDate && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                                <p className="font-medium text-gray-900">
                                  {new Date(lic.expiryDate).toLocaleDateString('en-GB')}
                                  {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90 && (
                                    <span className="ml-2 text-xs text-yellow-600">({daysUntilExpiry} days)</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(lic.id, 'license', lic.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </MotionDiv>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Add {activeTab === 'insurance' ? 'Insurance' : 'Licence'}
              </h3>
              <button onClick={() => { setShowAddModal(false); resetInsuranceForm(); resetLicenseForm(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            {activeTab === 'insurance' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Type *</label>
                  <input type="text" value={insType} onChange={(e) => setInsType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Public Liability Insurance" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
                  <input type="text" value={insProvider} onChange={(e) => setInsProvider(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Simply Business" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                  <input type="text" value={insPolicyNumber} onChange={(e) => setInsPolicyNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coverage ({'\u00A3'})</label>
                    <input type="number" min="0" value={insCoverage} onChange={(e) => setInsCoverage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Premium ({'\u00A3'})</label>
                    <input type="number" min="0" value={insPremium} onChange={(e) => setInsPremium(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input type="date" value={insStartDate} onChange={(e) => setInsStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                    <input type="date" value={insExpiryDate} onChange={(e) => setInsExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" value={insContactName} onChange={(e) => setInsContactName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input type="tel" value={insContactPhone} onChange={(e) => setInsContactPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input type="email" value={insContactEmail} onChange={(e) => setInsContactEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowAddModal(false); resetInsuranceForm(); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                  <button onClick={handleAddInsurance} disabled={submitting} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Insurance
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Licence Name *</label>
                  <input type="text" value={licName} onChange={(e) => setLicName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Gas Safe Register" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Licence Number</label>
                  <input type="text" value={licNumber} onChange={(e) => setLicNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuer *</label>
                  <input type="text" value={licIssuer} onChange={(e) => setLicIssuer(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Gas Safe Register" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                    <input type="date" value={licIssueDate} onChange={(e) => setLicIssueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input type="date" value={licExpiryDate} onChange={(e) => setLicExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowAddModal(false); resetLicenseForm(); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                  <button onClick={handleAddLicense} disabled={submitting} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Licence
                  </button>
                </div>
              </div>
            )}
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
