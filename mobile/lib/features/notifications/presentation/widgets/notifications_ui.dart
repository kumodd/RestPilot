// ============================================================
// RestPilot — Notifications UI
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/utils/date_utils.dart';
import '../cubit/notifications_cubit.dart';
import '../../domain/entities/app_notification.dart';

class NotificationsIconBadge extends StatelessWidget {
  const NotificationsIconBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<NotificationsCubit, NotificationsState>(
      builder: (context, state) {
        int unreadCount = 0;
        if (state is NotificationsLoaded) {
          unreadCount = state.unreadCount;
        }

        return Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications),
              onPressed: () {
                Scaffold.of(context).openEndDrawer();
              },
            ),
            if (unreadCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  child: Text(
                    unreadCount > 99 ? '99+' : '$unreadCount',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class NotificationsDrawer extends StatelessWidget {
  const NotificationsDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              alignment: Alignment.centerLeft,
              child: const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ),
            const Divider(height: 1),
            Expanded(
              child: BlocBuilder<NotificationsCubit, NotificationsState>(
                builder: (context, state) {
                  if (state is NotificationsLoading || state is NotificationsInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is NotificationsError) {
                    return Center(child: Text(state.message, style: const TextStyle(color: Colors.red)));
                  }
                  if (state is NotificationsLoaded) {
                    if (state.notifications.isEmpty) {
                      return const Center(child: Text('No notifications yet.'));
                    }
                    return ListView.separated(
                      itemCount: state.notifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        return _NotificationTile(notification: state.notifications[index]);
                      },
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  const _NotificationTile({required this.notification});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      tileColor: notification.isRead ? Colors.transparent : Colors.blue.withOpacity(0.05),
      leading: CircleAvatar(
        backgroundColor: notification.isRead ? Colors.grey[200] : Colors.blue[100],
        child: Icon(
          Icons.info_outline,
          color: notification.isRead ? Colors.grey : Colors.blueAccent,
        ),
      ),
      title: Text(
        notification.title,
        style: TextStyle(fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(notification.message),
          const SizedBox(height: 4),
          Text(formatDate(notification.createdAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
      onTap: () {
        if (!notification.isRead) {
          context.read<NotificationsCubit>().markAsRead(notification.id);
        }
        if (notification.actionUrl != null && notification.actionUrl!.isNotEmpty) {
           // Basic routing or deep link handling could go here.
        }
      },
    );
  }
}
