import {
  JobSheetOperationsService,
  JobSheet,
  CreateJobSheetData,
  JobSheetFilters
} from '../../services/form-management/JobSheetOperationsService';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase');

// Mock serviceHelper
jest.mock('../../utils/serviceHelper', () => ({
  handleDatabaseOperation: jest.fn().mockImplementation(async (operation) => {
    const result = await operation();
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

describe('JobSheetOperationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContractorId = 'contractor-123';
  const mockSheetData: CreateJobSheetData = {
    template_id: 'template-123',
    job_id: 'job-123',
    sheet_title: 'Test Job Sheet',
    priority: 2,
    assigned_to: 'user-123',
    location_name: 'Test Location',
    client_name: 'Test Client',
    client_email: 'client@test.com',
    tags: ['test']
  };

  const mockJobSheet: JobSheet = {
    id: 'sheet-123',
    contractor_id: mockContractorId,
    template_id: 'template-123',
    sheet_number: 'JS-001',
    sheet_title: 'Test Job Sheet',
    status: 'created',
    priority: 2,
    assigned_to: 'user-123',
    form_data: {},
    photos: [],
    documents: [],
    signatures: {},
    compliance_items: [],
    safety_checklist: [],
    revision_number: 1,
    sync_conflicts: [],
    location_name: 'Test Location',
    client_name: 'Test Client',
    client_email: 'client@test.com',
    tags: ['test'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  describe('createJobSheet', () => {
    it('should create a job sheet successfully', async () => {
      // Mock RPC call for sheet number generation
      const mockRpc = jest.fn().mockResolvedValue({ data: 'JS-001', error: null });
      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.rpc = mockRpc;
      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.createJobSheet(mockContractorId, mockSheetData);

      expect(mockRpc).toHaveBeenCalledWith('generate_job_sheet_number', {
        contractor_id_param: mockContractorId
      });
      expect(mockFrom).toHaveBeenCalledWith('job_sheets');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        contractor_id: mockContractorId,
        sheet_number: 'JS-001',
        template_id: mockSheetData.template_id,
        sheet_title: mockSheetData.sheet_title,
        priority: 2,
        status: 'created'
      }));
      expect(result).toEqual(mockJobSheet);
    });

    it('should set default priority if not provided', async () => {
      const sheetDataWithoutPriority = { ...mockSheetData };
      delete sheetDataWithoutPriority.priority;

      const mockRpc = jest.fn().mockResolvedValue({ data: 'JS-001', error: null });
      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.rpc = mockRpc;
      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.createJobSheet(mockContractorId, sheetDataWithoutPriority);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        priority: 3 // Default priority
      }));
    });

    it('should handle location coordinates', async () => {
      const sheetDataWithCoordinates = {
        ...mockSheetData,
        location_coordinates: { lat: 40.7128, lng: -74.0060 }
      };

      const mockRpc = jest.fn().mockResolvedValue({ data: 'JS-001', error: null });
      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });

      mockSupabase.rpc = mockRpc;
      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.createJobSheet(mockContractorId, sheetDataWithCoordinates);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        location_coordinates: 'POINT(-74.0060 40.7128)'
      }));
    });

    it('should validate required fields', async () => {
      await expect(
        JobSheetOperationsService.createJobSheet('', mockSheetData)
      ).rejects.toThrow('contractorId is required');

      await expect(
        JobSheetOperationsService.createJobSheet(mockContractorId, { ...mockSheetData, template_id: '' })
      ).rejects.toThrow('template_id is required');

      await expect(
        JobSheetOperationsService.createJobSheet(mockContractorId, { ...mockSheetData, sheet_title: '' })
      ).rejects.toThrow('sheet_title is required');
    });
  });

  describe('getJobSheets', () => {
    it('should fetch job sheets with basic filters', async () => {
      const mockSheets = [mockJobSheet];

      const mockRange = jest.fn().mockResolvedValue({ data: mockSheets, error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.getJobSheets(mockContractorId);

      expect(mockFrom).toHaveBeenCalledWith('job_sheets');
      expect(mockEq).toHaveBeenCalledWith('contractor_id', mockContractorId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 49); // Default limit of 50
      expect(result).toEqual(mockSheets);
    });

    it('should apply status filters', async () => {
      const filters: JobSheetFilters = {
        status: ['created', 'in_progress']
      };

      let queryBuilder = {
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data: [mockJobSheet], error: null })
        })
      };

      const mockEq = jest.fn().mockReturnValue(queryBuilder);
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.getJobSheets(mockContractorId, filters);

      expect(queryBuilder.in).toHaveBeenCalledWith('status', filters.status);
    });

    it('should apply template_id filter', async () => {
      const filters: JobSheetFilters = {
        template_id: 'template-123'
      };

      let queryBuilder = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data: [mockJobSheet], error: null })
        })
      };

      const mockEq = jest.fn().mockReturnValue(queryBuilder);
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.getJobSheets(mockContractorId, filters);

      expect(queryBuilder.eq).toHaveBeenCalledWith('template_id', filters.template_id);
    });

    it('should apply date range filter', async () => {
      const filters: JobSheetFilters = {
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };

      let queryBuilder = {
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data: [mockJobSheet], error: null })
        })
      };

      const mockEq = jest.fn().mockReturnValue(queryBuilder);
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.getJobSheets(mockContractorId, filters);

      expect(queryBuilder.gte).toHaveBeenCalledWith('created_at', filters.date_range!.start);
      expect(queryBuilder.lte).toHaveBeenCalledWith('created_at', filters.date_range!.end);
    });

    it('should apply search filters', async () => {
      const filters: JobSheetFilters = {
        client_search: 'Test Client',
        location_search: 'Test Location'
      };

      let queryBuilder = {
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data: [mockJobSheet], error: null })
        })
      };

      const mockEq = jest.fn().mockReturnValue(queryBuilder);
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.getJobSheets(mockContractorId, filters);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('client_name', '%Test Client%');
      expect(queryBuilder.ilike).toHaveBeenCalledWith('location_name', '%Test Location%');
    });

    it('should handle custom limit and offset', async () => {
      const mockRange = jest.fn().mockResolvedValue({ data: [mockJobSheet], error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.getJobSheets(mockContractorId, undefined, 25, 10);

      expect(mockRange).toHaveBeenCalledWith(10, 34); // offset 10, limit 25
    });

    it('should validate contractor ID', async () => {
      await expect(
        JobSheetOperationsService.getJobSheets('')
      ).rejects.toThrow('contractorId is required');
    });
  });

  describe('getJobSheet', () => {
    it('should fetch a specific job sheet', async () => {
      const sheetId = 'sheet-123';

      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.getJobSheet(sheetId);

      expect(mockFrom).toHaveBeenCalledWith('job_sheets');
      expect(mockEq).toHaveBeenCalledWith('id', sheetId);
      expect(result).toEqual(mockJobSheet);
    });

    it('should validate sheet ID', async () => {
      await expect(
        JobSheetOperationsService.getJobSheet('')
      ).rejects.toThrow('sheetId is required');
    });
  });

  describe('updateJobSheet', () => {
    it('should update a job sheet', async () => {
      const sheetId = 'sheet-123';
      const updateData = { sheet_title: 'Updated Title' };

      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.updateJobSheet(sheetId, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String)
      }));
      expect(result).toEqual(mockJobSheet);
    });
  });

  describe('startJobSheet', () => {
    it('should start a job sheet', async () => {
      const sheetId = 'sheet-123';

      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.startJobSheet(sheetId);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'in_progress',
        started_at: expect.any(String),
        updated_at: expect.any(String)
      }));
      expect(result).toEqual(mockJobSheet);
    });
  });

  describe('completeJobSheet', () => {
    it('should complete a job sheet with quality score calculation', async () => {
      const sheetId = 'sheet-123';
      const qualityNotes = 'Good quality work';

      const mockRpc = jest.fn().mockResolvedValue({ data: 85, error: null });
      const mockSingle = jest.fn().mockResolvedValue({ data: mockJobSheet, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      mockSupabase.rpc = mockRpc;
      mockSupabase.from = mockFrom;

      const result = await JobSheetOperationsService.completeJobSheet(sheetId, qualityNotes);

      expect(mockRpc).toHaveBeenCalledWith('calculate_quality_score', { sheet_id: sheetId });
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
        quality_score: 85,
        quality_notes: qualityNotes,
        updated_at: expect.any(String)
      }));
      expect(result).toEqual(mockJobSheet);
    });
  });

  describe('duplicateJobSheet', () => {
    it('should duplicate a job sheet', async () => {
      const sheetId = 'sheet-123';
      const newTitle = 'Duplicated Sheet';

      // Mock getJobSheet call
      const mockGetJobSheet = jest.spyOn(JobSheetOperationsService, 'getJobSheet')
        .mockResolvedValue(mockJobSheet);

      // Mock createJobSheet call
      const mockCreateJobSheet = jest.spyOn(JobSheetOperationsService, 'createJobSheet')
        .mockResolvedValue({ ...mockJobSheet, id: 'new-sheet-123', sheet_title: newTitle });

      const result = await JobSheetOperationsService.duplicateJobSheet(sheetId, newTitle);

      expect(mockGetJobSheet).toHaveBeenCalledWith(sheetId);
      expect(mockCreateJobSheet).toHaveBeenCalledWith(
        mockJobSheet.contractor_id,
        expect.objectContaining({
          sheet_title: newTitle,
          template_id: mockJobSheet.template_id
        })
      );
      expect(result.sheet_title).toBe(newTitle);

      mockGetJobSheet.mockRestore();
      mockCreateJobSheet.mockRestore();
    });

    it('should generate default title if not provided', async () => {
      const sheetId = 'sheet-123';

      const mockGetJobSheet = jest.spyOn(JobSheetOperationsService, 'getJobSheet')
        .mockResolvedValue(mockJobSheet);

      const mockCreateJobSheet = jest.spyOn(JobSheetOperationsService, 'createJobSheet')
        .mockResolvedValue({ ...mockJobSheet, id: 'new-sheet-123' });

      await JobSheetOperationsService.duplicateJobSheet(sheetId);

      expect(mockCreateJobSheet).toHaveBeenCalledWith(
        mockJobSheet.contractor_id,
        expect.objectContaining({
          sheet_title: `${mockJobSheet.sheet_title} (Copy)`
        })
      );

      mockGetJobSheet.mockRestore();
      mockCreateJobSheet.mockRestore();
    });

    it('should throw error if original sheet not found', async () => {
      const sheetId = 'nonexistent-sheet';

      const mockGetJobSheet = jest.spyOn(JobSheetOperationsService, 'getJobSheet')
        .mockResolvedValue(null);

      await expect(
        JobSheetOperationsService.duplicateJobSheet(sheetId)
      ).rejects.toThrow('Job sheet not found');

      mockGetJobSheet.mockRestore();
    });
  });

  describe('calculateFormCompletionPercentage', () => {
    it('should calculate form completion percentage', async () => {
      const sheetId = 'sheet-123';

      const mockRpc = jest.fn().mockResolvedValue({ data: 75, error: null });
      mockSupabase.rpc = mockRpc;

      const result = await JobSheetOperationsService.calculateFormCompletionPercentage(sheetId);

      expect(mockRpc).toHaveBeenCalledWith('calculate_form_completion_percentage', {
        sheet_id: sheetId
      });
      expect(result).toBe(75);
    });

    it('should return 0 on error', async () => {
      const sheetId = 'sheet-123';

      const mockRpc = jest.fn().mockResolvedValue({ data: null, error: new Error('RPC error') });
      mockSupabase.rpc = mockRpc;

      const result = await JobSheetOperationsService.calculateFormCompletionPercentage(sheetId);

      expect(result).toBe(0);
    });
  });

  describe('deleteJobSheet', () => {
    it('should delete a job sheet', async () => {
      const sheetId = 'sheet-123';

      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ delete: mockDelete });

      mockSupabase.from = mockFrom;

      await JobSheetOperationsService.deleteJobSheet(sheetId);

      expect(mockFrom).toHaveBeenCalledWith('job_sheets');
      expect(mockEq).toHaveBeenCalledWith('id', sheetId);
    });
  });
});