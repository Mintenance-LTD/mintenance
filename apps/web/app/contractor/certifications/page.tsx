'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { Award, Plus, CheckCircle, AlertTriangle, BookOpen, TrendingUp, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { AddCertificationModal } from './components/AddCertificationModal';
import { CertificationCard } from './components/CertificationCard';
import { DBSCheckSection } from './components/DBSCheckSection';
import { TrainingCard } from './components/TrainingCard';
import { logger } from '@mintenance/shared';

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const staggerItem = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

interface Certification {
  id: string; name: string; issuer: string; issueDate: string; expiryDate?: string;
  credentialId?: string; documentUrl?: string; status: 'active' | 'expiring_soon' | 'expired';
  verified: boolean; category: string;
}

interface Training {
  id: string; courseName: string; provider: string; completionDate: string; hours: number;
  certificateUrl?: string; category: string; skills: string[];
}

export default function CertificationsPage2025() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'certifications' | 'training'>('certifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(true);
  const [loadingDBS, setLoadingDBS] = useState(false);
  const [dbsCheckStatus, setDbsCheckStatus] = useState<{ hasCheck: boolean; check?: { status: string; dbsType?: string; certificateNumber?: string; expiryDate?: string; boostPercentage?: number } } | null>(null);
  const [initiatingDBS, setInitiatingDBS] = useState(false);

  const [training, setTraining] = useState<Training[]>([
    { id: '1', courseName: 'Advanced Kitchen Installation Techniques', provider: 'BMF Training', completionDate: '2024-08-15', hours: 16, certificateUrl: '/certs/kitchen-training.pdf', category: 'kitchen', skills: ['Cabinet Installation', 'Worktop Fitting', 'Design Principles'] },
    { id: '2', courseName: 'Smart Home Technology Integration', provider: 'ECA Training', completionDate: '2024-05-20', hours: 8, certificateUrl: '/certs/smart-home.pdf', category: 'electrical', skills: ['Smart Lighting', 'Home Automation', 'IoT Systems'] },
    { id: '3', courseName: 'Modern Heating Systems', provider: 'CIPHE', completionDate: '2024-02-10', hours: 12, category: 'plumbing', skills: ['Heat Pumps', 'Underfloor Heating', 'System Balancing'] },
  ]);

  const categories = [
    { value: 'all', label: 'All Categories' }, { value: 'safety', label: 'Health & Safety' },
    { value: 'electrical', label: 'Electrical' }, { value: 'plumbing', label: 'Plumbing' },
    { value: 'kitchen', label: 'Kitchen' }, { value: 'general', label: 'General' },
  ];

  const handleDeleteCertification = async (id: string, name: string) => {
    if (!confirm(`Delete certification "${name}"?`)) return;
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(`/api/contractor/certifications/${id}`, { method: 'DELETE', headers: { ...csrfHeaders }, credentials: 'include' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to delete certification'); }
      setCertifications(certifications.filter((c) => c.id !== id));
      toast.success('Certification deleted');
    } catch (error) {
      logger.error('Error deleting certification:', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to delete certification');
    }
  };

  const handleDeleteTraining = (id: string, name: string) => {
    if (confirm(`Delete training "${name}"?`)) { setTraining(training.filter((t) => t.id !== id)); toast.success('Training deleted'); }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingCertifications(true);
        const response = await fetch('/api/contractor/certifications', { credentials: 'include' });
        if (response.ok) { const data = await response.json(); setCertifications(data.certifications || []); }
        else logger.error('Failed to fetch certifications', { service: 'app' });
      } catch (error) { logger.error('Error fetching certifications:', error, { service: 'app' }); }
      finally { setLoadingCertifications(false); }

      try {
        setLoadingDBS(true);
        const response = await fetch('/api/contractor/dbs-check', { credentials: 'include' });
        if (response.ok) { const data = await response.json(); setDbsCheckStatus(data); }
      } catch (error) { logger.error('Error fetching DBS check status:', error, { service: 'app' }); }
      finally { setLoadingDBS(false); }
    };
    fetchData();
  }, []);

  const handleInitiateDBSCheck = async (dbsType: 'basic' | 'standard' | 'enhanced' = 'basic') => {
    setInitiatingDBS(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/contractor/dbs-check', { method: 'POST', headers: { 'Content-Type': 'application/json', ...csrfHeaders }, credentials: 'include', body: JSON.stringify({ dbsType, provider: 'dbs_online' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initiate DBS check');
      toast.success('DBS check initiated successfully');
      const statusResponse = await fetch('/api/contractor/dbs-check', { credentials: 'include' });
      if (statusResponse.ok) { const statusData = await statusResponse.json(); setDbsCheckStatus(statusData); }
    } catch (error) {
      logger.error('Error initiating DBS check:', error, { service: 'app' });
      toast.error(error instanceof Error ? error.message : 'Failed to initiate DBS check');
    } finally { setInitiatingDBS(false); }
  };

  const filteredCertifications = certifications.filter((cert) => {
    const matchesSearch = searchQuery === '' || cert.name.toLowerCase().includes(searchQuery.toLowerCase()) || cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (selectedCategory === 'all' || cert.category === selectedCategory);
  });

  const filteredTraining = training.filter((train) => {
    const matchesSearch = searchQuery === '' || train.courseName.toLowerCase().includes(searchQuery.toLowerCase()) || train.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (selectedCategory === 'all' || train.category === selectedCategory);
  });

  const stats = {
    totalCertifications: certifications.length,
    activeCertifications: certifications.filter((c) => c.status === 'active').length,
    expiringSoon: certifications.filter((c) => c.status === 'expiring_soon').length,
    totalTraining: training.length,
    totalHours: training.reduce((sum, t) => sum + t.hours, 0),
  };

  return (
    <div className="min-h-0 bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-gradient-to-r from-emerald-600 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Training & Certifications</h1>
              <p className="text-emerald-100">Manage your professional qualifications and training</p>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium">
              <Plus className="w-5 h-5" />
              Add {activeTab === 'certifications' ? 'Certification' : 'Training'}
            </button>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          {[
            { icon: Award, color: 'emerald', label: 'Total Certifications', value: stats.totalCertifications },
            { icon: CheckCircle, color: 'green', label: 'Active', value: stats.activeCertifications },
            { icon: AlertTriangle, color: 'yellow', label: 'Expiring Soon', value: stats.expiringSoon },
            { icon: BookOpen, color: 'blue', label: 'Training Courses', value: stats.totalTraining },
            { icon: TrendingUp, color: 'purple', label: 'Training Hours', value: `${stats.totalHours}h` },
          ].map((stat) => (
            <MotionDiv key={stat.label} variants={staggerItem} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className={`p-3 bg-${stat.color}-100 rounded-lg mb-4 w-fit`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </MotionDiv>
          ))}
        </MotionDiv>

        {/* Tabs & Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {['certifications', 'training'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 border-b-2 font-medium transition-colors ${activeTab === tab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Search ${activeTab}...`} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
              </select>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'certifications' && (
                <MotionDiv key="certifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  <DBSCheckSection loadingDBS={loadingDBS} dbsCheckStatus={dbsCheckStatus} initiatingDBS={initiatingDBS} onInitiateDBS={handleInitiateDBSCheck} />
                  {filteredCertifications.map((cert) => (
                    <CertificationCard key={cert.id} cert={cert} onDelete={handleDeleteCertification} />
                  ))}
                  {loadingCertifications ? (
                    <div className="text-center py-12"><p className="text-gray-600">Loading certifications...</p></div>
                  ) : filteredCertifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No certifications found</h3>
                      <p className="text-gray-600 mb-6">{searchQuery || selectedCategory !== 'all' ? 'Try adjusting your filters' : 'Add your first certification to get started'}</p>
                    </div>
                  ) : null}
                </MotionDiv>
              )}
              {activeTab === 'training' && (
                <MotionDiv key="training" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  {filteredTraining.map((train) => (
                    <TrainingCard key={train.id} train={train} onDelete={handleDeleteTraining} />
                  ))}
                  {filteredTraining.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No training found</h3>
                      <p className="text-gray-600 mb-6">{searchQuery || selectedCategory !== 'all' ? 'Try adjusting your filters' : 'Add your first training record to get started'}</p>
                    </div>
                  )}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showAddModal && activeTab === 'certifications' && (
        <AddCertificationModal onClose={() => setShowAddModal(false)} onSuccess={(certification) => { setCertifications([...certifications, certification]); setShowAddModal(false); toast.success('Certification added successfully'); }} getCsrfHeaders={getCsrfHeaders as unknown as () => Record<string, string>} />
      )}
      {showAddModal && activeTab === 'training' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Training</h3>
            <p className="text-gray-600 mb-6">Training form coming soon...</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}
