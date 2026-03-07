'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FileText, Search, Loader2, File, Image as ImageIcon, Shield, Paperclip } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface Document {
  id: string;
  name: string;
  file_type: string;
  category: string;
  public_url: string;
  is_contract?: boolean;
  contract_id?: string;
  contract_status?: string;
  jobTitle?: string;
  created_at: string;
}

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareDocument: (doc: { name: string; url: string; type: string }) => void;
}

const categoryLabels: Record<string, string> = {
  contracts: 'Contracts',
  photos: 'Photos',
  certifications: 'Certifications',
  insurance: 'Insurance',
  receipts: 'Receipts',
  templates: 'Templates',
  other: 'Other',
};

const fileIcon = (type: string) => {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type === 'contract') return <Shield className="w-5 h-5 text-teal-500" />;
  if (['pdf', 'doc', 'docx'].includes(type)) return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
};

export function ShareDocumentDialog({ open, onOpenChange, onShareDocument }: ShareDocumentDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedCategory('all');
    setSharing(null);

    const loadDocs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/contractor/documents');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err) {
        logger.error('Failed to load documents for sharing', err);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, [open]);

  const categories = ['all', ...new Set(documents.map(d => d.category))];

  const filtered = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return doc.name.toLowerCase().includes(q) || doc.category.toLowerCase().includes(q) || doc.jobTitle?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleShare = (doc: Document) => {
    setSharing(doc.id);
    const url = doc.is_contract ? `/api/contracts/${doc.contract_id}/pdf` : doc.public_url;
    onShareDocument({ name: doc.name, url, type: doc.file_type });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-teal-600" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Select a document from your library to share in the conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              {cat === 'all' ? 'All' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto mt-3 min-h-[200px] max-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              <p className="text-sm text-slate-500">Loading documents...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                {documents.length === 0 ? 'No documents yet. Upload documents from the Documents page.' : 'No documents match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleShare(doc)}
                  disabled={sharing === doc.id}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-all text-left group disabled:opacity-60"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-50">
                    {fileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {categoryLabels[doc.category] || doc.category}
                      {doc.jobTitle ? ` — ${doc.jobTitle}` : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {sharing === doc.id ? (
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                    ) : (
                      <span className="text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Share
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
