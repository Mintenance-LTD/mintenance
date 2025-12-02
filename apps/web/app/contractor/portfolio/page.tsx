'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Upload,
  CheckCircle,
  Eye,
  Star,
  Calendar,
  MapPin,
  DollarSign,
  Tag,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  completedDate: string;
  cost: number;
  duration: string;
  images: string[];
  featured: boolean;
  verified: boolean;
  rating?: number;
  client?: string;
  tags: string[];
}

export default function ContractorPortfolioPage2025() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    {
      id: 'PORT-001',
      title: 'Modern Kitchen Renovation',
      description: 'Complete kitchen remodel with custom cabinetry, quartz countertops, and modern appliances. Included plumbing updates and electrical work.',
      category: 'Kitchen',
      location: 'London, SW1A',
      completedDate: '2024-12-15',
      cost: 18500,
      duration: '3 weeks',
      images: ['/placeholder1.jpg', '/placeholder2.jpg', '/placeholder3.jpg'],
      featured: true,
      verified: true,
      rating: 5,
      client: 'Sarah Johnson',
      tags: ['Renovation', 'Plumbing', 'Electrical'],
    },
    {
      id: 'PORT-002',
      title: 'Luxury Bathroom Suite',
      description: 'High-end bathroom installation with walk-in shower, freestanding bath, and heated floors.',
      category: 'Bathroom',
      location: 'Manchester, M1',
      completedDate: '2024-11-28',
      cost: 12300,
      duration: '2 weeks',
      images: ['/placeholder1.jpg', '/placeholder2.jpg'],
      featured: false,
      verified: true,
      rating: 5,
      client: 'Michael Brown',
      tags: ['Installation', 'Heating', 'Tiling'],
    },
    {
      id: 'PORT-003',
      title: 'Boiler Replacement & System Upgrade',
      description: 'Replaced old boiler with energy-efficient condensing boiler and upgraded entire heating system.',
      category: 'Heating',
      location: 'Birmingham, B1',
      completedDate: '2024-10-20',
      cost: 5200,
      duration: '2 days',
      images: ['/placeholder1.jpg'],
      featured: false,
      verified: true,
      rating: 4,
      client: 'Emma Wilson',
      tags: ['Boiler', 'Heating', 'Gas'],
    },
    {
      id: 'PORT-004',
      title: 'Emergency Leak Repair',
      description: 'Emergency response to major leak. Replaced damaged pipes and restored water supply.',
      category: 'Repair',
      location: 'Leeds, LS1',
      completedDate: '2024-09-15',
      cost: 850,
      duration: '1 day',
      images: ['/placeholder1.jpg'],
      featured: false,
      verified: false,
      client: 'David Lee',
      tags: ['Emergency', 'Repair', 'Pipes'],
    },
  ]);

  const categories = ['all', 'Kitchen', 'Bathroom', 'Heating', 'Repair', 'Installation'];

  const filteredItems = portfolioItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const stats = {
    totalProjects: portfolioItems.length,
    featured: portfolioItems.filter((i) => i.featured).length,
    verified: portfolioItems.filter((i) => i.verified).length,
    totalValue: portfolioItems.reduce((sum, item) => sum + item.cost, 0),
  };

  const handleAddProject = () => {
    setShowAddForm(true);
  };

  const handleToggleFeatured = (id: string) => {
    setPortfolioItems(
      portfolioItems.map((item) =>
        item.id === id ? { ...item, featured: !item.featured } : item
      )
    );
    toast.success('Featured status updated');
  };

  const handleDelete = (id: string) => {
    setPortfolioItems(portfolioItems.filter((item) => item.id !== id));
    toast.success('Project deleted from portfolio');
  };

  const handleRequestVerification = (id: string) => {
    toast.success('Verification request submitted');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Portfolio</h1>
              </div>
              <p className="text-emerald-100 text-lg">
                Showcase your best work and attract more clients
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddProject}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Project
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Total Projects</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalProjects}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Featured</p>
              </div>
              <p className="text-3xl font-bold">{stats.featured}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-emerald-100 text-sm">Verified</p>
              </div>
              <p className="text-3xl font-bold">{stats.verified}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Total Value</p>
              </div>
              <p className="text-3xl font-bold">£{(stats.totalValue / 1000).toFixed(0)}k</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Project Form */}
        <AnimatePresence>
          {showAddForm && (
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Project</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Modern Kitchen Renovation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the project, challenges overcome, and results achieved..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    {categories.filter((c) => c !== 'all').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="e.g., London, SW1A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completed Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Cost
                  </label>
                  <input
                    type="number"
                    placeholder="£"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Images
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    toast.success('Project added to portfolio');
                    setShowAddForm(false);
                  }}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Add to Portfolio
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </MotionButton>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${
                  viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-2 h-2 bg-current rounded"></div>
                  <div className="w-2 h-2 bg-current rounded"></div>
                  <div className="w-2 h-2 bg-current rounded"></div>
                  <div className="w-2 h-2 bg-current rounded"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <div className="space-y-1">
                  <div className="w-4 h-1 bg-current rounded"></div>
                  <div className="w-4 h-1 bg-current rounded"></div>
                  <div className="w-4 h-1 bg-current rounded"></div>
                </div>
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Portfolio Grid/List */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}
        >
          {filteredItems.map((item) => (
            <MotionDiv
              key={item.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Project Image */}
              <div className="relative aspect-video bg-gray-100">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
                {item.featured && (
                  <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
                {item.verified && (
                  <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 fill-current" />
                    Verified
                  </div>
                )}
              </div>

              {/* Project Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {item.category}
                    </span>
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{item.rating}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{item.completedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold text-emerald-600">£{item.cost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleFeatured(item.id)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.featured
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Star className="w-4 h-4 inline mr-1" />
                    {item.featured ? 'Unfeatured' : 'Feature'}
                  </MotionButton>
                  {!item.verified && (
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRequestVerification(item.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Verify
                    </MotionButton>
                  )}
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </MotionButton>
                </div>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredItems.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
          >
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Start building your portfolio by adding your first project</p>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddProject}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add First Project
            </MotionButton>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
