'use client';

import { TrendingUp, Eye } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { BlogPost } from './blogData';

interface BlogSidebarProps {
  popularPosts: BlogPost[];
  categories: string[];
  blogPosts: BlogPost[];
  setSelectedCategory: (category: string) => void;
}

export function BlogSidebar({ popularPosts, categories, blogPosts, setSelectedCategory }: BlogSidebarProps) {
  return (
    <div className="sticky top-8 space-y-8">
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
          aria-label="Email address for newsletter"
        />
        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-lg transition-shadow"
        >
          Subscribe
        </MotionButton>
      </MotionDiv>

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
  );
}
