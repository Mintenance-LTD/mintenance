const service = vi.hoisted(() => ({ queue: vi.fn(), learning: vi.fn() }));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, handler: () => Promise<unknown>) => handler,
}));
vi.mock('@/lib/services/notifications/NotificationProcessorService', () => ({
  NotificationProcessorService: {
    processQueuedNotifications: service.queue,
    processEngagementLearning: service.learning,
  },
}));
import { GET as processQueue } from '@/app/api/cron/notification-processor/route';
import { GET as learn } from '@/app/api/cron/notification-learning/route';
import { NextRequest } from 'next/server';
const request = new NextRequest(
  'http://localhost/api/cron/notification-processor'
);
beforeEach(() => vi.clearAllMocks());

it('processes delivery without repeating daily learning', async () => {
  service.queue.mockResolvedValue({ queuedProcessed: 2, queuedErrors: 0 });
  expect(await processQueue(request)).toEqual({
    queuedProcessed: 2,
    queuedErrors: 0,
  });
  expect(service.learning).not.toHaveBeenCalled();
});
it('surfaces queue database failures as failed cron runs', async () => {
  service.queue.mockResolvedValue({ queuedProcessed: 0, queuedErrors: 1 });
  await expect(processQueue(request)).rejects.toMatchObject({
    statusCode: 503,
  });
});
it('runs daily learning independently of the delivery queue', async () => {
  service.learning.mockResolvedValue({
    learningProcessed: 2,
    learningErrors: 0,
  });
  expect(await learn(request)).toEqual({
    learningProcessed: 2,
    learningErrors: 0,
  });
  expect(service.queue).not.toHaveBeenCalled();
});
it('surfaces daily analysis failures', async () => {
  service.learning.mockResolvedValue({
    learningProcessed: 0,
    learningErrors: 1,
  });
  await expect(learn(request)).rejects.toMatchObject({ statusCode: 503 });
});
