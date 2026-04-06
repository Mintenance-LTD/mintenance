import { File, FolderOpen, Star, Folder } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { staggerContainer, staggerItem, CategoryWithCount } from './types';
import { formatFileSize } from './helpers';

interface StatsCardsProps {
  totalDocuments: number;
  totalSize: number;
  starredCount: number;
  categories: CategoryWithCount[];
}

export function StatsCards({ totalDocuments, totalSize, starredCount, categories }: StatsCardsProps) {
  return (
    <MotionDiv
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
    >
      <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
          <File className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Total Documents</p>
        <p className="text-2xl font-bold text-gray-900">{totalDocuments}</p>
      </MotionDiv>

      <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
          <FolderOpen className="w-6 h-6 text-blue-600" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Total Size</p>
        <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
      </MotionDiv>

      <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
          <Star className="w-6 h-6 text-yellow-600" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Starred</p>
        <p className="text-2xl font-bold text-gray-900">{starredCount}</p>
      </MotionDiv>

      <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
          <Folder className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Categories</p>
        <p className="text-2xl font-bold text-gray-900">
          {categories.filter((c) => c.value !== 'all' && c.count > 0).length}
        </p>
      </MotionDiv>
    </MotionDiv>
  );
}
