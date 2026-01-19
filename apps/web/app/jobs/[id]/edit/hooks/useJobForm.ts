import { useState, useCallback } from 'react';
export interface JobFormData {
  title: string;
  category: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  budget: {
    min: string;
    max: string;
  };
  timeline: {
    startDate: string;
    endDate: string;
    flexible: boolean;
  };
  location: {
    address: string;
    city: string;
    postcode: string;
  };
  propertyType: string;
  accessInfo: string;
  images: string[];
  requirements: string[];
}
const initialFormData: JobFormData = {
  title: '',
  category: '',
  description: '',
  urgency: 'medium',
  budget: {
    min: '',
    max: '',
  },
  timeline: {
    startDate: '',
    endDate: '',
    flexible: false,
  },
  location: {
    address: '',
    city: '',
    postcode: '',
  },
  propertyType: 'house',
  accessInfo: '',
  images: [],
  requirements: [],
};
export function useJobForm(initialData?: Partial<JobFormData>) {
  const [formData, setFormData] = useState<JobFormData>({
    ...initialFormData,
    ...initialData,
  });
  const updateField = useCallback((field: string, value: string | boolean) => {
    setFormData((prev) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev as unknown)[parent],
            [child]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  }, []);
  const updateImages = useCallback((images: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images,
    }));
  }, []);
  const addImage = useCallback((image: string) => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, image],
    }));
  }, []);
  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);
  const updateRequirements = useCallback((requirements: string[]) => {
    setFormData((prev) => ({
      ...prev,
      requirements,
    }));
  }, []);
  const addRequirement = useCallback((requirement: string) => {
    if (requirement.trim()) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...prev.requirements, requirement.trim()],
      }));
    }
  }, []);
  const removeRequirement = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  }, []);
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);
  return {
    formData,
    updateField,
    updateImages,
    addImage,
    removeImage,
    updateRequirements,
    addRequirement,
    removeRequirement,
    resetForm,
    setFormData,
  };
}