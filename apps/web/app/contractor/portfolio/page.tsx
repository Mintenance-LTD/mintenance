'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  PoundSterling,
  Tag,
  AlertCircle,
  X,
  Filter,
  Grid3x3,
  List,
  Loader2,
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

interface NewProjectForm {
  title: string;
  description: string;
  category: string;
  cost: string;
}

export default function ContractorPortfolioPage2025() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  const [newProject, setNewProject] = useState<NewProjectForm>({
    title: '',
    description: '',
    category: 'Kitchen',
    cost: '',
  });

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

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/posts?post_type=work_showcase&limit=50&sort=newest');
      if (!res.ok) throw new Error('Failed to load portfolio');
      const data = await res.json();
      const items: PortfolioItem[] = (data.posts || []).map((post: Record<string, unknown>) => ({
        id: String(post.id || ''),
        title: String(post.title || ''),
        description: String(post.content || ''),
        category: String(post.project_category || 'Repair'),
        location: (post.contractor as Record<string, unknown>)?.city
          ? String((post.contractor as Record<string, unknown>).city)
          : '',
        completedDate: String(post.created_at || new Date().toISOString()),
        cost: Number(post.project_cost) || 0,
        duration: String(post.project_duration || ''),
        images: Array.isArray(post.images) ? (post.images as string[]) : [],
        featured: Boolean(post.is_featured),
        verified: Boolean(post.is_verified),
        tags: Array.isArray(post.skills_used) ? (post.skills_used as string[]) : [],
      }));
      setPortfolioItems(items);
    } catch {
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleAddProject = () => {
    setShowAddForm(true);
  };

  const handleSubmitProject = async () => {
    if (!newProject.title.trim() || !newProject.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contractor/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify({
          title: newProject.title.trim(),
          content: newProject.description.trim(),
          post_type: 'work_showcase',
          project_cost: newProject.cost ? parseFloat(newProject.cost) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to create project');
      }

      toast.success('Project added to portfolio');
      setShowAddForm(false);
      setNewProject({ title: '', description: '', category: 'Kitchen', cost: '' });
      fetchPortfolio();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    const item = portfolioItems.find((i) => i.id === id);
    if (!item) return;

    // Optimistic update
    setPortfolioItems(
      portfolioItems.map((i) =>
        i.id === id ? { ...i, featured: !i.featured } : i
      )
    );

    try {
      const res = await fetch(`/api/contractor/posts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify({ is_featured: !item.featured }),
      });

      if (!res.ok) throw new Error('Failed to update');
      toast.success(item.featured ? 'Removed from featured' : 'Added to featured');
    } catch {
      // Revert optimistic update
      setPortfolioItems(
        portfolioItems.map((i) =>
          i.id === id ? { ...i, featured: item.featured } : i
        )
      );
      toast.error('Failed to update featured status');
    }
  };

  const handleDelete = async (id: string) => {
    const item = portfolioItems.find((i) => i.id === id);
    if (!item) return;

    // Optimistic removal
    setPortfolioItems(portfolioItems.filter((i) => i.id !== id));

    try {
      const res = await fetch(`/api/contractor/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': (window as { csrfToken?: string }).csrfToken || '',
        },
      });

      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Project deleted from portfolio');
    } catch {
      // Revert optimistic removal
      setPortfolioItems((prev) => [...prev, item]);
      toast.error('Failed to delete project');
    }
  };

  const handleRequestVerification = (id: string) => {
    toast.success('Verification request submitted');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header - Airbnb Style */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Portfolio</h1>
              <p className="text-lg text-gray-600">
                Showcase your best work and attract more clients
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddProject}
              className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-6 h-6" />
              Add Project
            </MotionButton>
          </div>

          {/* Stats Grid - Compact Airbnb Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Projects', value: stats.totalProjects, icon: Briefcase, color: 'teal' },
              { label: 'Featured', value: stats.featured, icon: Star, color: 'yellow' },
              { label: 'Verified', value: stats.verified, icon: CheckCircle, color: 'green' },
              { label: 'Total Value', value: `£${(stats.totalValue / 1000).toFixed(0)}k`, icon: PoundSterling, color: 'blue' },
            ].map((stat) => (
              <MotionDiv
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    stat.color === 'teal' ? 'bg-teal-100' :
                    stat.color === 'yellow' ? 'bg-yellow-100' :
                    stat.color === 'green' ? 'bg-green-100' :
                    'bg-blue-100'
                  }`}>
                    <stat.icon className={`w-6 h-6 ${
                      stat.color === 'teal' ? 'text-teal-600' :
                      stat.color === 'yellow' ? 'text-yellow-600' :
                      stat.color === 'green' ? 'text-green-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
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
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))}
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
                    value={newProject.description}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the project, challenges overcome, and results achieved..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newProject.category}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {categories.filter((c) => c !== 'all').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Cost
                  </label>
                  <input
                    type="number"
                    value={newProject.cost}
                    onChange={(e) => setNewProject((prev) => ({ ...prev, cost: e.target.value }))}
                    placeholder="£"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  onClick={handleSubmitProject}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Portfolio'}
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

        {/* Filters - Airbnb Style */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-900 hover:shadow-sm'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg border transition-all ${
                  viewMode === 'grid'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-900'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg border transition-all ${
                  viewMode === 'list'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Portfolio Grid - Masonry Style (Airbnb) */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}
        >
          {filteredItems.map((item) => (
            <MotionDiv
              key={item.id}
              variants={staggerItem}
              whileHover={{ y: -8 }}
              className="group bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              {/* Project Image - Airbnb Style */}
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {item.images && item.images.length > 0 && item.images[0] ? (
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-100 to-emerald-100">
                    <ImageIcon className="w-20 h-20 text-gray-300" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    {item.verified && (
                      <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600 fill-current" />
                        Verified
                      </div>
                    )}
                    {item.featured && (
                      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Edit/Delete buttons on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFeatured(item.id);
                      }}
                      className="p-2 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white shadow-lg transition-all"
                    >
                      <Star className={`w-4 h-4 ${item.featured ? 'text-yellow-500 fill-current' : 'text-gray-900'}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-2 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white shadow-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Project Details - Airbnb Style */}
              <div className="p-5">
                {/* Title & Rating */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                        {item.category}
                      </span>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-gray-900 text-gray-900" />
                          <span className="font-semibold text-sm text-gray-900">{item.rating}.0</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                  </div>
                </div>

                {/* Location */}
                {item.location && (
                  <div className="flex items-center gap-1.5 text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{item.location}</span>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Bottom Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.completedDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  {item.cost > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-gray-900">£{item.cost >= 1000 ? `${(item.cost / 1000).toFixed(1)}k` : item.cost}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs border border-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {filteredItems.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center shadow-md"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No projects in this category</h3>
              <p className="text-gray-600 mb-8 text-lg">
                {selectedCategory === 'all'
                  ? 'Start building your portfolio by adding your first project'
                  : `No ${selectedCategory} projects yet. Add one to showcase your work.`}
              </p>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddProject}
                className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-semibold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-6 h-6" />
                Add Project
              </MotionButton>
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
