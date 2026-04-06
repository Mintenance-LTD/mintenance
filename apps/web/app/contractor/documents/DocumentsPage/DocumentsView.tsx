import { Search, Grid, List, Star, Download, Share2, Trash2, File, Plus } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Document, fadeIn } from './types';
import { getFileIcon, formatFileSize } from './helpers';

interface DocumentsViewProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  filteredDocuments: Document[];
  selectedCategory: string;
  onUploadClick: () => void;
  onToggleStar: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

export function DocumentsView({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filteredDocuments,
  selectedCategory,
  onUploadClick,
  onToggleStar,
  onDownload,
  onShare,
  onDelete,
}: DocumentsViewProps) {
  return (
    <div className="lg:col-span-3">
      <MotionDiv variants={fadeIn} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documents */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <button onClick={() => onToggleStar(doc)} className="p-1">
                    <Star
                      className={`w-5 h-5 ${
                        doc.starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                </div>

                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{doc.name}</h4>

                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  <p>{formatFileSize(doc.size_bytes)}</p>
                  <p>{new Date(doc.created_at).toLocaleDateString('en-GB')}</p>
                  {doc.jobTitle && (
                    <p className="text-blue-600 truncate">{doc.jobTitle}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onDownload(doc)}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => onShare(doc)}
                    className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="p-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">{getFileIcon(doc.file_type)}</div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span>{formatFileSize(doc.size_bytes)}</span>
                    <span>&middot;</span>
                    <span>{new Date(doc.created_at).toLocaleDateString('en-GB')}</span>
                    {doc.jobTitle && (
                      <>
                        <span>&middot;</span>
                        <span className="text-blue-600">{doc.jobTitle}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleStar(doc)} className="p-2">
                    <Star
                      className={`w-5 h-5 ${
                        doc.starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => onDownload(doc)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onShare(doc)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No documents found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first document to get started'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <button
                onClick={onUploadClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        )}
      </MotionDiv>
    </div>
  );
}
