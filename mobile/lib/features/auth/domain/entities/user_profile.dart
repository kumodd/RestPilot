// ============================================================
// RestPilot — Auth Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';

class UserProfile extends Equatable {
  final String id;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;
  final String role; // user_role enum
  final bool isActive;

  const UserProfile({
    required this.id,
    this.fullName,
    this.phone,
    this.avatarUrl,
    required this.role,
    required this.isActive,
  });

  bool get isPlatformAdmin => role == 'platform_admin';
  bool get isOwner => role == 'owner';
  bool get isManager => role == 'manager';
  bool get isWaiter => role == 'waiter';
  bool get isChef => role == 'chef';
  bool get isKitchenManager => role == 'kitchen_manager';
  bool get isCashier => role == 'cashier';

  bool get isStaff => ['manager', 'waiter', 'chef', 'kitchen_manager', 'cashier'].contains(role);

  @override
  List<Object?> get props => [id, fullName, phone, avatarUrl, role, isActive];
}
