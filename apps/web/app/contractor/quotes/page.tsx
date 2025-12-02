'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Send,
  Eye,
  Star,
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
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

interface QuoteTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  items: {
    description: string;
    unit: string;
    defaultQuantity: number;
    defaultRate: number;
  }[];
  terms: string;
  validityDays: number;
  isDefault: boolean;
  usageCount: number;
  lastUsed?: string;
  createdDate: string;
}

interface Quote {
  id: string;
  jobTitle: string;
  customerName: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  amount: number;
  createdDate: string;
  sentDate?: string;
  expiryDate: string;
  templateUsed?: string;
}

export default function QuoteTemplatesPage2025() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'templates' | 'quotes'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);

  const [templates, setTemplates] = useState<QuoteTemplate[]>([
    {
      id: '1',
      name: 'Standard Kitchen Renovation',
      category: 'kitchen',
      description: 'Complete kitchen renovation including cabinets, countertops, and installation',
      items: [
        { description: 'Kitchen Cabinet Installation', unit: 'project', defaultQuantity: 1, defaultRate: 1200 },
        { description: 'Countertop Installation', unit: 'sqft', defaultQuantity: 50, defaultRate: 15 },
        { description: 'Plumbing Work', unit: 'hour', defaultQuantity: 8, defaultRate: 50 },
        { description: 'Electrical Work', unit: 'hour', defaultQuantity: 6, defaultRate: 55 },
      ],
      terms: 'Payment terms: 50% deposit, 50% on completion. Net 30 days.',
      validityDays: 30,
      isDefault: true,
      usageCount: 42,
      lastUsed: '2025-01-25',
      createdDate: '2024-06-15',
    },
    {
      id: '2',
      name: 'Bathroom Remodel Standard',
      category: 'bathroom',
      description: 'Standard bathroom remodeling package',
      items: [
        { description: 'Tile Installation', unit: 'sqft', defaultQuantity: 100, defaultRate: 8 },
        { description: 'Fixture Installation', unit: 'unit', defaultQuantity: 4, defaultRate: 150 },
        { description: 'Plumbing Updates', unit: 'hour', defaultQuantity: 12, defaultRate: 50 },
      ],
      terms: 'Payment terms: 40% deposit, 30% midpoint, 30% completion.',
      validityDays: 30,
      isDefault: false,
      usageCount: 28,
      lastUsed: '2025-01-20',
      createdDate: '2024-07-10',
    },
    {
      id: '3',
      name: 'Electrical Service Call',
      category: 'electrical',
      description: 'Standard electrical service and repair',
      items: [
        { description: 'Service Call Fee', unit: 'visit', defaultQuantity: 1, defaultRate: 75 },
        { description: 'Labor', unit: 'hour', defaultQuantity: 2, defaultRate: 65 },
        { description: 'Materials', unit: 'allowance', defaultQuantity: 1, defaultRate: 100 },
      ],
      terms: 'Payment due upon completion.',
      validityDays: 7,
      isDefault: false,
      usageCount: 156,
      lastUsed: '2025-01-28',
      createdDate: '2024-03-01',
    },
  ]);

  const [quotes] = useState<Quote[]>([
    {
      id: 'q1',
      jobTitle: 'Kitchen Renovation - Smith Residence',
      customerName: 'Sarah Johnson',
      status: 'accepted',
      amount: 14500,
      createdDate: '2025-01-20',
      sentDate: '2025-01-20',
      expiryDate: '2025-02-19',
      templateUsed: 'Standard Kitchen Renovation',
    },
    {
      id: 'q2',
      jobTitle: 'Bathroom Remodel',
      customerName: 'Michael Brown',
      status: 'sent',
      amount: 8200,
      createdDate: '2025-01-25',
      sentDate: '2025-01-25',
      expiryDate: '2025-02-24',
      templateUsed: 'Bathroom Remodel Standard',
    },
    {
      id: 'q3',
      jobTitle: 'Electrical Panel Upgrade',
      customerName: 'Emma Wilson',
      status: 'draft',
      amount: 3500,
      createdDate: '2025-01-28',
      expiryDate: '2025-02-04',
    },
  ]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'general', label: 'General' },
  ];

  const handleDuplicateTemplate = (template: QuoteTemplate) => {
    const newTemplate = {
      ...template,
      id: `${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      usageCount: 0,
      lastUsed: undefined,
      createdDate: new Date().toISOString(),
    };
    setTemplates([...templates, newTemplate]);
    toast.success('Template duplicated');
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Delete template "${name}"?`)) {
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success('Template deleted');
    }
  };

  const handleSetDefault = (id: string) => {
    setTemplates(templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    })));
    toast.success('Default template updated');
  };

  const handleUseTemplate = (template: QuoteTemplate) => {
    router.push(`/contractor/quotes/create?templateId=${template.id}`);
  };

  const getStatusIcon = (status: Quote['status']) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'sent':
      case 'viewed':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'rejected':
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'draft':
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
              <h1 className="text-4xl font-bold mb-2">Quote Templates</h1>
              <p className="text-emerald-100">
                Create and manage reusable quote templates
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Template
            </button>
          </div>
        </div>
      </MotionDiv>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {['templates', 'quotes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 border-b-2 font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Templates Tab */}
              {activeTab === 'templates' && (
                <MotionDiv
                  key="templates"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
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
                  </div>

                  {/* Templates Grid */}
                  <MotionDiv
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredTemplates.map((template) => (
                      <MotionDiv
                        key={template.id}
                        variants={staggerItem}
                        className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {template.name}
                                </h3>
                                {template.isDefault && (
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4 text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Items:</span>
                              <span className="font-medium text-gray-900">
                                {template.items.length}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Used:</span>
                              <span className="font-medium text-gray-900">
                                {template.usageCount} times
                              </span>
                            </div>
                            {template.lastUsed && (
                              <div className="flex items-center justify-between">
                                <span>Last used:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(template.lastUsed).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span>Valid for:</span>
                              <span className="font-medium text-gray-900">
                                {template.validityDays} days
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">
                              {categories.find((c) => c.value === template.category)?.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUseTemplate(template)}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                            >
                              <Send className="w-4 h-4" />
                              Use
                            </button>
                            <button
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowTemplateModal(true);
                              }}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicateTemplate(template)}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              className="flex items-center justify-center gap-1 px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>

                          {!template.isDefault && (
                            <button
                              onClick={() => handleSetDefault(template.id)}
                              className="w-full mt-2 px-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </MotionDiv>
                    ))}
                  </MotionDiv>

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No templates found
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first quote template'}
                      </p>
                      {!searchQuery && selectedCategory === 'all' && (
                        <button
                          onClick={() => setShowTemplateModal(true)}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >
                          Create Template
                        </button>
                      )}
                    </div>
                  )}
                </MotionDiv>
              )}

              {/* Quotes Tab */}
              {activeTab === 'quotes' && (
                <MotionDiv
                  key="quotes"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(quote.status)}
                              <h3 className="font-semibold text-gray-900">
                                {quote.jobTitle}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  quote.status
                                )}`}
                              >
                                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="text-gray-500">Customer: </span>
                                <span className="font-medium text-gray-900">
                                  {quote.customerName}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Amount: </span>
                                <span className="font-medium text-gray-900">
                                  £{quote.amount.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Expires: </span>
                                <span className="font-medium text-gray-900">
                                  {new Date(quote.expiryDate).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                            </div>

                            {quote.templateUsed && (
                              <p className="text-xs text-gray-500 mt-2">
                                Template: {quote.templateUsed}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/contractor/quotes/${quote.id}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            {quote.status === 'draft' && (
                              <>
                                <button
                                  onClick={() =>
                                    router.push(`/contractor/quotes/${quote.id}/edit`)
                                  }
                                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => toast.success('Quote sent!')}
                                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                >
                                  <Send className="w-4 h-4" />
                                  Send
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Template Modal Placeholder */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h3>
            <p className="text-gray-600 mb-6">
              Template creation form would go here...
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success(
                    editingTemplate ? 'Template updated' : 'Template created'
                  );
                  setShowTemplateModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Save Template
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
