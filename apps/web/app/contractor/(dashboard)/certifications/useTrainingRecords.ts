'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

export interface Training {
  id: string;
  courseName: string;
  provider: string;
  completionDate: string;
  hours: number;
  certificateUrl?: string;
  category: string;
  skills: string[];
}

export function useTrainingRecords() {
  const confirm = useConfirm();

  const [training, setTraining] = useState<Training[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(true);

  // Training form state
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [submittingTraining, setSubmittingTraining] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(
    null
  );
  const [tFormCourseName, setTFormCourseName] = useState('');
  const [tFormProvider, setTFormProvider] = useState('');
  const [tFormCompletionDate, setTFormCompletionDate] = useState('');
  const [tFormHours, setTFormHours] = useState('');
  const [tFormCategory, setTFormCategory] = useState('general');
  const [tFormSkills, setTFormSkills] = useState('');

  const fetchTraining = useCallback(async () => {
    try {
      setLoadingTraining(true);
      const res = await fetch('/api/contractor/training', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTraining(data.training || []);
      }
    } catch (error) {
      logger.error('Error fetching training:', error, { service: 'app' });
    } finally {
      setLoadingTraining(false);
    }
  }, []);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  const resetTrainingForm = () => {
    setEditingTrainingId(null);
    setTFormCourseName('');
    setTFormProvider('');
    setTFormCompletionDate('');
    setTFormHours('');
    setTFormCategory('general');
    setTFormSkills('');
  };

  const handleDeleteTraining = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete training "${name}"?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const previous = [...training];
    setTraining(training.filter((t) => t.id !== id));
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/contractor/training?id=${id}`, {
        method: 'DELETE',
        headers: { ...csrfHeaders },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Training deleted');
    } catch (error) {
      setTraining(previous);
      toast.error('Failed to delete training record');
    }
  };

  const handleEditTraining = (id: string) => {
    const t = training.find((tr) => tr.id === id);
    if (!t) return;
    setEditingTrainingId(id);
    setTFormCourseName(t.courseName);
    setTFormProvider(t.provider);
    setTFormCompletionDate(t.completionDate);
    setTFormHours(String(t.hours));
    setTFormCategory(t.category);
    setTFormSkills(t.skills.join(', '));
    setShowTrainingModal(true);
  };

  const handleAddTraining = async () => {
    if (!tFormCourseName.trim()) {
      toast.error('Course name is required');
      return;
    }
    if (!tFormProvider.trim()) {
      toast.error('Provider is required');
      return;
    }
    if (!tFormCompletionDate) {
      toast.error('Completion date is required');
      return;
    }

    setSubmittingTraining(true);
    const payload = {
      courseName: tFormCourseName.trim(),
      provider: tFormProvider.trim(),
      completionDate: tFormCompletionDate,
      hours: Number(tFormHours) || 0,
      category: tFormCategory,
      skills: tFormSkills
        ? tFormSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    try {
      const csrfHeaders = await getCsrfHeaders();

      if (editingTrainingId) {
        const res = await fetch('/api/contractor/training', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ id: editingTrainingId, ...payload }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update training');
        }
        setTraining((prev) =>
          prev.map((t) =>
            t.id === editingTrainingId ? { ...t, ...payload } : t
          )
        );
        toast.success('Training record updated');
      } else {
        const res = await fetch('/api/contractor/training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add training');
        }
        const data = await res.json();
        setTraining((prev) => [data.training, ...prev]);
        toast.success('Training record added');
      }

      setShowTrainingModal(false);
      resetTrainingForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save training'
      );
    } finally {
      setSubmittingTraining(false);
    }
  };

  return {
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
    fetchTraining,
    resetTrainingForm,
    handleDeleteTraining,
    handleEditTraining,
    handleAddTraining,
  };
}
