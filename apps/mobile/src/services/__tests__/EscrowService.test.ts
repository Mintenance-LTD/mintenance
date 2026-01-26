jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock @mintenance/api-client helpers
jest.mock('@mintenance/api-client', () => ({
  parseError: jest.fn((err) => err),
  getUserFriendlyMessage: jest.fn(() => 'User-friendly error message'),
}));

// Mock mobileApiClient
jest.mock('../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { EscrowService } from '../EscrowService';
import type { EscrowStatus, EscrowTimeline } from '../EscrowService';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';

const mockGet = mobileApiClient.get as jest.Mock;
const mockPost = mobileApiClient.post as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockParseError = parseError as jest.Mock;
const mockGetUserFriendlyMessage = getUserFriendlyMessage as jest.Mock;

describe('EscrowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults
    mockGetUserFriendlyMessage.mockReturnValue('User-friendly error message');
  });

  // =====================================================
  // GET ESCROW STATUS
  // =====================================================

  describe('getEscrowStatus', () => {
    const mockEscrowStatus: EscrowStatus = {
      id: 'escrow-123',
      status: 'pending',
      amount: 1500.0,
      jobId: 'job-456',
      blockingReasons: [],
      estimatedReleaseDate: '2026-02-01',
      homeownerApproval: false,
      homeownerApprovalAt: null,
      autoApprovalDate: '2026-02-10',
      adminHoldStatus: null,
      photoVerificationStatus: 'pending',
      coolingOffEndsAt: '2026-01-30',
      trustScore: 85,
    };

    it('should call mobileApiClient.get with correct endpoint', async () => {
      mockGet.mockResolvedValue(mockEscrowStatus);

      await EscrowService.getEscrowStatus('escrow-123');

      expect(mockGet).toHaveBeenCalledWith('/api/escrow/escrow-123/status');
    });

    it('should return EscrowStatus object', async () => {
      mockGet.mockResolvedValue(mockEscrowStatus);

      const result = await EscrowService.getEscrowStatus('escrow-123');

      expect(result).toEqual(mockEscrowStatus);
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getEscrowStatus('escrow-123')).rejects.toThrow('User-friendly error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching escrow status',
        { error: apiError, escrowId: 'escrow-123' }
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockGet.mockRejectedValue(apiError);
      mockParseError.mockReturnValue(apiError);
      mockGetUserFriendlyMessage.mockReturnValue('Something went wrong');

      await expect(EscrowService.getEscrowStatus('escrow-123')).rejects.toThrow('Something went wrong');
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle empty escrowId', async () => {
      mockGet.mockResolvedValue(mockEscrowStatus);

      await EscrowService.getEscrowStatus('');

      expect(mockGet).toHaveBeenCalledWith('/api/escrow//status');
    });
  });

  // =====================================================
  // GET ESCROW TIMELINE
  // =====================================================

  describe('getEscrowTimeline', () => {
    const mockEscrowTimeline: EscrowTimeline = {
      escrowId: 'escrow-123',
      currentStatus: 'pending',
      blockingReasons: ['Awaiting homeowner approval'],
      estimatedReleaseDate: '2026-02-01',
      steps: [
        {
          step: 'Job marked complete',
          status: 'completed',
          completedAt: '2026-01-20',
          blockedReason: null,
        },
        {
          step: 'Homeowner approval',
          status: 'pending',
          completedAt: null,
          blockedReason: 'Awaiting homeowner response',
        },
      ],
    };

    it('should call mobileApiClient.get with correct endpoint', async () => {
      mockGet.mockResolvedValue(mockEscrowTimeline);

      await EscrowService.getEscrowTimeline('escrow-123');

      expect(mockGet).toHaveBeenCalledWith('/api/escrow/escrow-123/release-timeline');
    });

    it('should return EscrowTimeline object', async () => {
      mockGet.mockResolvedValue(mockEscrowTimeline);

      const result = await EscrowService.getEscrowTimeline('escrow-123');

      expect(result).toEqual(mockEscrowTimeline);
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getEscrowTimeline('escrow-123')).rejects.toThrow('User-friendly error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching escrow timeline',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getEscrowTimeline('escrow-123')).rejects.toThrow('User-friendly error message');
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle malformed escrowId', async () => {
      mockGet.mockResolvedValue(mockEscrowTimeline);

      await EscrowService.getEscrowTimeline('invalid-id');

      expect(mockGet).toHaveBeenCalledWith('/api/escrow/invalid-id/release-timeline');
    });
  });

  // =====================================================
  // REQUEST ADMIN REVIEW
  // =====================================================

  describe('requestAdminReview', () => {
    it('should call mobileApiClient.post with correct endpoint and reason', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.requestAdminReview('escrow-123', 'No homeowner response');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/request-admin-review', {
        reason: 'No homeowner response',
      });
    });

    it('should call without reason parameter', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.requestAdminReview('escrow-123');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/request-admin-review', {
        reason: undefined,
      });
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.requestAdminReview('escrow-123', 'Test reason')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error requesting admin review',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.requestAdminReview('escrow-123')).rejects.toThrow('User-friendly error message');
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle empty reason string', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.requestAdminReview('escrow-123', '');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/request-admin-review', {
        reason: '',
      });
    });
  });

  // =====================================================
  // GET CONTRACTOR ESCROWS
  // =====================================================

  describe('getContractorEscrows', () => {
    const mockEscrows: EscrowStatus[] = [
      {
        id: 'escrow-1',
        status: 'pending',
        amount: 1500.0,
        jobId: 'job-1',
        blockingReasons: [],
        estimatedReleaseDate: '2026-02-01',
        homeownerApproval: false,
        homeownerApprovalAt: null,
        autoApprovalDate: '2026-02-10',
        adminHoldStatus: null,
        photoVerificationStatus: 'pending',
        coolingOffEndsAt: '2026-01-30',
        trustScore: 85,
      },
      {
        id: 'escrow-2',
        status: 'released',
        amount: 2500.0,
        jobId: 'job-2',
        blockingReasons: [],
        estimatedReleaseDate: null,
        homeownerApproval: true,
        homeownerApprovalAt: '2026-01-15',
        autoApprovalDate: null,
        adminHoldStatus: null,
        photoVerificationStatus: 'approved',
        coolingOffEndsAt: null,
        trustScore: 90,
      },
    ];

    it('should call mobileApiClient.get with correct endpoint', async () => {
      mockGet.mockResolvedValue(mockEscrows);

      await EscrowService.getContractorEscrows();

      expect(mockGet).toHaveBeenCalledWith('/api/contractor/escrows');
    });

    it('should return array of EscrowStatus objects', async () => {
      mockGet.mockResolvedValue(mockEscrows);

      const result = await EscrowService.getContractorEscrows();

      expect(result).toEqual(mockEscrows);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should handle empty array', async () => {
      mockGet.mockResolvedValue([]);

      const result = await EscrowService.getContractorEscrows();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getContractorEscrows()).rejects.toThrow('User-friendly error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching contractor escrows',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getContractorEscrows()).rejects.toThrow('User-friendly error message');
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });
  });

  // =====================================================
  // APPROVE COMPLETION
  // =====================================================

  describe('approveCompletion', () => {
    it('should call mobileApiClient.post with inspectionCompleted true', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.approveCompletion('escrow-123', true);

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/approve', {
        inspectionCompleted: true,
      });
    });

    it('should call mobileApiClient.post with inspectionCompleted false', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.approveCompletion('escrow-123', false);

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/approve', {
        inspectionCompleted: false,
      });
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.approveCompletion('escrow-123', true)).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error approving completion',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.approveCompletion('escrow-123', true)).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle invalid escrowId', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.approveCompletion('', true);

      expect(mockPost).toHaveBeenCalledWith('/api/escrow//homeowner/approve', {
        inspectionCompleted: true,
      });
    });
  });

  // =====================================================
  // REJECT COMPLETION
  // =====================================================

  describe('rejectCompletion', () => {
    it('should call mobileApiClient.post with reason', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.rejectCompletion('escrow-123', 'Work not satisfactory');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/reject', {
        reason: 'Work not satisfactory',
      });
    });

    it('should handle empty reason string', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.rejectCompletion('escrow-123', '');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/reject', {
        reason: '',
      });
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.rejectCompletion('escrow-123', 'Test reason')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error rejecting completion',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.rejectCompletion('escrow-123', 'Test reason')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle long reason text', async () => {
      mockPost.mockResolvedValue(undefined);
      const longReason = 'A'.repeat(1000);

      await EscrowService.rejectCompletion('escrow-123', longReason);

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/reject', {
        reason: longReason,
      });
    });
  });

  // =====================================================
  // MARK INSPECTION COMPLETED
  // =====================================================

  describe('markInspectionCompleted', () => {
    it('should call mobileApiClient.post with correct endpoint', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.markInspectionCompleted('escrow-123');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/inspect');
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.markInspectionCompleted('escrow-123')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error marking inspection completed',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockPost.mockRejectedValue(apiError);

      await expect(EscrowService.markInspectionCompleted('escrow-123')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle empty escrowId', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.markInspectionCompleted('');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow//homeowner/inspect');
    });

    it('should not send body in POST request', async () => {
      mockPost.mockResolvedValue(undefined);

      await EscrowService.markInspectionCompleted('escrow-123');

      expect(mockPost).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/inspect');
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost.mock.calls[0].length).toBe(1); // Only endpoint, no body
    });
  });

  // =====================================================
  // GET HOMEOWNER PENDING APPROVAL
  // =====================================================

  describe('getHomeownerPendingApproval', () => {
    const mockPendingApproval = {
      escrowId: 'escrow-123',
      jobId: 'job-456',
      contractorName: 'John Doe',
      amount: 1500.0,
      completedAt: '2026-01-20',
      photos: ['photo1.jpg', 'photo2.jpg'],
    };

    it('should call mobileApiClient.get with correct endpoint', async () => {
      mockGet.mockResolvedValue(mockPendingApproval);

      await EscrowService.getHomeownerPendingApproval('escrow-123');

      expect(mockGet).toHaveBeenCalledWith('/api/escrow/escrow-123/homeowner/pending-approval');
    });

    it('should return pending approval data', async () => {
      mockGet.mockResolvedValue(mockPendingApproval);

      const result = await EscrowService.getHomeownerPendingApproval('escrow-123');

      expect(result).toEqual(mockPendingApproval);
    });

    it('should handle API errors and log them', async () => {
      const apiError = new Error('Network error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getHomeownerPendingApproval('escrow-123')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching pending approval details',
        expect.objectContaining({ escrowId: 'escrow-123' })
      );
    });

    it('should parse error and throw user-friendly message', async () => {
      const apiError = new Error('API error');
      mockGet.mockRejectedValue(apiError);

      await expect(EscrowService.getHomeownerPendingApproval('escrow-123')).rejects.toThrow(
        'User-friendly error message'
      );
      expect(mockParseError).toHaveBeenCalledWith(apiError);
      expect(mockGetUserFriendlyMessage).toHaveBeenCalledWith(apiError);
    });

    it('should handle empty response', async () => {
      mockGet.mockResolvedValue(null);

      const result = await EscrowService.getHomeownerPendingApproval('escrow-123');

      expect(result).toBeNull();
    });
  });
});
