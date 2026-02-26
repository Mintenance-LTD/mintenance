'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Plus,
  Star,
  Clock,
  Folder,
  Grid,
  List,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  file_type: string;
  category: string;
  size_bytes: number;
  storage_path: string;
  public_url: string | null;
  job_id: string | null;
  jobTitle: string | null;
  starred: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Documents' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'photos', label: 'Photos' },
  { value: 'certifications', label: 'Certifications' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'templates', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

export default function DocumentManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploadTags, setUploadTags] = useState('');
  const [shareRecipient, setShareRecipient] = useState({ id: '', name: '', jobId: '' });

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Check URL params for share context from Messages
  useEffect(() => {
    const shareWithId = searchParams.get('shareWith');
    const shareWithName = searchParams.get('shareWithName');
    const jobId = searchParams.get('jobId');

    if (shareWithId && shareWithName) {
      setShareRecipient({
        id: shareWithId,
        name: shareWithName,
        jobId: jobId || '',
      });
      toast.success(`Select a document to share with ${shareWithName}`);
    }
  }, [searchParams]);

  const categories = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      count: cat.value === 'all'
        ? documents.length
        : documents.filter((d) => d.category === cat.value).length,
    }));
  }, [documents]);

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

  const starredDocuments = useMemo(() => documents.filter((d) => d.starred), [documents]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [documents]);

  const totalSize = useMemo(() => documents.reduce((sum, doc) => sum + doc.size_bytes, 0), [documents]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
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

  // Upload file
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);
        if (uploadTags) formData.append('tags', uploadTags);

        const res = await fetch('/api/contractor/documents', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': (window as unknown as { csrfToken?: string }).csrfToken || '',
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setDocuments((prev) => [data.document, ...prev]);
          successCount++;
        } else {
          const err = await res.json();
          toast.error(`Failed to upload ${file.name}: ${err.error || 'Unknown error'}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploaded`);
    }

    setUploading(false);
    setShowUploadModal(false);
    setUploadCategory('other');
    setUploadTags('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle star
  const handleToggleStar = async (doc: Document) => {
    const newStarred = !doc.starred;
    // Optimistic update
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, starred: newStarred } : d));

    try {
      const res = await fetch('/api/contractor/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': (window as unknown as { csrfToken?: string }).csrfToken || '',
        },
        body: JSON.stringify({ id: doc.id, starred: newStarred }),
      });

      if (!res.ok) {
        // Revert on failure
        setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, starred: !newStarred } : d));
        toast.error('Failed to update');
      }
    } catch {
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, starred: !newStarred } : d));
      toast.error('Failed to update');
    }
  };

  // Delete document
  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;

    // Optimistic remove
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

    try {
      const res = await fetch(`/api/contractor/documents?id=${doc.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': (window as unknown as { csrfToken?: string }).csrfToken || '',
        },
      });

      if (!res.ok) {
        setDocuments((prev) => [...prev, doc]);
        toast.error('Failed to delete');
      } else {
        toast.success('Document deleted');
      }
    } catch {
      setDocuments((prev) => [...prev, doc]);
      toast.error('Failed to delete');
    }
  };

  // Download document
  const handleDownload = (doc: Document) => {
    if (!doc.public_url) {
      toast.error('No download URL available');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.public_url;
    link.download = doc.name;
    link.target = '_blank';
    link.click();
    toast.success(`Downloading ${doc.name}...`);
  };

  // Share document
  const handleShare = (doc: Document) => {
    if (shareRecipient.id && shareRecipient.name) {
      toast.success(`Sharing "${doc.name}" with ${shareRecipient.name}`);
      setTimeout(() => {
        router.push('/contractor/messages');
      }, 1500);
    } else {
      if (doc.public_url) {
        navigator.clipboard.writeText(doc.public_url);
        toast.success('Link copied to clipboard');
      } else {
        toast.error('No shareable link available');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-gradient-to-br from-emerald-50 via-white to-red-50">
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
          <MotionDiv variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
              <File className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
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
            <p className="text-2xl font-bold text-gray-900">{starredDocuments.length}</p>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <MotionDiv variants={fadeIn} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
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
                      onClick={() => handleDownload(doc)}
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

          {/* Documents Grid/List */}
          <div className="lg:col-span-3">
            <MotionDiv variants={fadeIn} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                          {getFileIcon(doc.file_type)}
                        </div>
                        <button onClick={() => handleToggleStar(doc)} className="p-1">
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
                          onClick={() => handleDownload(doc)}
                          className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={() => handleShare(doc)}
                          className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
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
                        <button onClick={() => handleToggleStar(doc)} className="p-2">
                          <Star
                            className={`w-5 h-5 ${
                              doc.starred
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleShare(doc)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
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
                      onClick={() => setShowUploadModal(true)}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  <option value="contracts">Contracts</option>
                  <option value="photos">Photos</option>
                  <option value="certifications">Certifications</option>
                  <option value="insurance">Insurance</option>
                  <option value="receipts">Receipts</option>
                  <option value="templates">Templates</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. invoice, kitchen, 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>

              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip,.xls,.xlsx"
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-xs text-gray-500 mt-1">Max 20MB per file. PDF, DOC, JPG, PNG, ZIP, XLS accepted.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpload(fileInputRef.current?.files ?? null)}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
