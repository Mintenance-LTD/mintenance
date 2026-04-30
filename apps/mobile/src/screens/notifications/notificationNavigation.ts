/**
 * Notification press navigation logic for in-app inbox taps.
 *
 * 2026-04-30 audit P1: delegates to the shared
 * `notificationRoutingTable` so the in-app tap behaves exactly like an
 * OS push tap (handled by `NotificationDeepLink`). Previously this
 * file's switch statement diverged from the deep-link surface on
 * `bid_received` (BidReview vs JobDetails) and silent fall-throughs.
 */
import { NotificationData } from '../../services/NotificationService';
import { routeForNotification } from '../../services/notifications/notificationRoutingTable';

export function navigateForNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any,
  notification: NotificationData
): void {
  const route = routeForNotification(notification.type, notification.data);
  if (!route) {
    navigation.navigate('Main', { screen: 'HomeTab' });
    return;
  }
  navigation.navigate(route.screen, route.params);
}
