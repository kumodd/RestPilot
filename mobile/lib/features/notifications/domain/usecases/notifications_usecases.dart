import '../repositories/notifications_repository.dart';
import '../entities/app_notification.dart';

class FetchNotifications {
  final NotificationsRepository _repo;
  const FetchNotifications(this._repo);
  Future<List<AppNotification>> call({
    required String restaurantId,
    required String branchId,
    required String profileId,
  }) => _repo.fetchNotifications(
    restaurantId: restaurantId,
    branchId: branchId,
    profileId: profileId,
  );
}

class MarkNotificationRead {
  final NotificationsRepository _repo;
  const MarkNotificationRead(this._repo);
  Future<void> call(String notificationId) => _repo.markNotificationRead(notificationId);
}
