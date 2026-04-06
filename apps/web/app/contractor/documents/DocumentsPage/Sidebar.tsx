import { Clock } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Document, CategoryWithCount, fadeIn } from './types';
import { getFileIcon, formatFileSize } from './helpers';

interface SidebarProps {
  categories: CategoryWithCount[];
  selectedCategory: string;
  onSelectCategory: (value: string) => void;
  recentDocuments: Document[];
  onDownload: (doc: Document) => void;
}

export function Sidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  recentDocuments,
  onDownload,
}: SidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Categories */}
      <MotionDiv variants={fadeIn} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onSelectCategory(cat.value)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm font-medium">{cat.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat.value
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </MotionDiv>

      {/* Recent */}
      <MotionDiv variants={fadeIn} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent
        </h3>
        {recentDocuments.length === 0 ? (
          <p className="text-sm text-gray-500">No documents yet</p>
        ) : (
          <div className="space-y-3">
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => onDownload(doc)}
              >
                <div className="flex-shrink-0">{getFileIcon(doc.file_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.size_bytes)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </MotionDiv>
    </div>
  );
}
