'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf-client';
import { Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Document, CATEGORIES, fadeIn } from './DocumentsPage/types';
import { StatsCards } from './DocumentsPage/StatsCards';
import { Sidebar } from './DocumentsPage/Sidebar';
import { DocumentsView } from './DocumentsPage/DocumentsView';
import { UploadModal } from './DocumentsPage/UploadModal';

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

        const csrfToken = await getCsrfToken();
        const res = await fetch('/api/contractor/documents', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
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
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/contractor/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
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

  // Delete document or contract
  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;

    // Optimistic remove
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

    try {
      const deleteCsrf = await getCsrfToken();

      let res: Response;
      if (doc.is_contract && doc.contract_id) {
        // Delete contract via contract API
        res = await fetch(`/api/contracts/${doc.contract_id}/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': deleteCsrf,
          },
        });
      } else {
        res = await fetch(`/api/contractor/documents?id=${doc.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': deleteCsrf,
          },
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setDocuments((prev) => [...prev, doc]);
        toast.error(errorData.error?.message || errorData.error || 'Failed to delete');
      } else {
        toast.success(doc.is_contract ? 'Contract deleted' : 'Document deleted');
      }
    } catch {
      setDocuments((prev) => [...prev, doc]);
      toast.error('Failed to delete');
    }
  };

  // Download document (contracts download as PDF)
  const handleDownload = (doc: Document) => {
    if (doc.is_contract && doc.contract_id) {
      // Download contract as PDF
      const link = document.createElement('a');
      link.href = `/api/contracts/${doc.contract_id}/pdf`;
      link.download = `${doc.name}.pdf`;
      link.click();
      toast.success(`Downloading ${doc.name} as PDF...`);
      return;
    }
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
        <StatsCards
          totalDocuments={documents.length}
          totalSize={totalSize}
          starredCount={starredDocuments.length}
          categories={categories}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Sidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            recentDocuments={recentDocuments}
            onDownload={handleDownload}
          />

          <DocumentsView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filteredDocuments={filteredDocuments}
            selectedCategory={selectedCategory}
            onUploadClick={() => setShowUploadModal(true)}
            onToggleStar={handleToggleStar}
            onDownload={handleDownload}
            onShare={handleShare}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          fileInputRef={fileInputRef}
          uploadCategory={uploadCategory}
          onUploadCategoryChange={setUploadCategory}
          uploadTags={uploadTags}
          onUploadTagsChange={setUploadTags}
          uploading={uploading}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}
