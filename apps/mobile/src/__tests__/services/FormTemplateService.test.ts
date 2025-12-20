import { FormTemplateService, FormTemplate, CreateFormTemplateData } from '../../services/form-management/FormTemplateService';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn()
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }
}));

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

describe('FormTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContractorId = 'contractor-123';
  const mockTemplateData: CreateFormTemplateData = {
    template_name: 'Test Template',
    description: 'Test Description',
    category: 'inspection',
    allows_photos: true,
    allows_signatures: true,
    requires_location: false,
    requires_approval: false,
    tags: ['test', 'template']
  };

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    contractor_id: mockContractorId,
    template_name: 'Test Template',
    description: 'Test Description',
    category: 'inspection',
    version: 1,
    is_active: true,
    is_default: false,
    allows_photos: true,
    allows_signatures: true,
    requires_location: false,
    requires_approval: false,
    usage_count: 0,
    tags: ['test', 'template'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  describe('createFormTemplate', () => {
    it('should create a form template successfully', async () => {
      // Mock the chain of supabase calls
      const mockSingle = jest.fn().mockResolvedValue({ data: mockTemplate, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.from = mockFrom;

      const result = await FormTemplateService.createFormTemplate(mockContractorId, mockTemplateData);

      expect(mockFrom).toHaveBeenCalledWith('form_templates');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        contractor_id: mockContractorId,
        template_name: mockTemplateData.template_name,
        description: mockTemplateData.description,
        category: mockTemplateData.category,
        allows_photos: true,
        allows_signatures: true,
        requires_location: false,
        requires_approval: false,
        is_active: true,
        version: 1
      }));
      expect(result).toEqual(mockTemplate);
    });

    it('should validate required fields', async () => {
      await expect(
        FormTemplateService.createFormTemplate('', mockTemplateData)
      ).rejects.toThrow('contractorId is required');

      await expect(
        FormTemplateService.createFormTemplate(mockContractorId, { ...mockTemplateData, template_name: '' })
      ).rejects.toThrow('template_name is required');
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.from = mockFrom;

      await expect(
        FormTemplateService.createFormTemplate(mockContractorId, mockTemplateData)
      ).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const minimalTemplateData: CreateFormTemplateData = {
        template_name: 'Minimal Template'
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockTemplate, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.from = mockFrom;

      await FormTemplateService.createFormTemplate(mockContractorId, minimalTemplateData);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        category: 'custom',
        allows_photos: true,
        allows_signatures: true,
        requires_location: false,
        requires_approval: false,
        is_active: true,
        version: 1
      }));
    });
  });

  describe('getFormTemplates', () => {
    it('should fetch form templates for a contractor', async () => {
      const mockTemplates = [mockTemplate];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockTemplates, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await FormTemplateService.getFormTemplates(mockContractorId);

      expect(mockFrom).toHaveBeenCalledWith('form_templates');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq1).toHaveBeenCalledWith('contractor_id', mockContractorId);
      expect(mockEq2).toHaveBeenCalledWith('is_active', true);
      expect(mockOrder).toHaveBeenCalledWith('usage_count', { ascending: false });
      expect(result).toEqual(mockTemplates);
    });

    it('should return empty array when no templates found', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await FormTemplateService.getFormTemplates(mockContractorId);

      expect(result).toEqual([]);
    });

    it('should validate contractor ID', async () => {
      await expect(
        FormTemplateService.getFormTemplates('')
      ).rejects.toThrow('contractorId is required');
    });
  });

  describe('getFormTemplate', () => {
    it('should fetch a specific form template', async () => {
      const templateId = 'template-123';

      const mockSingle = jest.fn().mockResolvedValue({ data: mockTemplate, error: null });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await FormTemplateService.getFormTemplate(templateId);

      expect(mockFrom).toHaveBeenCalledWith('form_templates');
      expect(mockEq1).toHaveBeenCalledWith('id', templateId);
      expect(mockEq2).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockTemplate);
    });

    it('should validate template ID', async () => {
      await expect(
        FormTemplateService.getFormTemplate('')
      ).rejects.toThrow('templateId is required');
    });
  });

  describe('updateFormTemplate', () => {
    it('should update a form template', async () => {
      const templateId = 'template-123';
      const updateData = { template_name: 'Updated Template' };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockTemplate, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      const result = await FormTemplateService.updateFormTemplate(templateId, updateData);

      expect(mockFrom).toHaveBeenCalledWith('form_templates');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String)
      }));
      expect(mockEq).toHaveBeenCalledWith('id', templateId);
      expect(result).toEqual(mockTemplate);
    });

    it('should validate template ID', async () => {
      await expect(
        FormTemplateService.updateFormTemplate('', { template_name: 'Updated' })
      ).rejects.toThrow('templateId is required');
    });
  });

  describe('deleteFormTemplate', () => {
    it('should soft delete a form template', async () => {
      const templateId = 'template-123';

      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      await FormTemplateService.deleteFormTemplate(templateId);

      expect(mockFrom).toHaveBeenCalledWith('form_templates');
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockEq).toHaveBeenCalledWith('id', templateId);
    });

    it('should validate template ID', async () => {
      await expect(
        FormTemplateService.deleteFormTemplate('')
      ).rejects.toThrow('templateId is required');
    });
  });
});