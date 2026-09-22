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
    final data = await withRetry(() => supabase
        .from('notifications')
        .select('id, restaurant_id, recipient_id, title, body, action_url, is_read, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('recipient_id', profileId)
        .order('created_at', ascending: false)
        .limit(50)); // Last 50 notifications

    return (data as List).map((e) {
      final n = e as Map<String, dynamic>;
      return AppNotification(
        id: n['id'] as String,
        restaurantId: n['restaurant_id'] as String,
        branchId: branchId,
        profileId: n['recipient_id'] as String?,
        title: n['title'] as String,
        message: n['body'] as String? ?? '',
        actionUrl: n['action_url'] as String?,
        isRead: n['is_read'] as bool? ?? false,
        createdAt: n['created_at'] as String,
      );
    }).toList();
  }

  @override
  Future<void> markNotificationRead(String notificationId) async {
    final result = await withRetry(() => supabase.rpc('mark_notification_read', params: {
      'p_notification_id': notificationId,
    }));
    if (result is Map && result['error'] != null) {
      throw ServerFailure(result['error'] as String, code: 'mark_notification_read');
    }
  }
}
