'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Award, BookOpen, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { AddCertificationModal } from './components/AddCertificationModal';
import { CertificationCard } from './components/CertificationCard';
import { CertificationsHeader } from './components/CertificationsHeader';
import { CertificationStats } from './components/CertificationStats';
import { DBSCheckSection } from './components/DBSCheckSection';
import { TrainingCard } from './components/TrainingCard';
import { TrainingFormModal } from './components/TrainingFormModal';
import { useTrainingRecords } from './useTrainingRecords';
import { logger } from '@mintenance/shared';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  documentUrl?: string;
  status: 'active' | 'expiring_soon' | 'expired';
  verified: boolean;
  category: string;
}

export default function CertificationsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'certifications' | 'training'>(
    'certifications'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  // Hydration-safe theme detection — Phase-4 contractor port pattern.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(true);
  const [loadingDBS, setLoadingDBS] = useState(false);
  const [dbsCheckStatus, setDbsCheckStatus] = useState<{
    hasCheck: boolean;
    check?: {
      status: string;
      dbsType?: string;
      certificateNumber?: string;
      expiryDate?: string;
      boostPercentage?: number;
    };
  } | null>(null);
  const [initiatingDBS, setInitiatingDBS] = useState(false);

  const {
    training,
    loadingTraining,
    showTrainingModal,
    setShowTrainingModal,
    submittingTraining,
    editingTrainingId,
    tFormCourseName,
    setTFormCourseName,
    tFormProvider,
    setTFormProvider,
    tFormCompletionDate,
    setTFormCompletionDate,
    tFormHours,
    setTFormHours,
    tFormCategory,
    setTFormCategory,
    tFormSkills,
    setTFormSkills,
    resetTrainingForm,
    handleDeleteTraining,
    handleEditTraining,
    handleAddTraining,
  } = useTrainingRecords();

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'safety', label: 'Health & Safety' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'general', label: 'General' },
  ];

  const handleDeleteCertification = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete certification "${name}"?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(`/api/contractor/certifications/${id}`, {
        method: 'DELETE',
        headers: { ...csrfHeaders },
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete certification');
      }
      setCertifications(certifications.filter((c) => c.id !== id));
      toast.success('Certification deleted');
    } catch (error) {
      logger.error('Error deleting certification:', error, { service: 'app' });
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete certification'
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingCertifications(true);
        const response = await fetch('/api/contractor/certifications', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCertifications(data.certifications || []);
        } else
          logger.error('Failed to fetch certifications', { service: 'app' });
      } catch (error) {
        logger.error('Error fetching certifications:', error, {
          service: 'app',
        });
      } finally {
        setLoadingCertifications(false);
      }

      try {
        setLoadingDBS(true);
        const response = await fetch('/api/contractor/dbs-check', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setDbsCheckStatus(data);
        }
      } catch (error) {
        logger.error('Error fetching DBS check status:', error, {
          service: 'app',
        });
      } finally {
        setLoadingDBS(false);
      }
    };
    fetchData();
  }, []);

  const handleInitiateDBSCheck = async (
    dbsType: 'basic' | 'standard' | 'enhanced' = 'basic'
  ) => {
    setInitiatingDBS(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/contractor/dbs-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ dbsType, provider: 'dbs_online' }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || 'Failed to initiate DBS check');
      toast.success('DBS check initiated successfully');
      const statusResponse = await fetch('/api/contractor/dbs-check', {
        credentials: 'include',
      });
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setDbsCheckStatus(statusData);
      }
    } catch (error) {
      logger.error('Error initiating DBS check:', error, { service: 'app' });
      toast.error(
        error instanceof Error ? error.message : 'Failed to initiate DBS check'
      );
    } finally {
      setInitiatingDBS(false);
    }
  };

  const handleEditCertification = (id: string) => {
    router.push(`/contractor/certifications/${id}/edit`);
  };

  const filteredCertifications = certifications.filter((cert) => {
    const matchesSearch =
      searchQuery === '' ||
      cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    return (
      matchesSearch &&
      (selectedCategory === 'all' || cert.category === selectedCategory)
    );
  });

  const filteredTraining = training.filter((train) => {
    const matchesSearch =
      searchQuery === '' ||
      train.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return (
      matchesSearch &&
      (selectedCategory === 'all' || train.category === selectedCategory)
    );
  });

  const stats = {
    totalCertifications: certifications.length,
    activeCertifications: certifications.filter((c) => c.status === 'active')
      .length,
    expiringSoon: certifications.filter((c) => c.status === 'expiring_soon')
      .length,
    totalTraining: training.length,
    totalHours: training.reduce((sum, t) => sum + t.hours, 0),
  };

  return (
    <div
      className={
        isMintEditorial
          ? 'min-h-0'
          : 'min-h-0 bg-gradient-to-br from-emerald-50 via-white to-red-50'
      }
    >
      <CertificationsHeader
        isMintEditorial={isMintEditorial}
        activeTab={activeTab}
        onAdd={() => {
          if (activeTab === 'certifications') setShowAddModal(true);
          else {
            resetTrainingForm();
            setShowTrainingModal(true);
          }
        }}
      />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <CertificationStats
          totalCertifications={stats.totalCertifications}
          activeCertifications={stats.activeCertifications}
          expiringSoon={stats.expiringSoon}
          totalTraining={stats.totalTraining}
          totalHours={stats.totalHours}
        />

        {/* Tabs & Content */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 mb-6'>
          <div className='border-b border-gray-200'>
            <nav className='flex gap-8 px-6'>
              {['certifications', 'training'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 border-b-2 font-medium transition-colors ${activeTab === tab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className='p-6'>
            {/* Filters */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence mode='wait'>
              {activeTab === 'certifications' && (
                <MotionDiv
                  key='certifications'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className='space-y-4'
                >
                  <DBSCheckSection
                    loadingDBS={loadingDBS}
                    dbsCheckStatus={dbsCheckStatus}
                    initiatingDBS={initiatingDBS}
                    onInitiateDBS={handleInitiateDBSCheck}
                  />
                  {filteredCertifications.map((cert) => (
                    <CertificationCard
                      key={cert.id}
                      cert={cert}
                      onDelete={handleDeleteCertification}
                      onEdit={handleEditCertification}
                    />
                  ))}
                  {loadingCertifications ? (
                    <div className='text-center py-12'>
                      <Loader2 className='w-8 h-8 animate-spin text-teal-600 mx-auto' />
                    </div>
                  ) : filteredCertifications.length === 0 ? (
                    <div className='text-center py-12'>
                      <Award className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        No certifications found
                      </h3>
                      <p className='text-gray-600 mb-6'>
                        {searchQuery || selectedCategory !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add your first certification to get started'}
                      </p>
                    </div>
                  ) : null}
                </MotionDiv>
              )}
              {activeTab === 'training' && (
                <MotionDiv
                  key='training'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className='space-y-4'
                >
                  {loadingTraining ? (
                    <div className='text-center py-12'>
                      <Loader2 className='w-8 h-8 animate-spin text-teal-600 mx-auto' />
                    </div>
                  ) : (
                    <>
                      {filteredTraining.map((train) => (
                        <TrainingCard
                          key={train.id}
                          train={train}
                          onDelete={handleDeleteTraining}
                          onEdit={handleEditTraining}
                        />
                      ))}
                      {filteredTraining.length === 0 && (
                        <div className='text-center py-12'>
                          <BookOpen className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                            No training found
                          </h3>
                          <p className='text-gray-600 mb-6'>
                            {searchQuery || selectedCategory !== 'all'
                              ? 'Try adjusting your filters'
                              : 'Add your first training record to get started'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showAddModal && activeTab === 'certifications' && (
        <AddCertificationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(certification) => {
            setCertifications([...certifications, certification]);
            setShowAddModal(false);
            toast.success('Certification added successfully');
          }}
          getCsrfHeaders={
            getCsrfHeaders as unknown as () => Record<string, string>
          }
        />
      )}

      {/* Add Training Modal */}
      <TrainingFormModal
        open={showTrainingModal || (showAddModal && activeTab === 'training')}
        tFormCourseName={tFormCourseName}
        setTFormCourseName={setTFormCourseName}
        tFormProvider={tFormProvider}
        setTFormProvider={setTFormProvider}
        tFormCompletionDate={tFormCompletionDate}
        setTFormCompletionDate={setTFormCompletionDate}
        tFormHours={tFormHours}
        setTFormHours={setTFormHours}
        tFormCategory={tFormCategory}
        setTFormCategory={setTFormCategory}
        tFormSkills={tFormSkills}
        setTFormSkills={setTFormSkills}
        categories={categories}
        editingTrainingId={editingTrainingId}
        submittingTraining={submittingTraining}
        onClose={() => {
          setShowTrainingModal(false);
          setShowAddModal(false);
          resetTrainingForm();
        }}
        onSubmit={handleAddTraining}
      />
    </div>
  );
}
