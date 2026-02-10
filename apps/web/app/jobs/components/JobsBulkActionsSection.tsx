'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BulkActionsBar } from './BulkActionsBar';
import { ConfirmationModal } from './ConfirmationModal';
import { logger } from '@/lib/logger';

interface ProcessedJob {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  budget: number;
  created_at: string;
}

interface JobsBulkActionsSectionProps {
  selectionMode: boolean;
  selectedJobs: Set<string>;
  filteredJobs: ProcessedJob[];
  onCancelSelection: () => void;
}

export function JobsBulkActionsSection({
  selectionMode,
  selectedJobs,
  filteredJobs,
  onCancelSelection,
}: JobsBulkActionsSectionProps) {
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleArchive = async () => {
    setBulkActionLoading(true);
    try {
      const archivePromises = Array.from(selectedJobs).map(jobId =>
        fetch(`/api/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' })
        })
      );
      await Promise.all(archivePromises);
      window.location.reload();
    } catch (error) {
      logger.error('Error archiving jobs', error);
      alert('Failed to archive some jobs. Please try again.');
    } finally {
      setBulkActionLoading(false);
      onCancelSelection();
    }
  };

  const handleExport = async () => {
    setBulkActionLoading(true);
    try {
      const selectedJobDetails = filteredJobs.filter(job => selectedJobs.has(job.id));
      const exportData = selectedJobDetails.map(job => ({
        title: job.title,
        description: job.description,
        location: job.location,
        budget: `\u00A3${job.budget.toLocaleString()}`,
        status: job.status,
        created: new Date(job.created_at).toLocaleDateString('en-GB')
      }));

      const csv = [
        ['Title', 'Description', 'Location', 'Budget', 'Status', 'Created'],
        ...exportData.map(job => [
          job.title,
          job.description,
          job.location,
          job.budget,
          job.status,
          job.created
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting jobs', error);
      alert('Failed to export jobs. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setBulkActionLoading(true);
    try {
      const deletePromises = Array.from(selectedJobs).map(jobId =>
        fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);
      window.location.reload();
    } catch (error) {
      logger.error('Error deleting jobs', error);
      alert('Failed to delete some jobs. Please try again.');
    } finally {
      setBulkActionLoading(false);
      setShowDeleteModal(false);
      onCancelSelection();
    }
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectionMode && selectedJobs.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedJobs.size}
            onArchive={handleArchive}
            onExport={handleExport}
            onDelete={() => setShowDeleteModal(true)}
            onCancel={onCancelSelection}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Jobs"
        message={`Are you sure you want to delete ${selectedJobs.size} job(s)? This action cannot be undone and will permanently remove all job data, including bids and messages.`}
        confirmLabel="Delete Jobs"
        cancelLabel="Cancel"
        variant="danger"
        loading={bulkActionLoading}
      />
    </>
  );
}
