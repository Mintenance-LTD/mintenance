import { renderHook, act } from '@testing-library/react';
import { useJobForm, JobFormData } from '../useJobForm';

describe('useJobForm', () => {
  const initialData: Partial<JobFormData> = {
    title: 'Fix leaky faucet',
    category: 'Plumbing',
    description: 'Kitchen faucet is dripping',
    urgency: 'medium',
    budget: { min: '50', max: '150' },
  };

  it('should initialize with default values when no initial data provided', () => {
    const { result } = renderHook(() => useJobForm());

    expect(result.current.formData.title).toBe('');
    expect(result.current.formData.category).toBe('');
    expect(result.current.formData.urgency).toBe('medium');
    expect(result.current.formData.images).toEqual([]);
    expect(result.current.formData.requirements).toEqual([]);
  });

  it('should initialize with provided data', () => {
    const { result } = renderHook(() => useJobForm(initialData));

    expect(result.current.formData.title).toBe('Fix leaky faucet');
    expect(result.current.formData.category).toBe('Plumbing');
    expect(result.current.formData.urgency).toBe('medium');
  });

  describe('updateField', () => {
    it('should update simple fields', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.updateField('title', 'New Title');
      });

      expect(result.current.formData.title).toBe('New Title');
    });

    it('should update nested fields', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.updateField('budget.min', '100');
      });

      expect(result.current.formData.budget.min).toBe('100');
    });

    it('should update boolean fields', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.updateField('timeline.flexible', true);
      });

      expect(result.current.formData.timeline.flexible).toBe(true);
    });
  });

  describe('Image management', () => {
    it('should add an image', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.addImage('https://example.com/image1.jpg');
      });

      expect(result.current.formData.images).toContain('https://example.com/image1.jpg');
    });

    it('should remove an image by index', () => {
      const { result } = renderHook(() =>
        useJobForm({ images: ['img1.jpg', 'img2.jpg', 'img3.jpg'] })
      );

      act(() => {
        result.current.removeImage(1); // Remove 'img2.jpg'
      });

      expect(result.current.formData.images).toEqual(['img1.jpg', 'img3.jpg']);
    });

    it('should update all images', () => {
      const { result } = renderHook(() => useJobForm());
      const newImages = ['new1.jpg', 'new2.jpg'];

      act(() => {
        result.current.updateImages(newImages);
      });

      expect(result.current.formData.images).toEqual(newImages);
    });
  });

  describe('Requirements management', () => {
    it('should add a requirement', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.addRequirement('Must have insurance');
      });

      expect(result.current.formData.requirements).toContain('Must have insurance');
    });

    it('should trim whitespace from requirements', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.addRequirement('  Trimmed requirement  ');
      });

      expect(result.current.formData.requirements).toContain('Trimmed requirement');
    });

    it('should not add empty requirements', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.addRequirement('   ');
      });

      expect(result.current.formData.requirements).toHaveLength(0);
    });

    it('should remove a requirement by index', () => {
      const { result } = renderHook(() =>
        useJobForm({ requirements: ['Req1', 'Req2', 'Req3'] })
      );

      act(() => {
        result.current.removeRequirement(0);
      });

      expect(result.current.formData.requirements).toEqual(['Req2', 'Req3']);
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useJobForm());

      // Make some changes
      act(() => {
        result.current.updateField('title', 'Modified Title');
        result.current.addImage('test.jpg');
        result.current.addRequirement('New requirement');
      });

      // Reset
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData.title).toBe('');
      expect(result.current.formData.images).toHaveLength(0);
      expect(result.current.formData.requirements).toHaveLength(0);
    });
  });

  describe('setFormData', () => {
    it('should set entire form data', () => {
      const { result } = renderHook(() => useJobForm());
      const newData: JobFormData = {
        title: 'Complete new data',
        category: 'Electrical',
        description: 'New description',
        urgency: 'high',
        budget: { min: '200', max: '500' },
        timeline: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          flexible: false,
        },
        location: {
          address: '123 Main St',
          city: 'New York',
          postcode: '10001',
        },
        propertyType: 'apartment',
        accessInfo: 'Call first',
        images: ['new-img.jpg'],
        requirements: ['New requirement'],
      };

      act(() => {
        result.current.setFormData(newData);
      });

      expect(result.current.formData).toEqual(newData);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const { result } = renderHook(() => useJobForm());

      act(() => {
        result.current.updateField('title', 'Complex Job');
        result.current.updateField('budget.min', '100');
        result.current.updateField('budget.max', '300');
        result.current.addImage('img1.jpg');
        result.current.addImage('img2.jpg');
        result.current.removeImage(0);
        result.current.addRequirement('Requirement 1');
        result.current.addRequirement('Requirement 2');
      });

      expect(result.current.formData.title).toBe('Complex Job');
      expect(result.current.formData.budget).toEqual({ min: '100', max: '300' });
      expect(result.current.formData.images).toEqual(['img2.jpg']);
      expect(result.current.formData.requirements).toHaveLength(2);
    });

    it('should maintain immutability', () => {
      const { result } = renderHook(() => useJobForm());
      const originalFormData = result.current.formData;

      act(() => {
        result.current.updateField('title', 'New Title');
      });

      expect(result.current.formData).not.toBe(originalFormData);
      expect(originalFormData.title).toBe('');
    });
  });
});