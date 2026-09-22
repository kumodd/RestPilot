// ============================================================
// RestPilot — Notifications Cubit
// ============================================================

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/realtime/realtime_manager.dart';
import '../../domain/entities/app_notification.dart';
import '../../domain/usecases/notifications_usecases.dart';

part 'notifications_state.dart';

class NotificationsCubit extends Cubit<NotificationsState> {
  final FetchNotifications _fetchNotifications;
  final MarkNotificationRead _markNotificationRead;
  final RealtimeManager _realtime;

  String? _currentRestaurantId;
  String? _currentBranchId;
  String? _currentProfileId;

  NotificationsCubit({
    required FetchNotifications fetchNotifications,
    required MarkNotificationRead markNotificationRead,
    required RealtimeManager realtimeManager,
  })  : _fetchNotifications = fetchNotifications,
        _markNotificationRead = markNotificationRead,
        _realtime = realtimeManager,
        super(const NotificationsInitial());

  Future<void> loadNotifications({
    required String restaurantId,
    required String branchId,
    required String profileId,
  }) async {
    _currentRestaurantId = restaurantId;
    _currentBranchId = branchId;
    _currentProfileId = profileId;
    
    emit(const NotificationsLoading());
    try {
      final notifs = await _fetchNotifications(
        restaurantId: restaurantId,
        branchId: branchId,
        profileId: profileId,
      );
      emit(NotificationsLoaded(notifications: notifs));
      _subscribeToRealtime(restaurantId);
    } on Failure catch (e) {
      emit(NotificationsError(e.message));
    } catch (e) {
      emit(NotificationsError(e.toString()));
    }
  }

  void _subscribeToRealtime(String restaurantId) {
    // Subscribe to all notifications for this restaurant.
    // The RLS policy on the server handles security, but since Supabase realtime
    // bypasses RLS for postgres changes unless specifically configured with WAL,
    // we filter client-side just to trigger a refresh which will run via secure REST API.
    _realtime.subscribe(
      channelName: 'notifications-$restaurantId',
      table: 'notifications',
      filterColumn: 'restaurant_id',
      filterValue: restaurantId,
      onEvent: (_) => _refreshSilent(),
    );
  }

  Future<void> _refreshSilent() async {
    if (_currentRestaurantId == null || _currentBranchId == null || _currentProfileId == null) return;
    try {
      final notifs = await _fetchNotifications(
        restaurantId: _currentRestaurantId!,
        branchId: _currentBranchId!,
        profileId: _currentProfileId!,
      );
      if (!isClosed && state is NotificationsLoaded) {
        emit(NotificationsLoaded(notifications: notifs));
      }
    } catch (_) {}
  }

  Future<void> markAsRead(String id) async {
    final currentState = state;
    if (currentState is! NotificationsLoaded) return;
    
    // Optimistic update
    final updated = currentState.notifications.map((n) {
      if (n.id == id) {
        return AppNotification(
          id: n.id,
          restaurantId: n.restaurantId,
          branchId: n.branchId,
          profileId: n.profileId,
          title: n.title,
          message: n.message,
          actionUrl: n.actionUrl,
          isRead: true, // Optimistic change
          createdAt: n.createdAt,
        );
      }
      return n;
    }).toList();
    
    emit(NotificationsLoaded(notifications: updated));

    try {
      await _markNotificationRead(id);
    } catch (e) {
      // Revert on failure by refreshing
      _refreshSilent();
    }
  }

  @override
  Future<void> close() {
    if (_currentRestaurantId != null) {
      _realtime.unsubscribe('notifications-$_currentRestaurantId');
    }
    return super.close();
  }
}
