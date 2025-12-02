'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  TrendingUp,
  Package,
  Hammer,
  Image as ImageIcon,
} from 'lucide-react';
import { DonutChart, BarChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
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
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
  imageUrl?: string;
  notes?: string;
}

export default function ToolsEquipmentPage2025() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [tools, setTools] = useState<ToolItem[]>([
    {
      id: '1',
      name: 'Cordless Drill Set',
      category: 'power_tools',
      manufacturer: 'DeWalt',
      model: 'DCD796',
      serialNumber: 'DW123456789',
      purchaseDate: '2023-03-15',
      purchasePrice: 180,
      currentValue: 140,
      condition: 'excellent',
      status: 'available',
      location: 'Van Storage',
      lastMaintenanceDate: '2024-12-01',
      nextMaintenanceDate: '2025-06-01',
      warrantyExpiry: '2026-03-15',
    },
    {
      id: '2',
      name: 'Pipe Threading Machine',
      category: 'plumbing',
      manufacturer: 'Ridgid',
      model: '700',
      serialNumber: 'RG987654321',
      purchaseDate: '2020-08-10',
      purchasePrice: 1200,
      currentValue: 800,
      condition: 'good',
      status: 'in_use',
      location: 'Job Site - Bathroom Remodel',
      lastMaintenanceDate: '2024-11-15',
      nextMaintenanceDate: '2025-05-15',
    },
    {
      id: '3',
      name: 'Multimeter',
      category: 'electrical',
      manufacturer: 'Fluke',
      model: '87V',
      serialNumber: 'FL456789123',
      purchaseDate: '2022-05-20',
      purchasePrice: 350,
      currentValue: 280,
      condition: 'excellent',
      status: 'available',
      location: 'Workshop',
      lastMaintenanceDate: '2025-01-10',
      nextMaintenanceDate: '2026-01-10',
      warrantyExpiry: '2025-05-20',
    },
    {
      id: '4',
      name: 'Ladder - 8ft Extension',
      category: 'safety',
      manufacturer: 'Werner',
      model: 'D6228-2',
      purchaseDate: '2021-02-01',
      purchasePrice: 180,
      currentValue: 120,
      condition: 'good',
      status: 'available',
      location: 'Van Storage',
      lastMaintenanceDate: '2024-09-01',
      nextMaintenanceDate: '2025-03-01',
    },
    {
      id: '5',
      name: 'Circular Saw',
      category: 'power_tools',
      manufacturer: 'Makita',
      model: 'HS7601',
      serialNumber: 'MK789456123',
      purchaseDate: '2019-11-15',
      purchasePrice: 150,
      currentValue: 75,
      condition: 'fair',
      status: 'maintenance',
      location: 'Workshop - Repair',
      notes: 'Blade needs replacement, motor servicing required',
    },
  ]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'power_tools', label: 'Power Tools' },
    { value: 'hand_tools', label: 'Hand Tools' },
    { value: 'electrical', label: 'Electrical Equipment' },
    { value: 'plumbing', label: 'Plumbing Equipment' },
    { value: 'safety', label: 'Safety Equipment' },
    { value: 'measuring', label: 'Measuring Tools' },
  ];

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'available', label: 'Available' },
    { value: 'in_use', label: 'In Use' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
  ];

  const getStatusColor = (status: ToolItem['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_use':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionColor = (condition: ToolItem['condition']) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = tools.reduce((sum, t) => sum + t.currentValue, 0);
    const totalPurchasePrice = tools.reduce((sum, t) => sum + t.purchasePrice, 0);
    const depreciation = totalPurchasePrice - totalValue;

    const available = tools.filter((t) => t.status === 'available').length;
    const inUse = tools.filter((t) => t.status === 'in_use').length;
    const maintenance = tools.filter((t) => t.status === 'maintenance').length;

    return {
      totalItems: tools.length,
      totalValue,
      depreciation,
      available,
      inUse,
      maintenance,
    };
  }, [tools]);

  // Value by category
  const valueByCategory = useMemo(() => {
    const grouped = tools.reduce((acc, tool) => {
      const cat = categories.find((c) => c.value === tool.category)?.label || 'Other';
      acc[cat] = (acc[cat] || 0) + tool.currentValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([category, value]) => ({
      category,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [tools]);

  // Items needing maintenance
  const maintenanceDue = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return tools.filter((tool) => {
      if (!tool.nextMaintenanceDate) return false;
      const nextDate = new Date(tool.nextMaintenanceDate);
      return nextDate <= thirtyDaysFromNow;
    });
  }, [tools]);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || tool.category === selectedCategory;

    const matchesStatus = selectedStatus === 'all' || tool.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDeleteTool = (id: string, name: string) => {
    if (confirm(`Delete "${name}" from inventory?`)) {
      setTools(tools.filter((t) => t.id !== id));
      toast.success('Tool deleted');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 to-red-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Tools & Equipment</h1>
              <p className="text-emerald-100">
                Track and manage your tool inventory
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Tool
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Available</p>
            <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Maintenance Due</p>
            <p className="text-2xl font-bold text-gray-900">{maintenanceDue.length}</p>
          </MotionDiv>
        </MotionDiv>

        {/* Maintenance Alert */}
        {maintenanceDue.length > 0 && (
          <MotionDiv
            variants={fadeIn}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Maintenance Required
                </h3>
                <p className="text-yellow-800 text-sm mb-3">
                  {maintenanceDue.length} tool(s) need maintenance within the next 30 days:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {maintenanceDue.map((tool) => (
                    <li key={tool.id}>
                      {tool.name} - Due{' '}
                      {tool.nextMaintenanceDate &&
                        new Date(tool.nextMaintenanceDate).toLocaleDateString('en-GB')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Value by Category */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Value by Category
            </h3>
            <DonutChart
              data={valueByCategory}
              category="value"
              index="category"
              valueFormatter={(value) => `£${value.toLocaleString()}`}
              colors={['orange', 'blue', 'green', 'purple', 'red']}
              className="h-72"
            />
          </MotionDiv>

          {/* Status Distribution */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Equipment Status
            </h3>
            <BarChart
              data={[
                { status: 'Available', count: stats.available },
                { status: 'In Use', count: stats.inUse },
                { status: 'Maintenance', count: stats.maintenance },
              ]}
              index="status"
              categories={['count']}
              colors={['orange']}
              valueFormatter={(value) => `${value} items`}
              className="h-72"
            />
          </MotionDiv>
        </div>

        {/* Tool List */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Inventory</h3>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tool Cards */}
          <div className="space-y-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Hammer className="w-8 h-8 text-gray-400" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              tool.status
                            )}`}
                          >
                            {tool.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {tool.manufacturer} {tool.model}
                          {tool.serialNumber && ` • SN: ${tool.serialNumber}`}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Condition: </span>
                            <span className={`font-medium ${getConditionColor(tool.condition)}`}>
                              {tool.condition.charAt(0).toUpperCase() + tool.condition.slice(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Location: </span>
                            <span className="font-medium text-gray-900">{tool.location}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Value: </span>
                            <span className="font-medium text-gray-900">
                              £{tool.currentValue.toFixed(2)}
                            </span>
                          </div>
                          {tool.nextMaintenanceDate && (
                            <div>
                              <span className="text-gray-500">Next Service: </span>
                              <span className="font-medium text-gray-900">
                                {new Date(tool.nextMaintenanceDate).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                        </div>

                        {tool.notes && (
                          <p className="text-sm text-gray-600 mt-3 italic">{tool.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/contractor/tools/${tool.id}`)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id, tool.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tools found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first tool to get started'}
                </p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {/* Add Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Tool</h3>
            <p className="text-gray-600 mb-6">Tool form would go here...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Tool added');
                  setShowAddModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Tool
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
