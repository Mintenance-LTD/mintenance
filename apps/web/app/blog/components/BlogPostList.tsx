'use client';

import { BookOpen, Calendar, User, Clock, Tag, TrendingUp, ChevronRight, Eye } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { BlogPost } from './blogData';

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

interface BlogPostListProps {
  filteredPosts: BlogPost[];
  featuredPosts: BlogPost[];
  selectedCategory: string;
  searchQuery: string;
}

export function BlogPostList({ filteredPosts, featuredPosts, selectedCategory, searchQuery }: BlogPostListProps) {
  return (
    <>
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
                  <BookOpen className="w-16 h-16 text-teal-600" aria-hidden="true" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Eye className="w-4 h-4" aria-hidden="true" />
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
                        <User className="w-4 h-4" aria-hidden="true" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" aria-hidden="true" />
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
    </>
  );
}
