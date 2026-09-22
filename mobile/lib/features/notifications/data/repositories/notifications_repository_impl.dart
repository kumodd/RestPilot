import '../../domain/repositories/notifications_repository.dart';
import '../../domain/entities/app_notification.dart';
import '../datasources/notifications_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class NotificationsRepositoryImpl implements NotificationsRepository {
  final NotificationsRemoteDataSource _ds;
  const NotificationsRepositoryImpl(this._ds);

  @override
  Future<List<AppNotification>> fetchNotifications({
    required String restaurantId,
    required String branchId,
    required String profileId,
  }) async {
    try {
      return await _ds.fetchNotifications(
        restaurantId: restaurantId,
        branchId: branchId,
        profileId: profileId,
      );
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to load notifications', cause: e);
    }
  }

  @override
  Future<void> markNotificationRead(String notificationId) async {
    try {
      await _ds.markNotificationRead(notificationId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to mark read', cause: e);
    }
  }
}
