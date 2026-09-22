// ============================================================
// RestPilot — Staff Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/network/supabase_client.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/staff_member.dart';

abstract class StaffRemoteDataSource {
  Future<List<StaffMember>> fetchStaff(String restaurantId);
  Future<List<Invitation>> fetchInvitations(String restaurantId);
  Future<void> inviteStaff({
    required String restaurantId,
    String? branchId,
    required String email,
    required String role,
    required Map<String, bool> permissions,
    required String invitedBy,
  });
  Future<void> updatePermissions(String staffId, Map<String, bool> permissions);
  Future<void> toggleStaffActive(String staffId, bool isActive);
}

class StaffRemoteDataSourceImpl implements StaffRemoteDataSource {
  @override
  Future<List<StaffMember>> fetchStaff(String restaurantId) async {
    final data = await withRetry(() => supabase
        .from('staff_members')
        .select('''
          id, restaurant_id, branch_id, profile_id, role, permissions, is_active, created_at,
          profiles:profile_id(full_name, avatar_url)
        ''')
        .eq('restaurant_id', restaurantId)
        .order('created_at', ascending: true));

    return (data as List).map((e) {
      final m = e as Map<String, dynamic>;
      final profile = m['profiles'] as Map<String, dynamic>?;
      return StaffMember(
        id: m['id'] as String,
        restaurantId: m['restaurant_id'] as String,
        branchId: m['branch_id'] as String?,
        profileId: m['profile_id'] as String,
        role: m['role'] as String,
        permissions: (m['permissions'] as Map<String, dynamic>?)
                ?.map((k, v) => MapEntry(k, v as bool)) ?? {},
        isActive: m['is_active'] as bool? ?? true,
        joinedAt: m['created_at'] as String?,
        fullName: profile?['full_name'] as String?,
        avatarUrl: profile?['avatar_url'] as String?,
      );
    }).toList();
  }

  @override
  Future<List<Invitation>> fetchInvitations(String restaurantId) async {
    final data = await withRetry(() => supabase
        .from('invitations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', ascending: false));

    return (data as List).map((e) {
      final m = e as Map<String, dynamic>;
      return Invitation(
        id: m['id'] as String,
        restaurantId: m['restaurant_id'] as String,
        branchId: m['branch_id'] as String?,
        email: m['email'] as String,
        role: m['role'] as String,
        status: m['status'] as String,
        invitedBy: m['invited_by'] as String?,
        createdAt: m['created_at'] as String?,
        expiresAt: m['expires_at'] as String?,
        token: m['token'] as String?,
      );
    }).toList();
  }

  @override
  Future<void> inviteStaff({
    required String restaurantId,
    String? branchId,
    required String email,
    required String role,
    required Map<String, bool> permissions,
    required String invitedBy,
  }) async {
    final result = await withRetry(() => supabase.rpc('invite_staff', params: {
          'p_restaurant_id': restaurantId,
          'p_branch_id': branchId,
          'p_email': email.trim().toLowerCase(),
          'p_role': role,
          'p_invited_by': invitedBy,
          'p_permissions': permissions,
        }));
    if (result is Map && result['error'] != null) {
      throw ServerFailure(result['error'] as String, code: 'invite_staff');
    }
  }

  @override
  Future<void> updatePermissions(String staffId, Map<String, bool> permissions) async {
    await withRetry(() => supabase
        .from('staff_members')
        .update({'permissions': permissions})
        .eq('id', staffId));
  }

  @override
  Future<void> toggleStaffActive(String staffId, bool isActive) async {
    await withRetry(() => supabase
        .from('staff_members')
        .update({'is_active': isActive})
        .eq('id', staffId));
  }
}
