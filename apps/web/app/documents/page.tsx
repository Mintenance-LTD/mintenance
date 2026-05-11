'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Gavel,
  CreditCard,
  Search,
  AlertCircle,
  Loader2,
  FolderOpen,
  ArrowUpDown,
  XCircle,
} from 'lucide-react';
import {
  DocumentRow,
  StatCard,
  type DocumentItem,
} from './components/DocumentRow';

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

// Status/type/date helpers + DocumentRow + StatCard + SignaturePill
// extracted to ./components/DocumentRow.tsx to keep this file under
// the 500-line MDC cap.

// ─── Main Component ──────────────────────────────────────────────────
export default function HomeownerDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [counts, setCounts] = useState({
    contracts: 0,
    bids: 0,
    payments: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  // Mint Editorial theme detection — swaps the header + stat cards to
  // the canonical .t-h1 / .kpi pattern from the design system reference
  // (project/redesign-v2/components.css). Legacy gradient-tile design
  // stays for users on the default theme.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);
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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocs = useMemo(() => {
    let docs = documents;

    // Filter by tab
    if (activeTab !== 'all') {
      const typeMap: Record<string, string> = {
        contracts: 'contract',
        bids: 'bid',
        payments: 'payment',
      };
      docs = docs.filter((d) => d.type === typeMap[activeTab]);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.contractor_name?.toLowerCase().includes(q) ||
          d.job_title?.toLowerCase().includes(q) ||
          d.status.toLowerCase().includes(q)
      );
    }

    // Sort
    docs = [...docs].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'amount-high':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount-low':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return docs;
  }, [documents, activeTab, searchQuery, sortBy]);

  const tabs: {
    key: TabKey;
    label: string;
    count: number;
    icon: typeof FileText;
  }[] = [
    { key: 'all', label: 'All', count: counts.total, icon: FolderOpen },
    {
      key: 'contracts',
      label: 'Contracts',
      count: counts.contracts,
      icon: FileText,
    },
    { key: 'bids', label: 'Bids', count: counts.bids, icon: Gavel },
    {
      key: 'payments',
      label: 'Payments',
      count: counts.payments,
      icon: CreditCard,
    },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount-high', label: 'Amount: High to Low' },
    { value: 'amount-low', label: 'Amount: Low to High' },
  ];

  // Stat cards for the header
  const needsAttention = documents.filter(
    (d) =>
      (d.type === 'contract' && d.status === 'pending_homeowner') ||
      (d.type === 'bid' && d.status === 'pending')
  ).length;

  return (
    <div className='max-w-6xl mx-auto'>
      {/* ─── Page Header ─────────────────────────────────── */}
      {isMintEditorial ? (
        <div className='col' style={{ gap: 4, marginBottom: 22 }}>
          <h1 className='t-h1'>Documents</h1>
          <p className='t-body'>
            All your contracts, bids, and payment records in one place.
          </p>
        </div>
      ) : (
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center'>
              <FolderOpen className='h-5 w-5 text-white' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Documents</h1>
              <p className='text-sm text-gray-500'>
                All your contracts, bids, and payment records in one place
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stat Cards ──────────────────────────────────── */}
      {isMintEditorial ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div className='kpi'>
            <div className='label'>Total documents</div>
            <div className='num'>{counts.total}</div>
            <div className='sub'>
              <span>contracts, bids & payments</span>
            </div>
          </div>
          <div className='kpi'>
            <div className='label'>Contracts</div>
            <div className='num'>{counts.contracts}</div>
            <div className='sub'>
              <span>signed & in flight</span>
            </div>
          </div>
          <div className='kpi'>
            <div className='label'>Bids received</div>
            <div className='num'>{counts.bids}</div>
            <div className='sub'>
              <span>from contractors</span>
            </div>
          </div>
          {needsAttention > 0 ? (
            <div className='kpi'>
              <div className='label'>Needs attention</div>
              <div className='num'>{needsAttention}</div>
              <div className='sub'>
                <span>awaiting your response</span>
              </div>
            </div>
          ) : (
            <div className='kpi'>
              <div className='label'>Payments</div>
              <div className='num'>{counts.payments}</div>
              <div className='sub'>
                <span>transactions on file</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <StatCard
            label='Total Documents'
            value={counts.total}
            icon={FolderOpen}
            color='indigo'
          />
          <StatCard
            label='Contracts'
            value={counts.contracts}
            icon={FileText}
            color='blue'
          />
          <StatCard
            label='Bids Received'
            value={counts.bids}
            icon={Gavel}
            color='violet'
          />
          {needsAttention > 0 ? (
            <StatCard
              label='Needs Attention'
              value={needsAttention}
              icon={AlertCircle}
              color='amber'
              highlight
            />
          ) : (
            <StatCard
              label='Payments'
              value={counts.payments}
              icon={CreditCard}
              color='teal'
            />
          )}
        </div>
      )}

      {/* ─── Tabs + Search ───────────────────────────────── */}
      <div className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
        {/* Tab Bar */}
        <div className='flex items-center gap-1 p-1.5 bg-gray-50 border-b border-gray-200'>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className='h-4 w-4' />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                    activeTab === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Sort Bar */}
        <div className='flex items-center gap-3 p-4 border-b border-gray-100'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='Search by name, contractor, or job...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                <XCircle className='h-4 w-4' />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className='relative'>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className='flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors'
            >
              <ArrowUpDown className='h-4 w-4 text-gray-400' />
              <span className='hidden sm:inline'>
                {sortOptions.find((o) => o.value === sortBy)?.label}
              </span>
            </button>
            {showSortMenu && (
              <>
                <div
                  className='fixed inset-0 z-10'
                  onClick={() => setShowSortMenu(false)}
                />
                <div className='absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1'>
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                        sortBy === opt.value
                          ? 'text-indigo-700 font-medium bg-indigo-50/50'
                          : 'text-gray-700'
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
        <div className='divide-y divide-gray-100'>
          {loading ? (
            <div className='flex items-center justify-center py-20'>
              <Loader2 className='h-6 w-6 animate-spin text-indigo-500 mr-3' />
              <span className='text-gray-500'>Loading documents...</span>
            </div>
          ) : error ? (
            <div className='flex flex-col items-center justify-center py-20 text-red-500'>
              <AlertCircle className='h-8 w-8 mb-3' />
              <p className='text-sm'>{error}</p>
              <button
                onClick={fetchDocuments}
                className='mt-3 text-sm text-indigo-600 hover:underline'
              >
                Try again
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20'>
              <div className='w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4'>
                <FolderOpen className='h-8 w-8 text-gray-400' />
              </div>
              <p className='text-gray-900 font-medium mb-1'>
                {searchQuery ? 'No results found' : 'No documents yet'}
              </p>
              <p className='text-sm text-gray-500'>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Documents will appear here as you create jobs and receive bids'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => <DocumentRow key={doc.id} doc={doc} />)
          )}
        </div>

        {/* Footer count */}
        {!loading && filteredDocs.length > 0 && (
          <div className='px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500'>
            Showing {filteredDocs.length} of {counts.total} documents
          </div>
        )}
      </div>
    </div>
  );
}
