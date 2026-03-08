'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Gavel,
  CreditCard,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  PoundSterling,
  Building2,
  User,
  CalendarDays,
  FolderOpen,
  ArrowUpDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────
interface DocumentItem {
  id: string;
  type: 'contract' | 'bid' | 'payment';
  name: string;
  status: string;
  amount: number | null;
  job_id: string;
  job_title?: string;
  contractor_name?: string;
  contractor_signed?: boolean;
  homeowner_signed?: boolean;
  message?: string | null;
  created_at: string;
  updated_at: string;
  href: string;
}

interface ApiResponse {
  documents: DocumentItem[];
  counts: {
    contracts: number;
    bids: number;
    payments: number;
    total: number;
  };
}

type TabKey = 'all' | 'contracts' | 'bids' | 'payments';
type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

// ─── Status Helpers ──────────────────────────────────────────────────
function getStatusConfig(type: string, status: string) {
  if (type === 'contract') {
    const map: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
      accepted: { label: 'Fully Signed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
      pending_contractor: { label: 'Awaiting Contractor', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
      pending_homeowner: { label: 'Awaiting Your Signature', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: AlertCircle },
      sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
      rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
    };
    return map[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Clock };
  }
  if (type === 'bid') {
    const map: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
      accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
      pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
      rejected: { label: 'Declined', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
    };
    return map[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Clock };
  }
  // payment
  const map: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
    held: { label: 'In Escrow', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CreditCard },
    released: { label: 'Released', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    release_pending: { label: 'Release Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    pending: { label: 'Processing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Loader2 },
    refunded: { label: 'Refunded', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: XCircle },
  };
  return map[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: Clock };
}

function getTypeConfig(type: string) {
  const map: Record<string, { label: string; icon: typeof FileText; color: string; bgColor: string }> = {
    contract: { label: 'Contract', icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    bid: { label: 'Bid', icon: Gavel, color: 'text-violet-600', bgColor: 'bg-violet-50' },
    payment: { label: 'Payment', icon: CreditCard, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  };
  return map[type] || { label: type, icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatRelative(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateString);
}

// ─── Main Component ──────────────────────────────────────────────────
export default function HomeownerDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [counts, setCounts] = useState({ contracts: 0, bids: 0, payments: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data: ApiResponse = await res.json();
      setDocuments(data.documents);
      setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filteredDocs = useMemo(() => {
    let docs = documents;

    // Filter by tab
    if (activeTab !== 'all') {
      const typeMap: Record<string, string> = { contracts: 'contract', bids: 'bid', payments: 'payment' };
      docs = docs.filter(d => d.type === typeMap[activeTab]);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.contractor_name?.toLowerCase().includes(q) ||
        d.job_title?.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    }

    // Sort
    docs = [...docs].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-high': return (b.amount || 0) - (a.amount || 0);
        case 'amount-low': return (a.amount || 0) - (b.amount || 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return docs;
  }, [documents, activeTab, searchQuery, sortBy]);

  const tabs: { key: TabKey; label: string; count: number; icon: typeof FileText }[] = [
    { key: 'all', label: 'All', count: counts.total, icon: FolderOpen },
    { key: 'contracts', label: 'Contracts', count: counts.contracts, icon: FileText },
    { key: 'bids', label: 'Bids', count: counts.bids, icon: Gavel },
    { key: 'payments', label: 'Payments', count: counts.payments, icon: CreditCard },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount-high', label: 'Amount: High to Low' },
    { value: 'amount-low', label: 'Amount: Low to High' },
  ];

  // Stat cards for the header
  const needsAttention = documents.filter(d =>
    (d.type === 'contract' && d.status === 'pending_homeowner') ||
    (d.type === 'bid' && d.status === 'pending')
  ).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500">All your contracts, bids, and payment records in one place</p>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Documents"
          value={counts.total}
          icon={FolderOpen}
          color="indigo"
        />
        <StatCard
          label="Contracts"
          value={counts.contracts}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Bids Received"
          value={counts.bids}
          icon={Gavel}
          color="violet"
        />
        {needsAttention > 0 ? (
          <StatCard
            label="Needs Attention"
            value={needsAttention}
            icon={AlertCircle}
            color="amber"
            highlight
          />
        ) : (
          <StatCard
            label="Payments"
            value={counts.payments}
            icon={CreditCard}
            color="teal"
          />
        )}
      </div>

      {/* ─── Tabs + Search ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1.5 bg-gray-50 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                  activeTab === tab.key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Sort Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, contractor, or job..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <span className="hidden sm:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                        sortBy === opt.value ? 'text-indigo-700 font-medium bg-indigo-50/50' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Document List ─────────────────────────────── */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
              <span className="text-gray-500">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-3" />
              <p className="text-sm">{error}</p>
              <button onClick={fetchDocuments} className="mt-3 text-sm text-indigo-600 hover:underline">
                Try again
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">
                {searchQuery ? 'No results found' : 'No documents yet'}
              </p>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Documents will appear here as you create jobs and receive bids'}
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <DocumentRow key={doc.id} doc={doc} />
            ))
          )}
        </div>

        {/* Footer count */}
        {!loading && filteredDocs.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            Showing {filteredDocs.length} of {counts.total} documents
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, highlight }: {
  label: string;
  value: number;
  icon: typeof FileText;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; accent: string }> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', accent: 'border-indigo-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'border-blue-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', accent: 'border-violet-200' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', accent: 'border-teal-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'border-amber-200' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border p-4 transition-all ${highlight ? `${c.bg} ${c.accent} ring-1 ring-amber-200` : `bg-white border-gray-200`}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${c.text}`} />
        </div>
        {highlight && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800">
            Action needed
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function DocumentRow({ doc }: { doc: DocumentItem }) {
  const typeConfig = getTypeConfig(doc.type);
  const statusConfig = getStatusConfig(doc.type, doc.status);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  return (
    <Link href={doc.href} className="group">
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
        {/* Type Icon */}
        <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
          <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {doc.name}
            </h3>
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {doc.contractor_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {doc.contractor_name}
              </span>
            )}
            {doc.job_title && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {doc.job_title}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatRelative(doc.created_at)}
            </span>
          </div>

          {/* Bid message preview */}
          {doc.type === 'bid' && doc.message && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">
              &ldquo;{doc.message}&rdquo;
            </p>
          )}

          {/* Contract signing progress */}
          {doc.type === 'contract' && doc.status !== 'accepted' && doc.status !== 'rejected' && (
            <div className="flex items-center gap-3 mt-1.5">
              <SignaturePill label="You" signed={!!doc.homeowner_signed} />
              <SignaturePill label="Contractor" signed={!!doc.contractor_signed} />
            </div>
          )}
        </div>

        {/* Amount + Arrow */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {doc.amount != null && doc.amount > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-base font-bold text-gray-900">
                <PoundSterling className="h-3.5 w-3.5 text-gray-400" />
                {doc.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                {doc.type === 'payment' ? 'Paid' : 'Amount'}
              </div>
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function SignaturePill({ label, signed }: { label: string; signed: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
      signed
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      {signed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
      {label}: {signed ? 'Signed' : 'Pending'}
    </span>
  );
}
