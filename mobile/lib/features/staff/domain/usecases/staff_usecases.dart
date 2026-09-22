import '../repositories/staff_repository.dart';
import '../entities/staff_member.dart';

class FetchStaff {
  final StaffRepository _repo;
  const FetchStaff(this._repo);
  Future<List<StaffMember>> call(String restaurantId) => _repo.fetchStaff(restaurantId);
}

class FetchInvitations {
  final StaffRepository _repo;
  const FetchInvitations(this._repo);
  Future<List<Invitation>> call(String restaurantId) => _repo.fetchInvitations(restaurantId);
}

class InviteStaff {
  final StaffRepository _repo;
  const InviteStaff(this._repo);
  Future<void> call({
    required String restaurantId,
    String? branchId,
    required String email,
    required String role,
    required Map<String, bool> permissions,
    required String invitedBy,
  }) => _repo.inviteStaff(
    restaurantId: restaurantId,
    branchId: branchId,
    email: email,
    role: role,
    permissions: permissions,
    invitedBy: invitedBy,
  );
}

class UpdatePermissions {
  final StaffRepository _repo;
  const UpdatePermissions(this._repo);
  Future<void> call(String staffId, Map<String, bool> permissions) => 
      _repo.updatePermissions(staffId, permissions);
}

class ToggleStaffActive {
  final StaffRepository _repo;
  const ToggleStaffActive(this._repo);
  Future<void> call(String staffId, bool isActive) => 
      _repo.toggleStaffActive(staffId, isActive);
}
