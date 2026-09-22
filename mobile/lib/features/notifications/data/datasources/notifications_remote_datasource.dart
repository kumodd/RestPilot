// ============================================================
// RestPilot — Notifications Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/app_notification.dart';

abstract class NotificationsRemoteDataSource {
  Future<List<AppNotification>> fetchNotifications({
    required String restaurantId,
    required String branchId,
    required String profileId,
  });
  Future<void> markNotificationRead(String notificationId);
}

class NotificationsRemoteDataSourceImpl implements NotificationsRemoteDataSource {
  @override
  Future<List<AppNotification>> fetchNotifications({
    required String restaurantId,
    required String branchId,
    required String profileId,
  }) async {
    // The policy for notifications table usually restricts reading to:
    // 1. Notifications explicitly assigned to the profileId
    // 2. Notifications assigned to the branchId/restaurantId where profileId is null (broadcasts)
    // We fetch everything visible to this user for this context.
    final data = await withRetry(() => supabase
        .from('notifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or('branch_id.is.null,branch_id.eq.$branchId')
        .or('profile_id.is.null,profile_id.eq.$profileId')
        .order('created_at', ascending: false)
        .limit(50)); // Last 50 notifications

    return (data as List).map((e) {
      final n = e as Map<String, dynamic>;
      return AppNotification(
        id: n['id'] as String,
        restaurantId: n['restaurant_id'] as String,
        branchId: n['branch_id'] as String?,
        profileId: n['profile_id'] as String?,
        title: n['title'] as String,
        message: n['message'] as String,
        actionUrl: n['action_url'] as String?,
        isRead: n['is_read'] as bool? ?? false,
        createdAt: n['created_at'] as String,
      );
    }).toList();
  }

  @override
  Future<void> markNotificationRead(String notificationId) async {
    await withRetry(() => supabase
        .from('notifications')
        .update({'is_read': true})
        .eq('id', notificationId));
  }
}
