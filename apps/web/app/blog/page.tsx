'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  User,
  Clock,
  Tag,
  Search,
  TrendingUp,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { MotionButton, MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

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

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  views: number;
  featured?: boolean;
  image?: string;
}

export default function BlogPage2025() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'all',
    'Home Maintenance',
    'DIY Tips',
    'Contractor Advice',
    'Industry News',
    'Platform Updates',
  ];

  const blogPosts: BlogPost[] = [
    {
      id: 'POST-001',
      title: '10 Essential Home Maintenance Tasks for Winter',
      excerpt: 'Prepare your home for the cold season with these crucial maintenance tasks that will keep your property safe and energy-efficient.',
      author: 'Sarah Johnson',
      date: '2025-01-28',
      readTime: '5 min read',
      category: 'Home Maintenance',
      tags: ['Winter', 'Maintenance', 'Energy Efficiency'],
      views: 2847,
      featured: true,
    },
    {
      id: 'POST-002',
      title: 'How to Choose the Right Contractor for Your Project',
      excerpt: 'Learn the key factors to consider when selecting a contractor, from verifying credentials to understanding quotes and contracts.',
      author: 'Michael Chen',
      date: '2025-01-25',
      readTime: '7 min read',
      category: 'Contractor Advice',
      tags: ['Contractors', 'Tips', 'Hiring'],
      views: 1923,
    },
    {
      id: 'POST-003',
      title: 'DIY vs Professional: When to Call an Expert',
      excerpt: 'Not every home repair requires a professional. Discover which tasks you can handle yourself and when it\'s time to call in the experts.',
      author: 'Emma Williams',
      date: '2025-01-22',
      readTime: '6 min read',
      category: 'DIY Tips',
      tags: ['DIY', 'Cost Savings', 'Safety'],
      views: 3156,
      featured: true,
    },
    {
      id: 'POST-004',
      title: 'New AI-Powered Matching Feature Launch',
      excerpt: 'We\'re excited to announce our latest feature that uses artificial intelligence to match homeowners with the perfect contractors.',
      author: 'Mintenance Team',
      date: '2025-01-20',
      readTime: '4 min read',
      category: 'Platform Updates',
      tags: ['AI', 'Features', 'Technology'],
      views: 1654,
    },
    {
      id: 'POST-005',
      title: 'Understanding Home Insurance and Contractor Work',
      excerpt: 'What you need to know about insurance coverage when hiring contractors and how to protect yourself from liability.',
      author: 'David Brown',
      date: '2025-01-18',
      readTime: '8 min read',
      category: 'Home Maintenance',
      tags: ['Insurance', 'Legal', 'Protection'],
      views: 2341,
    },
    {
      id: 'POST-006',
      title: 'Bathroom Renovation on a Budget: Pro Tips',
      excerpt: 'Transform your bathroom without breaking the bank. Our expert tips will help you achieve a stunning result within your budget.',
      author: 'Lisa Anderson',
      date: '2025-01-15',
      readTime: '6 min read',
      category: 'DIY Tips',
      tags: ['Bathroom', 'Budget', 'Renovation'],
      views: 4523,
      featured: true,
    },
    {
      id: 'POST-007',
      title: '2025 Home Improvement Trends to Watch',
      excerpt: 'Stay ahead of the curve with these emerging home improvement trends that are shaping the industry this year.',
      author: 'Sarah Johnson',
      date: '2025-01-12',
      readTime: '5 min read',
      category: 'Industry News',
      tags: ['Trends', '2025', 'Design'],
      views: 1876,
    },
    {
      id: 'POST-008',
      title: 'How to Prepare Your Home for a Contractor Visit',
      excerpt: 'Make the most of your contractor\'s time with these preparation tips that ensure a smooth and efficient project.',
      author: 'Michael Chen',
      date: '2025-01-10',
      readTime: '4 min read',
      category: 'Contractor Advice',
      tags: ['Preparation', 'Efficiency', 'Tips'],
      views: 1432,
    },
  ];

  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const featuredPosts = blogPosts.filter((post) => post.featured);
  const popularPosts = [...blogPosts].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/20 backdrop-blur-sm p-4 rounded-full inline-block mb-6"
            >
              <BookOpen className="w-12 h-12" />
            </MotionDiv>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              Blog & Insights
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto"
            >
              Expert advice, tips, and updates from the home maintenance industry
            </MotionP>
          </div>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Search and Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </MotionDiv>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Featured Posts */}
            {selectedCategory === 'all' && !searchQuery && (
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Articles</h2>
                <div className="space-y-6">
                  {featuredPosts.slice(0, 2).map((post) => (
                    <MotionDiv
                      key={post.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="aspect-video bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-teal-600" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                            {post.category}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Eye className="w-4 h-4" />
                            <span>{post.views.toLocaleString()} views</span>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 hover:text-teal-600 transition-colors cursor-pointer">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{post.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{post.readTime}</span>
                            </div>
                          </div>
                          <MotionButton
                            whileHover={{ x: 4 }}
                            className="text-teal-600 font-semibold flex items-center gap-1"
                          >
                            Read More
                            <ChevronRight className="w-4 h-4" />
                          </MotionButton>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>
              </MotionDiv>
            )}

            {/* All Posts */}
            <MotionDiv
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {selectedCategory === 'all' ? 'Latest Articles' : `${selectedCategory} Articles`}
              </h2>
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <MotionDiv
                    key={post.id}
                    variants={staggerItem}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                        {post.category}
                      </span>
                      {post.featured && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Eye className="w-4 h-4" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-teal-600 transition-colors cursor-pointer">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <MotionButton
                        whileHover={{ x: 4 }}
                        className="text-teal-600 font-semibold flex items-center gap-1"
                      >
                        Read More
                        <ChevronRight className="w-4 h-4" />
                      </MotionButton>
                    </div>
                  </MotionDiv>
                ))}
              </div>

              {filteredPosts.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </MotionDiv>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">
              {/* Popular Posts */}
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  <h3 className="text-lg font-bold text-gray-900">Popular Articles</h3>
                </div>
                <div className="space-y-4">
                  {popularPosts.map((post, index) => (
                    <div key={post.id} className="flex gap-3 group cursor-pointer">
                      <span className="text-2xl font-bold text-teal-600">{index + 1}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors mb-1">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Eye className="w-3 h-3" />
                          <span>{post.views.toLocaleString()} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </MotionDiv>

              {/* Newsletter Signup */}
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl p-6 text-white"
              >
                <h3 className="text-xl font-bold mb-3">Subscribe to our Newsletter</h3>
                <p className="text-teal-100 mb-4">
                  Get the latest articles and tips delivered to your inbox weekly.
                </p>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-lg text-gray-900 mb-3 focus:ring-2 focus:ring-white focus:outline-none"
                />
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                >
                  Subscribe
                </MotionButton>
              </MotionDiv>

              {/* Categories */}
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.slice(1).map((category) => {
                    const count = blogPosts.filter((p) => p.category === category).length;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors text-left"
                      >
                        <span className="text-gray-700">{category}</span>
                        <span className="text-sm text-gray-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </MotionDiv>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
