import { JobService } from '../../../services/JobService';
import { NotificationService } from '../../../services/NotificationService';

jest.mock('../../../services/JobService');
jest.mock('../../../services/NotificationService');

describe('Job Status Updates - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transition job from posted to in_progress', async () => {
    (JobService.acceptBid as jest.Mock).mockResolvedValue({
      job_id: 'job_123',
      status: 'in_progress',
      accepted_bid_id: 'bid_456',
    });

    const result = await JobService.acceptBid('job_123', 'bid_456');

    expect(result.status).toBe('in_progress');
    expect(NotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bid_accepted',
      })
    );
  });

  it('should mark job as completed', async () => {
    (JobService.completeJob as jest.Mock).mockResolvedValue({
      job_id: 'job_123',
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    const result = await JobService.completeJob('job_123');

    expect(result.status).toBe('completed');
    expect(JobService.completeJob).toHaveBeenCalledWith('job_123');
  });

  it('should cancel job and notify contractors', async () => {
    (JobService.cancelJob as jest.Mock).mockResolvedValue({
      job_id: 'job_123',
      status: 'cancelled',
      refund_initiated: true,
    });

    const result = await JobService.cancelJob('job_123', 'Changed my mind');

    expect(result.status).toBe('cancelled');
    expect(result.refund_initiated).toBe(true);
  });

  it('should validate status transitions', async () => {
    // Can't go from completed to in_progress
    (JobService.updateJobStatus as jest.Mock).mockRejectedValue(
      new Error('Invalid status transition')
    );

    await expect(
      JobService.updateJobStatus('job_123', 'in_progress')
    ).rejects.toThrow('Invalid status transition');
  });

  it('should track status history', async () => {
    const mockHistory = [
      { status: 'posted', timestamp: '2024-01-01T10:00:00Z' },
      { status: 'in_progress', timestamp: '2024-01-01T12:00:00Z' },
      { status: 'completed', timestamp: '2024-01-01T16:00:00Z' },
    ];

    (JobService.getStatusHistory as jest.Mock).mockResolvedValue(mockHistory);

    const history = await JobService.getStatusHistory('job_123');

    expect(history).toHaveLength(3);
    expect(history[2].status).toBe('completed');
  });
});