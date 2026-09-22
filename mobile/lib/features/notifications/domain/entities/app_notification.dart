// ============================================================
// RestPilot — Notifications Domain Entity
// ============================================================

import 'package:equatable/equatable.dart';

class AppNotification extends Equatable {
  final String id;
  final String restaurantId;
  final String? branchId;
  final String? profileId; // Null means broadcast to all staff in branch/restaurant
  final String title;
  final String message;
  final String? actionUrl;
  final bool isRead;
  final String createdAt;

  const AppNotification({
    required this.id,
    required this.restaurantId,
    this.branchId,
    this.profileId,
    required this.title,
    required this.message,
    this.actionUrl,
    required this.isRead,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, isRead];
}
