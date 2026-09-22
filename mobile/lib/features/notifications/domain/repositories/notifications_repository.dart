import 'package:restpilot_app/features/notifications/domain/entities/app_notification.dart';

abstract class NotificationsRepository {
  Future<List<AppNotification>> fetchNotifications({
    required String restaurantId,
    required String branchId,
    required String profileId,
  });
  Future<void> markNotificationRead(String notificationId);
}
