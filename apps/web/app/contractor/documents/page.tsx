'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  File,
  FileText,
  Image as ImageIcon,
  Download,
  Upload,
  Trash2,
  Share2,
  Search,
  Filter,
  Plus,
  Eye,
  Star,
  Clock,
  Folder,
  Grid,
  List,
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

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  uploadDate: string;
  lastModified: string;
  jobId?: string;
  jobTitle?: string;
  url: string;
  starred: boolean;
  tags: string[];
}

export default function DocumentManagementPage2025() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Kitchen Renovation Contract.pdf',
      type: 'pdf',
      category: 'contracts',
      size: 245000,
      uploadDate: '2025-01-28',
      lastModified: '2025-01-28',
      jobId: 'job_123',
      jobTitle: 'Kitchen Renovation - Smith Residence',
      url: '/documents/contract-kitchen.pdf',
      starred: true,
      tags: ['contract', 'kitchen'],
    },
    {
      id: '2',
      name: 'Bathroom Before Photos.zip',
      type: 'zip',
      category: 'photos',
      size: 15680000,
      uploadDate: '2025-01-25',
      lastModified: '2025-01-25',
      jobId: 'job_456',
      jobTitle: 'Bathroom Remodel',
      url: '/documents/bathroom-photos.zip',
      starred: false,
      tags: ['photos', 'before'],
    },
    {
      id: '3',
      name: 'Gas Safe Certificate 2025.pdf',
      type: 'pdf',
      category: 'certifications',
      size: 890000,
      uploadDate: '2025-01-20',
      lastModified: '2025-01-20',
      url: '/documents/gas-safe-2025.pdf',
      starred: true,
      tags: ['certification', 'gas-safe'],
    },
    {
      id: '4',
      name: 'Invoice Template.docx',
      type: 'docx',
      category: 'templates',
      size: 45000,
      uploadDate: '2025-01-18',
      lastModified: '2025-01-22',
      url: '/documents/invoice-template.docx',
      starred: false,
      tags: ['template', 'invoice'],
    },
    {
      id: '5',
      name: 'Insurance Policy 2025.pdf',
      type: 'pdf',
      category: 'insurance',
      size: 1250000,
      uploadDate: '2025-01-15',
      lastModified: '2025-01-15',
      url: '/documents/insurance-2025.pdf',
      starred: true,
      tags: ['insurance', 'policy'],
    },
    {
      id: '6',
      name: 'Material Receipt - B&Q.jpg',
      type: 'jpg',
      category: 'receipts',
      size: 320000,
      uploadDate: '2025-01-12',
      lastModified: '2025-01-12',
      jobId: 'job_123',
      jobTitle: 'Kitchen Renovation - Smith Residence',
      url: '/documents/receipt-bq.jpg',
      starred: false,
      tags: ['receipt', 'materials'],
    },
  ]);

  const categories = [
    { value: 'all', label: 'All Documents', count: documents.length },
    { value: 'contracts', label: 'Contracts', count: documents.filter((d) => d.category === 'contracts').length },
    { value: 'photos', label: 'Photos', count: documents.filter((d) => d.category === 'photos').length },
    { value: 'certifications', label: 'Certifications', count: documents.filter((d) => d.category === 'certifications').length },
    { value: 'insurance', label: 'Insurance', count: documents.filter((d) => d.category === 'insurance').length },
    { value: 'receipts', label: 'Receipts', count: documents.filter((d) => d.category === 'receipts').length },
    { value: 'templates', label: 'Templates', count: documents.filter((d) => d.category === 'templates').length },
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'jpg':
      case 'png':
        return <ImageIcon className="w-8 h-8 text-blue-600" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-8 h-8 text-blue-700" />;
      case 'zip':
        return <FolderOpen className="w-8 h-8 text-yellow-600" />;
      default:
        return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery === '' ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || doc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  const starredDocuments = documents.filter((d) => d.starred);
  const recentDocuments = [...documents].sort(
    (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  ).slice(0, 5);

  const handleToggleStar = (id: string) => {
    setDocuments(documents.map((doc) =>
      doc.id === id ? { ...doc, starred: !doc.starred } : doc
    ));
    toast.success('Document starred status updated');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      setDocuments(documents.filter((doc) => doc.id !== id));
      toast.success('Document deleted');
    }
  };

  const handleDownload = (name: string) => {
    toast.success(`Downloading ${name}...`);
  };

  const handleShare = (name: string) => {
    toast.success(`Sharing ${name}...`);
  };

  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

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
              <h1 className="text-4xl font-bold mb-2">Document Management</h1>
              <p className="text-emerald-100">
                Store and manage all your business documents in one place
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              Upload Document
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
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
              <File className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Size</p>
            <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Starred</p>
            <p className="text-2xl font-bold text-gray-900">{starredDocuments.length}</p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <Folder className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Categories</p>
            <p className="text-2xl font-bold text-gray-900">
              {categories.filter((c) => c.value !== 'all').length}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm font-medium">{category.label}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === category.value
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </MotionDiv>

            {/* Recent */}
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent
              </h3>
              <div className="space-y-3">
                {recentDocuments.slice(0, 3).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionDiv>
          </div>

          {/* Documents Grid/List */}
          <div className="lg:col-span-3">
            <MotionDiv
              variants={fadeIn}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
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
                          {getFileIcon(doc.type)}
                        </div>
                        <button
                          onClick={() => handleToggleStar(doc.id)}
                          className="p-1"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              doc.starred
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {doc.name}
                      </h4>

                      <div className="text-xs text-gray-600 mb-3 space-y-1">
                        <p>{formatFileSize(doc.size)}</p>
                        <p>
                          {new Date(doc.uploadDate).toLocaleDateString('en-GB')}
                        </p>
                        {doc.jobTitle && (
                          <p className="text-blue-600 truncate">{doc.jobTitle}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(doc.name)}
                          className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={() => handleShare(doc.name)}
                          className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
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
                      <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>
                            {new Date(doc.uploadDate).toLocaleDateString('en-GB')}
                          </span>
                          {doc.jobTitle && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">{doc.jobTitle}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStar(doc.id)}
                          className="p-2"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              doc.starred
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.name)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleShare(doc.name)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
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
                  <p className="text-gray-600">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Upload your first document to get started'}
                  </p>
                </div>
              )}
            </MotionDiv>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h3>
            <p className="text-gray-600 mb-6">Upload form would go here...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Document uploaded');
                  setShowUploadModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Upload
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
