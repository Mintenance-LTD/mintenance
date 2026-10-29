import { withCronHandler } from '@/lib/cron-handler';
import { OperatorAlertService } from '@/lib/services/admin/OperatorAlertService';
export const maxDuration = 60;
export const GET = withCronHandler('operator-alerts', () =>
  OperatorAlertService.deliverPending()
);
