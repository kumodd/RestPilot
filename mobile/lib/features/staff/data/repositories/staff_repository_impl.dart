import '../../domain/repositories/staff_repository.dart';
import '../../domain/entities/staff_member.dart';
import '../datasources/staff_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class StaffRepositoryImpl implements StaffRepository {
  final StaffRemoteDataSource _ds;
  const StaffRepositoryImpl(this._ds);

  @override
  Future<List<StaffMember>> fetchStaff(String restaurantId) async {
    try {
      return await _ds.fetchStaff(restaurantId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to load staff', cause: e);
    }
  }

  @override
  Future<List<Invitation>> fetchInvitations(String restaurantId) async {
    try {
      return await _ds.fetchInvitations(restaurantId);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to load invitations', cause: e);
    }
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
    try {
      await _ds.inviteStaff(
        restaurantId: restaurantId,
        branchId: branchId,
        email: email,
        role: role,
        permissions: permissions,
        invitedBy: invitedBy,
      );
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to send invite', cause: e);
    }
  }

  @override
  Future<void> updatePermissions(String staffId, Map<String, bool> permissions) async {
    try {
      await _ds.updatePermissions(staffId, permissions);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to update permissions', cause: e);
    }
  }

  @override
  Future<void> toggleStaffActive(String staffId, bool isActive) async {
    try {
      await _ds.toggleStaffActive(staffId, isActive);
    } on Failure {
      rethrow;
    } catch (e) {
      throw ServerFailure('Failed to update status', cause: e);
    }
  }
}
