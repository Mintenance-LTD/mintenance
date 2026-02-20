'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  Package,
  Hammer,
  PoundSterling,
  Loader2,
  X,
} from 'lucide-react';
import { DonutChart, BarChart } from '@tremor/react';
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

interface ToolItem {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice: number;
  currentValue: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location: string;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  warrantyExpiry?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'power_tools', label: 'Power Tools' },
  { value: 'hand_tools', label: 'Hand Tools' },
  { value: 'electrical', label: 'Electrical Equipment' },
  { value: 'plumbing', label: 'Plumbing Equipment' },
  { value: 'safety', label: 'Safety Equipment' },
  { value: 'measuring', label: 'Measuring Tools' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

export default function ToolsEquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('hand_tools');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [formCondition, setFormCondition] = useState('good');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contractor/tools', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tools');
      const data = await res.json();
      setTools(data.tools || []);
    } catch (error) {
      logger.error('Error fetching tools:', error, { service: 'app' });
      toast.error('Failed to load tools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const resetForm = () => {
    setFormName('');
    setFormCategory('hand_tools');
    setFormManufacturer('');
    setFormModel('');
    setFormSerialNumber('');
    setFormPurchasePrice('');
    setFormCurrentValue('');
    setFormCondition('good');
    setFormLocation('');
    setFormNotes('');
  };

  const handleAddTool = async () => {
    if (!formName.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/contractor/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory,
          manufacturer: formManufacturer.trim(),
          model: formModel.trim(),
          serialNumber: formSerialNumber.trim() || undefined,
          purchasePrice: formPurchasePrice ? parseFloat(formPurchasePrice) : 0,
          currentValue: formCurrentValue ? parseFloat(formCurrentValue) : (formPurchasePrice ? parseFloat(formPurchasePrice) : 0),
          condition: formCondition,
          location: formLocation.trim(),
          notes: formNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add tool');
      toast.success('Tool added');
      setShowAddModal(false);
      resetForm();
      fetchTools();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add tool');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTool = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    const prev = tools;
    setTools(tools.filter((t) => t.id !== id));
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/tools?id=${id}`, {
        method: 'DELETE',
        headers: csrfHeaders,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Tool deleted');
    } catch {
      setTools(prev);
      toast.error('Failed to delete tool');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_use': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const stats = useMemo(() => {
    const totalValue = tools.reduce((sum, t) => sum + t.currentValue, 0);
    const available = tools.filter((t) => t.status === 'available').length;
    const maintenance = tools.filter((t) => t.status === 'maintenance').length;
    return { totalItems: tools.length, totalValue, available, maintenance };
  }, [tools]);

  const valueByCategory = useMemo(() => {
    const grouped = tools.reduce((acc, tool) => {
      const cat = CATEGORIES.find((c) => c.value === tool.category)?.label || 'Other';
      acc[cat] = (acc[cat] || 0) + tool.currentValue;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([category, value]) => ({
      category,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [tools]);

  const maintenanceDue = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return tools.filter((tool) => {
      if (!tool.nextMaintenanceDate) return false;
      return new Date(tool.nextMaintenanceDate) <= thirtyDaysFromNow;
    });
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch = searchQuery === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || tool.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [tools, searchQuery, selectedCategory, selectedStatus]);

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
              <h1 className="text-3xl font-bold text-gray-900">Tools & Equipment</h1>
              <p className="text-gray-600 mt-1">Track and manage your tool inventory</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Tool
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <Package className="w-5 h-5 text-teal-600 mb-2" />
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <PoundSterling className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">{'\u00A3'}{stats.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <CheckCircle className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl border border-gray-200 p-5">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="text-sm text-gray-600">Maintenance Due</p>
            <p className="text-2xl font-bold text-gray-900">{maintenanceDue.length}</p>
          </MotionDiv>
        </MotionDiv>

        {/* Maintenance Alert */}
        {maintenanceDue.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Maintenance Required</h3>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {maintenanceDue.map((tool) => (
                    <li key={tool.id}>
                      {tool.name} - Due {tool.nextMaintenanceDate && new Date(tool.nextMaintenanceDate).toLocaleDateString('en-GB')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {tools.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Value by Category</h3>
              <DonutChart
                data={valueByCategory}
                category="value"
                index="category"
                valueFormatter={(value) => `\u00A3${value.toLocaleString()}`}
                colors={['teal', 'blue', 'green', 'purple', 'orange']}
                className="h-60"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Status</h3>
              <BarChart
                data={[
                  { status: 'Available', count: stats.available },
                  { status: 'In Use', count: tools.filter((t) => t.status === 'in_use').length },
                  { status: 'Maintenance', count: stats.maintenance },
                  { status: 'Retired', count: tools.filter((t) => t.status === 'retired').length },
                ]}
                index="status"
                categories={['count']}
                colors={['teal']}
                valueFormatter={(value) => `${value} items`}
                className="h-60"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Tool Cards */}
          <div className="space-y-4">
            {filteredTools.map((tool) => (
              <div key={tool.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Hammer className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(tool.status)}`}>
                          {tool.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {tool.manufacturer} {tool.model}
                        {tool.serialNumber && ` \u2022 SN: ${tool.serialNumber}`}
                      </p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <span className="text-gray-500">Condition: <span className={`font-medium ${getConditionColor(tool.condition)}`}>{tool.condition.charAt(0).toUpperCase() + tool.condition.slice(1)}</span></span>
                        {tool.location && <span className="text-gray-500">Location: <span className="font-medium text-gray-900">{tool.location}</span></span>}
                        <span className="text-gray-500">Value: <span className="font-medium text-gray-900">{'\u00A3'}{tool.currentValue.toFixed(2)}</span></span>
                        {tool.nextMaintenanceDate && <span className="text-gray-500">Next Service: <span className="font-medium text-gray-900">{new Date(tool.nextMaintenanceDate).toLocaleDateString('en-GB')}</span></span>}
                      </div>
                      {tool.notes && <p className="text-sm text-gray-600 mt-2 italic">{tool.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTool(tool.id, tool.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tools found</h3>
                <p className="text-gray-600">
                  {tools.length === 0 ? 'Add your first tool to get started' : 'Try adjusting your filters'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Tool</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Cordless Drill Set" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select value={formCondition} onChange={(e) => setFormCondition(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input type="text" value={formManufacturer} onChange={(e) => setFormManufacturer(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. DeWalt" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input type="text" value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. DCD796" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input type="text" value={formSerialNumber} onChange={(e) => setFormSerialNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ({'\u00A3'})</label>
                  <input type="number" step="0.01" min="0" value={formPurchasePrice} onChange={(e) => setFormPurchasePrice(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Value ({'\u00A3'})</label>
                  <input type="number" step="0.01" min="0" value={formCurrentValue} onChange={(e) => setFormCurrentValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Van Storage" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
              <button onClick={handleAddTool} disabled={submitting} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Tool
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
