import '../entities/staff_member.dart';

abstract class StaffRepository {
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
