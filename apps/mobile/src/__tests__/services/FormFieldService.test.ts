import { FormFieldService, FormField } from '../../services/form-management/FormFieldService';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase');

// Mock serviceHelper
jest.mock('../../utils/serviceHelper', () => ({
  handleDatabaseOperation: jest.fn().mockImplementation(async (operation) => {
    const result = await operation();
    if (result.error) {
      throw new Error('Database operation failed');
    }
    return result.data;
  }),
  validateRequired: jest.fn((value, fieldName) => {
    if (!value || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  })
}));

// Mock service health monitor
jest.mock('../../utils/serviceHealthMonitor', () => ({
  serviceHealthMonitor: {
    recordServiceOperation: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('FormFieldService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTemplateId = 'template-123';
  const mockFieldData = {
    field_name: 'test_field',
    field_label: 'Test Field',
    field_type: 'text' as const,
    is_required: true,
    is_readonly: false,
    is_hidden: false,
    sort_order: 1,
    field_width: '100%'
  };

  const mockFormField: FormField = {
    id: 'field-123',
    template_id: mockTemplateId,
    ...mockFieldData,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  describe('createFormField', () => {
    it('should create a form field successfully', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: mockFormField, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.from = mockFrom;

      const result = await FormFieldService.createFormField(mockTemplateId, mockFieldData);

      expect(mockFrom).toHaveBeenCalledWith('form_fields');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        template_id: mockTemplateId,
        ...mockFieldData
      }));
      expect(result).toEqual(mockFormField);
    });

    it('should validate required template ID', async () => {
      await expect(
        FormFieldService.createFormField('', mockFieldData)
      ).rejects.toThrow('templateId is required');
    });
  });

  describe('getFormFields', () => {
    it('should fetch form fields for a template', async () => {
      const mockFields = [mockFormField];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockFields, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await FormFieldService.getFormFields(mockTemplateId);

      expect(mockFrom).toHaveBeenCalledWith('form_fields');
      expect(mockEq).toHaveBeenCalledWith('template_id', mockTemplateId);
      expect(mockOrder).toHaveBeenCalledWith('sort_order');
      expect(result).toEqual(mockFields);
    });

    it('should validate template ID', async () => {
      await expect(
        FormFieldService.getFormFields('')
      ).rejects.toThrow('templateId is required');
    });
  });

  describe('updateFormField', () => {
    it('should update a form field', async () => {
      const fieldId = 'field-123';
      const updateData = { field_label: 'Updated Field' };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockFormField, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      const result = await FormFieldService.updateFormField(fieldId, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String)
      }));
      expect(result).toEqual(mockFormField);
    });
  });

  describe('deleteFormField', () => {
    it('should delete a form field', async () => {
      const fieldId = 'field-123';

      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      mockSupabase.from = mockFrom;

      await FormFieldService.deleteFormField(fieldId);

      expect(mockFrom).toHaveBeenCalledWith('form_fields');
      expect(mockEq).toHaveBeenCalledWith('id', fieldId);
    });
  });

  describe('reorderFormFields', () => {
    it('should reorder form fields', async () => {
      const fieldOrders = [
        { id: 'field-1', sort_order: 2 },
        { id: 'field-2', sort_order: 1 }
      ];

      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      await FormFieldService.reorderFormFields(mockTemplateId, fieldOrders);

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockEq).toHaveBeenCalledWith('id', 'field-1');
      expect(mockEq).toHaveBeenCalledWith('id', 'field-2');
    });
  });

  describe('validateFormData', () => {
    const mockFields: FormField[] = [
      {
        id: 'field-1',
        template_id: 'template-1',
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email',
        is_required: true,
        is_readonly: false,
        is_hidden: false,
        sort_order: 1,
        field_width: '100%',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: 'field-2',
        template_id: 'template-1',
        field_name: 'phone',
        field_label: 'Phone',
        field_type: 'phone',
        is_required: false,
        is_readonly: false,
        is_hidden: false,
        sort_order: 2,
        field_width: '100%',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: 'field-3',
        template_id: 'template-1',
        field_name: 'age',
        field_label: 'Age',
        field_type: 'number',
        is_required: true,
        is_readonly: false,
        is_hidden: false,
        sort_order: 3,
        field_width: '100%',
        validation_rules: { min_length: 1, max_length: 3 },
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ];

    it('should validate required fields', () => {
      const formData = { phone: '123-456-7890' }; // Missing required email and age

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
      expect(result.errors).toContain('Age is required');
    });

    it('should validate email format', () => {
      const formData = { email: 'invalid-email', age: '25' };

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email must be a valid email address');
    });

    it('should validate phone format', () => {
      const formData = { email: 'test@example.com', phone: 'invalid-phone', age: '25' };

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone must be a valid phone number');
    });

    it('should validate number format', () => {
      const formData = { email: 'test@example.com', age: 'not-a-number' };

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Age must be a valid number');
    });

    it('should validate URL format', () => {
      const urlField: FormField = {
        ...mockFields[0],
        field_name: 'website',
        field_label: 'Website',
        field_type: 'url',
        is_required: true
      };

      const formData = { website: 'not-a-url' };

      const result = FormFieldService.validateFormData(formData, [urlField]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Website must be a valid URL');
    });

    it('should validate field length rules', () => {
      const formData = { email: 'test@example.com', age: '1234' }; // Age too long

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Age must be no more than 3 characters long');
    });

    it('should validate pattern rules', () => {
      const patternField: FormField = {
        ...mockFields[0],
        field_name: 'code',
        field_label: 'Code',
        field_type: 'text',
        is_required: true,
        validation_rules: { pattern: '^[A-Z]{3}[0-9]{3}$' }
      };

      const formData = { code: 'invalid-pattern' };

      const result = FormFieldService.validateFormData(formData, [patternField]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Code format is invalid');
    });

    it('should pass validation with valid data', () => {
      const formData = {
        email: 'test@example.com',
        phone: '+1234567890',
        age: '25'
      };

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation for empty non-required fields', () => {
      const formData = {
        email: 'test@example.com',
        phone: '', // Empty but not required
        age: '25'
      };

      const result = FormFieldService.validateFormData(formData, mockFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});