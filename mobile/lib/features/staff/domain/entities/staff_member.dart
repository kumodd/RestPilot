// ============================================================
// RestPilot — Staff Domain Entities
// ============================================================

import 'package:equatable/equatable.dart';

class StaffMember extends Equatable {
  final String id;
  final String restaurantId;
  final String? branchId;
  final String profileId;
  final String role;
  final Map<String, bool> permissions;
  final bool isActive;
  final String? joinedAt;
  
  // Profile snapshot fields
  final String? fullName;
  final String? email; // Sometimes joined from auth.users or profiles if available
  final String? avatarUrl;

  const StaffMember({
    required this.id,
    required this.restaurantId,
    this.branchId,
    required this.profileId,
    required this.role,
    required this.permissions,
    required this.isActive,
    this.joinedAt,
    this.fullName,
    this.email,
    this.avatarUrl,
  });

  bool hasPermission(String key) => permissions[key] == true;

  @override
  List<Object?> get props => [id, role, permissions, isActive];
}

class Invitation extends Equatable {
  final String id;
  final String restaurantId;
  final String? branchId;
  final String email;
  final String role;
  final String status; // 'pending', 'accepted', 'expired', 'revoked'
  final String? invitedBy;
  final String? createdAt;
  final String? expiresAt;
  final String? token; // The backend generates this

  const Invitation({
    required this.id,
    required this.restaurantId,
    this.branchId,
    required this.email,
    required this.role,
    required this.status,
    this.invitedBy,
    this.createdAt,
    this.expiresAt,
    this.token,
  });

  bool get isPending => status == 'pending';

  @override
  List<Object?> get props => [id, status, role];
}
